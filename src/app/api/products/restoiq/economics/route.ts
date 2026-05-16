/**
 * GET /api/products/restoiq/economics — P-CO-5.1 (2026-05-16).
 *
 * RestoIQ plan economics + at-risk restaurants, company lens.
 *
 * RestoIQ's operational data lives in its own backend (reached via
 * the HMAC bridge). The Endur console only holds the Endur layer,
 * so this is derived honestly from RESTOIQ `ProductCustomer` +
 * `EndurInvoice` — plan mix, MRR by plan, ARPU, and a deterministic
 * «ذكاء ريستو» at-risk lens (operator view; does NOT duplicate
 * RestoIQ's own in-product AI). No vendor name; LLM-swappable later.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

const DAY_MS = 86_400_000;

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { key: "RESTOIQ" },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({
      empty: true,
      note: "RESTOIQ product not registered",
    });
  }

  const subs = await prisma.productCustomer.findMany({
    where: { product_id: product.id },
    take: 5000,
    select: {
      customer_id: true,
      plan_name: true,
      monthly_amount: true,
      status: true,
      billing_type: true,
      started_at: true,
      ends_at: true,
    },
  });

  const customerIds = [...new Set(subs.map((s) => s.customer_id))];
  const [identities, overdueInvoices] = await Promise.all([
    prisma.endurCustomer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    }),
    prisma.endurInvoice.findMany({
      where: {
        customer_id: { in: customerIds },
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      select: { customer_id: true, total: true, due_at: true },
    }),
  ]);
  const nameOf = new Map(identities.map((c) => [c.id, c.name]));

  const now = Date.now();
  const overdueByCustomer = new Map<string, number>();
  for (const inv of overdueInvoices) {
    if (inv.due_at && new Date(inv.due_at).getTime() < now) {
      overdueByCustomer.set(
        inv.customer_id,
        (overdueByCustomer.get(inv.customer_id) ?? 0) + inv.total,
      );
    }
  }

  // ── economics ───────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {
    active: 0,
    trial: 0,
    paused: 0,
    cancelled: 0,
  };
  const planCounts: Record<string, number> = {};
  const mrrByPlan: Record<string, number> = {};
  let mrr = 0;
  let activeRecurring = 0;

  for (const s of subs) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
    const plan = s.plan_name || "بدون باقة";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
    if (s.status === "active" && s.billing_type === "RECURRING") {
      const amt = s.monthly_amount ?? 0;
      mrr += amt;
      activeRecurring += 1;
      mrrByPlan[plan] = (mrrByPlan[plan] ?? 0) + amt;
    }
  }
  const arpu = activeRecurring > 0 ? Math.round(mrr / activeRecurring) : 0;

  // ── ذكاء ريستو — at-risk lens ───────────────────────────────────
  const atRisk: {
    customerId: string;
    name: string;
    band: "high" | "medium";
    reasonsAr: string[];
    monthly: number;
  }[] = [];

  for (const s of subs) {
    const reasons: string[] = [];
    let band: "high" | "medium" | null = null;
    const overdue = overdueByCustomer.get(s.customer_id) ?? 0;

    if (s.status === "cancelled") {
      band = "high";
      reasons.push("اشتراك ملغى");
    } else if (s.status === "paused") {
      band = "high";
      reasons.push("اشتراك متوقّف");
    }
    if (overdue > 0) {
      band = "high";
      reasons.push(
        `فواتير متأخّرة ${new Intl.NumberFormat("ar-IQ").format(overdue)} د.ع`,
      );
    }
    if (s.status === "trial" && s.ends_at) {
      const left = new Date(s.ends_at).getTime() - now;
      if (left <= 7 * DAY_MS) {
        band = band ?? "medium";
        reasons.push("تجربة تنتهي خلال ٧ أيّام");
      }
    }
    if (band) {
      atRisk.push({
        customerId: s.customer_id,
        name: nameOf.get(s.customer_id) ?? s.customer_id.slice(0, 8),
        band,
        reasonsAr: reasons,
        monthly: s.monthly_amount ?? 0,
      });
    }
  }
  atRisk.sort((a, b) => {
    if (a.band !== b.band) return a.band === "high" ? -1 : 1;
    return b.monthly - a.monthly;
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    totals: {
      restaurants: customerIds.length,
      subscriptions: subs.length,
      mrr,
      arpu,
      activeRecurring,
    },
    statusCounts,
    planCounts,
    mrrByPlan,
    atRisk: {
      total: atRisk.length,
      high: atRisk.filter((a) => a.band === "high").length,
      list: atRisk.slice(0, 30),
    },
  });
}

export const GET = withGuard("restoiq-economics", GET_);
