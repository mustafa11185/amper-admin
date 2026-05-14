/**
 * Endur Console — unified reports overview.
 *
 * Aggregates revenue across BOTH data sources:
 *   1. Existing Amper revenue (from BillingInvoice table)
 *   2. Endur direct invoices (from EndurInvoice table)
 *
 * Period filter: this_month | last_month | last_3m | last_12m | this_year | all
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type PeriodKey =
  | "this_month"
  | "last_month"
  | "last_3m"
  | "last_12m"
  | "this_year"
  | "all";

function periodRange(period: PeriodKey): { start: Date | null; end: Date } {
  const end = new Date();
  const now = new Date();
  switch (period) {
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end: lastDay };
    }
    case "last_3m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end };
    case "last_12m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 12, 1), end };
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case "all":
    default:
      return { start: null, end };
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "this_month") as PeriodKey;
  const { start, end } = periodRange(period);

  // ─── Source 1: Amper-side BillingInvoice (existing revenue) ───
  const amperPaid = await prisma.billingInvoice.aggregate({
    _sum: { final_amount: true },
    _count: true,
    where: {
      is_paid: true,
      ...(start ? { paid_at: { gte: start, lte: end } } : {}),
    },
  });

  // ─── Source 2: EndurInvoice (new unified invoices) ───
  const endurPaid = await prisma.endurInvoice.aggregate({
    _sum: { total: true },
    _count: true,
    where: {
      status: "PAID",
      ...(start ? { paid_at: { gte: start, lte: end } } : {}),
    },
  });

  const endurUnpaid = await prisma.endurInvoice.aggregate({
    _sum: { total: true },
    _count: true,
    where: {
      status: { in: ["SENT", "OVERDUE"] },
      ...(start ? { issued_at: { gte: start, lte: end } } : {}),
    },
  });

  const amperRevenue = Number(amperPaid._sum.final_amount ?? 0);
  const endurRevenue = Number(endurPaid._sum.total ?? 0);
  const totalRevenue = amperRevenue + endurRevenue;

  // ─── MRR estimate (active recurring subscriptions) ───
  // Amper MRR: sum of plan.price_monthly × active non-trial tenants per plan
  const planRows = await prisma.plan.findMany({
    where: { is_active: true },
    select: { id: true, price_monthly: true },
  });
  const priceByPlan = Object.fromEntries(planRows.map((p) => [p.id, p.price_monthly]));
  const activeTenantsByPlan = await prisma.tenant.groupBy({
    by: ["plan"],
    where: { is_active: true, is_trial: false },
    _count: true,
  });
  let amperMrr = 0;
  for (const row of activeTenantsByPlan) {
    amperMrr += (priceByPlan[row.plan as string] ?? 0) * row._count;
  }
  const otherMrr = await prisma.productCustomer.aggregate({
    _sum: { monthly_amount: true },
    where: { status: "active", billing_type: "RECURRING" },
  });
  const totalMrr = amperMrr + Number(otherMrr._sum.monthly_amount ?? 0);

  // ─── Customer counts ───
  const [amperTenants, amperActive, endurCustomerCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { is_active: true } }),
    prisma.endurCustomer.count(),
  ]);

  // ─── Time series — revenue per month, last 12 months ───
  const twelveAgo = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1);
  twelveAgo.setHours(0, 0, 0, 0);

  const [amperPaidLast12, endurPaidLast12] = await Promise.all([
    prisma.billingInvoice.findMany({
      where: { is_paid: true, paid_at: { gte: twelveAgo } },
      select: { paid_at: true, final_amount: true },
    }),
    prisma.endurInvoice.findMany({
      where: { status: "PAID", paid_at: { gte: twelveAgo } },
      select: { paid_at: true, total: true },
    }),
  ]);

  const monthlySeries: { month: string; amper: number; endur: number; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amper = amperPaidLast12
      .filter((row) => {
        if (!row.paid_at) return false;
        const k = `${row.paid_at.getFullYear()}-${String(
          row.paid_at.getMonth() + 1
        ).padStart(2, "0")}`;
        return k === key;
      })
      .reduce((s, r) => s + Number(r.final_amount ?? 0), 0);
    const endur = endurPaidLast12
      .filter((row) => {
        if (!row.paid_at) return false;
        const k = `${row.paid_at.getFullYear()}-${String(
          row.paid_at.getMonth() + 1
        ).padStart(2, "0")}`;
        return k === key;
      })
      .reduce((s, r) => s + r.total, 0);
    monthlySeries.push({ month: key, amper, endur, total: amper + endur });
  }

  // ─── Revenue breakdown per product (from EndurInvoiceLine) ───
  const linesInPeriod = await prisma.endurInvoiceLine.findMany({
    where: {
      invoice: {
        status: "PAID",
        ...(start ? { paid_at: { gte: start, lte: end } } : {}),
      },
    },
    include: { product: { select: { key: true, name_ar: true, color: true } } },
  });
  const productMap = new Map<string, { key: string; name_ar: string; color: string; revenue: number; count: number }>();
  for (const line of linesInPeriod) {
    const key = line.product.key;
    const cur = productMap.get(key) ?? {
      key,
      name_ar: line.product.name_ar,
      color: line.product.color,
      revenue: 0,
      count: 0,
    };
    cur.revenue += line.total;
    cur.count += 1;
    productMap.set(key, cur);
  }
  // Always inject AMPER from existing data even if no Endur invoices yet
  if (!productMap.has("AMPER") && amperRevenue > 0) {
    const amperProduct = await prisma.product.findUnique({
      where: { key: "AMPER" },
      select: { key: true, name_ar: true, color: true },
    });
    if (amperProduct) {
      productMap.set("AMPER", {
        key: "AMPER",
        name_ar: amperProduct.name_ar,
        color: amperProduct.color,
        revenue: amperRevenue,
        count: amperPaid._count,
      });
    }
  } else if (productMap.has("AMPER") && amperRevenue > 0) {
    // Add Amper-side direct revenue too
    const cur = productMap.get("AMPER")!;
    cur.revenue += amperRevenue;
    cur.count += amperPaid._count;
  }
  const productBreakdown = Array.from(productMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // ─── Top customers by revenue (combined Amper + Endur) ───
  // Amper side: top tenants by paid invoice sum
  const topAmper = await prisma.billingInvoice.groupBy({
    by: ["tenant_id"],
    where: { is_paid: true, ...(start ? { paid_at: { gte: start, lte: end } } : {}) },
    _sum: { final_amount: true },
    orderBy: { _sum: { final_amount: "desc" } },
    take: 10,
  });
  const topAmperHydrated = await Promise.all(
    topAmper.map(async (row) => {
      const t = await prisma.tenant.findUnique({
        where: { id: row.tenant_id },
        select: { name: true, phone: true, plan: true },
      });
      return {
        source: "AMPER" as const,
        name: t?.name ?? "—",
        phone: t?.phone ?? "",
        plan: t?.plan ?? null,
        revenue: Number(row._sum.final_amount ?? 0),
      };
    })
  );
  // Endur side: top customers by paid invoice sum
  const topEndur = await prisma.endurInvoice.groupBy({
    by: ["customer_id"],
    where: { status: "PAID", ...(start ? { paid_at: { gte: start, lte: end } } : {}) },
    _sum: { total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });
  const topEndurHydrated = await Promise.all(
    topEndur.map(async (row) => {
      const c = await prisma.endurCustomer.findUnique({
        where: { id: row.customer_id },
        select: { name: true, phone: true },
      });
      return {
        source: "ENDUR" as const,
        name: c?.name ?? "—",
        phone: c?.phone ?? "",
        plan: null,
        revenue: Number(row._sum.total ?? 0),
      };
    })
  );
  const topCustomers = [...topAmperHydrated, ...topEndurHydrated]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ─── Recent paid Endur invoices ───
  const recentInvoices = await prisma.endurInvoice.findMany({
    where: { status: "PAID" },
    orderBy: { paid_at: "desc" },
    take: 8,
    include: {
      customer: { select: { name: true, phone: true } },
      line_items: { include: { product: { select: { name_ar: true, color: true, key: true } } } },
    },
  });

  return NextResponse.json({
    period,
    range: { start: start?.toISOString() ?? null, end: end.toISOString() },
    kpis: {
      total_revenue: totalRevenue,
      amper_revenue: amperRevenue,
      endur_revenue: endurRevenue,
      mrr: totalMrr,
      amper_mrr: amperMrr,
      total_customers: amperTenants + endurCustomerCount,
      active_amper_tenants: amperActive,
      endur_customers: endurCustomerCount,
      paid_invoices_count: (amperPaid._count ?? 0) + (endurPaid._count ?? 0),
      pending_invoices_count: endurUnpaid._count ?? 0,
      pending_invoices_value: Number(endurUnpaid._sum.total ?? 0),
    },
    monthly_series: monthlySeries,
    product_breakdown: productBreakdown,
    top_customers: topCustomers,
    recent_invoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      paid_at: inv.paid_at,
      total: inv.total,
      customer_name: inv.customer.name,
      products: Array.from(
        new Map(inv.line_items.map((l) => [l.product.key, l.product])).values()
      ),
    })),
  });
}
