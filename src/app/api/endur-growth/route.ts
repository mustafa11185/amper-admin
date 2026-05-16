/**
 * GET /api/endur-growth — P-CO-2.1 (2026-05-16).
 *
 * Forward-looking financial command for النموّ والإيرادات. Distinct
 * from /api/endur-reports/overview (that one is invoice revenue by
 * period): this returns MRR/ARR from live subscriptions, monthly
 * subscription movement (new / churned / net MRR + logo churn),
 * AR aging buckets, and customer growth — none of which the reports
 * overview provides.
 *
 *   ?months=<n>  trailing-month window for the series (default 6)
 *
 * Queries are bounded (operator-console scale) and read-only.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DAY_MS = 86_400_000;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("ar-IQ", { month: "short", year: "numeric" });
}
function inMonth(d: Date | null, y: number, m: number): boolean {
  if (!d) return false;
  return d.getFullYear() === y && d.getMonth() === m;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const months = Math.min(
    24,
    Math.max(3, parseInt(url.searchParams.get("months") || "6", 10) || 6),
  );

  const [subs, invoices, customers] = await Promise.all([
    prisma.productCustomer.findMany({
      take: 5000,
      select: {
        status: true,
        billing_type: true,
        monthly_amount: true,
        started_at: true,
        ends_at: true,
        product: { select: { key: true } },
      },
    }),
    prisma.endurInvoice.findMany({
      take: 6000,
      select: {
        status: true,
        total: true,
        issued_at: true,
        paid_at: true,
        due_at: true,
        customer: { select: { id: true, name: true } },
        line_items: {
          select: { total: true, product: { select: { key: true } } },
        },
      },
    }),
    prisma.endurCustomer.findMany({
      take: 8000,
      select: { created_at: true },
    }),
  ]);

  // ── MRR / ARR (live active RECURRING) ───────────────────────────
  const mrrByProduct: Record<string, number> = {};
  const activeByProduct: Record<string, number> = {};
  let mrr = 0;
  let activeSubs = 0;
  for (const s of subs) {
    if (s.status === "active" && s.billing_type === "RECURRING") {
      const amt = s.monthly_amount ?? 0;
      mrr += amt;
      activeSubs += 1;
      mrrByProduct[s.product.key] =
        (mrrByProduct[s.product.key] ?? 0) + amt;
      activeByProduct[s.product.key] =
        (activeByProduct[s.product.key] ?? 0) + 1;
    }
  }

  // ── AR aging (unpaid, by days past due) ─────────────────────────
  const now = Date.now();
  const aging = {
    not_due: { count: 0, total: 0 },
    d1_30: { count: 0, total: 0 },
    d31_60: { count: 0, total: 0 },
    d61_plus: { count: 0, total: 0 },
  };
  const overdueByCustomer: Record<
    string,
    { name: string; amount: number; maxDays: number }
  > = {};
  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.status === "CANCELLED") continue;
    const due = inv.due_at ? new Date(inv.due_at).getTime() : null;
    const daysPast =
      due != null && due < now ? Math.floor((now - due) / DAY_MS) : 0;
    let bucket: keyof typeof aging = "not_due";
    if (daysPast > 60) bucket = "d61_plus";
    else if (daysPast > 30) bucket = "d31_60";
    else if (daysPast >= 1) bucket = "d1_30";
    aging[bucket].count += 1;
    aging[bucket].total += inv.total;
    if (daysPast >= 1 && inv.customer) {
      const cur = overdueByCustomer[inv.customer.id] ?? {
        name: inv.customer.name,
        amount: 0,
        maxDays: 0,
      };
      cur.amount += inv.total;
      cur.maxDays = Math.max(cur.maxDays, daysPast);
      overdueByCustomer[inv.customer.id] = cur;
    }
  }
  const topOverdue = Object.entries(overdueByCustomer)
    .map(([id, v]) => ({ customerId: id, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // ── monthly series (trailing `months`) ──────────────────────────
  const base = new Date();
  const series: {
    month: string;
    label: string;
    invoiced: number;
    collected: number;
    newSubs: number;
    churnedSubs: number;
    newMrr: number;
    churnedMrr: number;
    netMrr: number;
    newCustomers: number;
  }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();

    let invoiced = 0;
    let collected = 0;
    for (const inv of invoices) {
      if (
        inv.status !== "CANCELLED" &&
        inMonth(new Date(inv.issued_at), y, m)
      ) {
        invoiced += inv.total;
      }
      if (inv.paid_at && inMonth(new Date(inv.paid_at), y, m)) {
        collected += inv.total;
      }
    }

    let newSubs = 0;
    let churnedSubs = 0;
    let newMrr = 0;
    let churnedMrr = 0;
    for (const s of subs) {
      if (inMonth(new Date(s.started_at), y, m)) {
        newSubs += 1;
        if (s.billing_type === "RECURRING") newMrr += s.monthly_amount ?? 0;
      }
      if (
        (s.status === "cancelled" || s.status === "paused") &&
        s.ends_at &&
        inMonth(new Date(s.ends_at), y, m)
      ) {
        churnedSubs += 1;
        if (s.billing_type === "RECURRING")
          churnedMrr += s.monthly_amount ?? 0;
      }
    }

    let newCustomers = 0;
    for (const c of customers) {
      if (inMonth(new Date(c.created_at), y, m)) newCustomers += 1;
    }

    series.push({
      month: monthKey(d),
      label: monthLabel(d),
      invoiced,
      collected,
      newSubs,
      churnedSubs,
      newMrr,
      churnedMrr,
      netMrr: newMrr - churnedMrr,
      newCustomers,
    });
  }

  // ── revenue split (within window) by product, from lines ────────
  const windowStart = new Date(
    base.getFullYear(),
    base.getMonth() - (months - 1),
    1,
  ).getTime();
  const revByProduct: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.status === "CANCELLED") continue;
    if (new Date(inv.issued_at).getTime() < windowStart) continue;
    for (const li of inv.line_items) {
      revByProduct[li.product.key] =
        (revByProduct[li.product.key] ?? 0) + li.total;
    }
  }

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const mrrMoM =
    prev && prev.netMrr !== undefined
      ? last.netMrr - prev.netMrr
      : 0;
  const logoChurnRate =
    activeSubs + (last?.churnedSubs ?? 0) > 0
      ? (last?.churnedSubs ?? 0) /
        (activeSubs + (last?.churnedSubs ?? 0))
      : 0;

  return NextResponse.json({
    months,
    mrr,
    arr: mrr * 12,
    activeSubs,
    mrrByProduct,
    activeByProduct,
    revByProduct,
    aging,
    topOverdue,
    series,
    headline: {
      mrrMoM,
      lastNetMrr: last?.netMrr ?? 0,
      lastNewCustomers: last?.newCustomers ?? 0,
      logoChurnRate: Math.round(logoChurnRate * 1000) / 10, // %
      arOverdueTotal:
        aging.d1_30.total + aging.d31_60.total + aging.d61_plus.total,
    },
  });
}
