/**
 * GET /api/endur-ai/pricing — P-AI-1 (2026-05-16).
 *
 * ذكاء اندر — مساعد التسعير. Deterministic, explainable pricing
 * analysis (no LLM, no vendor name, LLM-swappable later).
 *
 * The `Plan` table + `PlanChangeLog` are Amper-specific (PlanType
 * basic|gold|fleet), so the deep list-price-vs-realised analysis is
 * Amper. RESTOIQ has no list-price table → only a plan-mix snapshot
 * (counts/MRR by plan_name) with no list-vs-realised claims (honest).
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

const num = (d: unknown) => Number(d ?? 0);

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [plans, amperProduct, restoProduct, changes] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { price_monthly: "asc" },
      select: {
        id: true,
        name_ar: true,
        price_monthly: true,
        is_active: true,
        is_popular: true,
      },
    }),
    prisma.product.findUnique({
      where: { key: "AMPER" },
      select: { id: true },
    }),
    prisma.product.findUnique({
      where: { key: "RESTOIQ" },
      select: { id: true },
    }),
    prisma.planChangeLog.findMany({
      take: 8000,
      select: { from_plan: true, to_plan: true, change_type: true },
    }),
  ]);

  const subsAll = await prisma.productCustomer.findMany({
    take: 8000,
    select: {
      plan_name: true,
      monthly_amount: true,
      status: true,
      billing_type: true,
      product_id: true,
    },
  });

  const amperSubs = amperProduct
    ? subsAll.filter((s) => s.product_id === amperProduct.id)
    : [];
  const restoSubs = restoProduct
    ? subsAll.filter((s) => s.product_id === restoProduct.id)
    : [];

  // ── PlanChangeLog rollups (Amper) ───────────────────────────────
  const downgradesOut: Record<string, number> = {};
  const upgradesIn: Record<string, number> = {};
  const churnFrom: Record<string, number> = {};
  for (const c of changes) {
    const from = c.from_plan ? String(c.from_plan) : null;
    const to = c.to_plan ? String(c.to_plan) : null;
    const isCancel =
      c.change_type === "cancel" ||
      c.change_type === "cancelled" ||
      (from && !to);
    if (from && isCancel) churnFrom[from] = (churnFrom[from] ?? 0) + 1;
    if (from && to) {
      // direction inferred from list-price order resolved below
      downgradesOut[from] = downgradesOut[from] ?? 0;
      upgradesIn[to] = upgradesIn[to] ?? 0;
    }
  }
  const priceOf = new Map(plans.map((p) => [p.id, num(p.price_monthly)]));
  for (const c of changes) {
    const from = c.from_plan ? String(c.from_plan) : null;
    const to = c.to_plan ? String(c.to_plan) : null;
    if (!from || !to) continue;
    const pf = priceOf.get(from) ?? 0;
    const pt = priceOf.get(to) ?? 0;
    if (pt < pf) downgradesOut[from] = (downgradesOut[from] ?? 0) + 1;
    else if (pt > pf) upgradesIn[to] = (upgradesIn[to] ?? 0) + 1;
  }

  // ── per-Amper-plan analysis ─────────────────────────────────────
  const amperPlans = plans.map((p) => {
    const rows = amperSubs.filter(
      (s) => s.plan_name === p.id && s.status === "active",
    );
    const subscribers = rows.length;
    const mrr = rows.reduce((sum, r) => sum + (r.monthly_amount ?? 0), 0);
    const listPrice = num(p.price_monthly);
    const avgRealized = subscribers > 0 ? Math.round(mrr / subscribers) : 0;
    const discountPct =
      listPrice > 0 && avgRealized > 0
        ? Math.round((1 - avgRealized / listPrice) * 100)
        : 0;
    const dOut = downgradesOut[p.id] ?? 0;
    const uIn = upgradesIn[p.id] ?? 0;
    const churn = churnFrom[p.id] ?? 0;
    const downgradeRate =
      subscribers + dOut > 0
        ? Math.round((dOut / (subscribers + dOut)) * 100)
        : 0;

    const recs: string[] = [];
    if (p.is_active && subscribers === 0) {
      recs.push("باقة نشطة بلا مشتركين — راجع جدواها أو تموضعها");
    }
    if (discountPct >= 20) {
      recs.push(
        `سعر فعليّ أقلّ من القائمة بـ ${discountPct}% — خصومات تآكل التسعير`,
      );
    }
    if (downgradeRate >= 20) {
      recs.push(
        `معدّل تنزيل مرتفع ${downgradeRate}% — راجع القيمة مقابل السعر`,
      );
    }
    if (uIn === 0 && !p.is_popular && subscribers > 0) {
      recs.push("لا ترقيات إلى هذه الباقة — فجوة تموضع/تغليف");
    }
    if (churn >= 5) {
      recs.push(`${churn} إلغاء من هذه الباقة — افحص أسباب التسرّب`);
    }
    if (recs.length === 0) recs.push("ضمن المعدّل الطبيعي");

    return {
      planId: p.id,
      name: p.name_ar,
      listPrice,
      subscribers,
      mrr,
      avgRealized,
      discountPct,
      downgradeRate,
      upgradesIn: uIn,
      churn,
      recommendations: recs,
    };
  });

  // ── RESTOIQ plan-mix snapshot (no list price → no realised recs) ─
  const restoMix: Record<
    string,
    { count: number; mrr: number }
  > = {};
  for (const s of restoSubs) {
    if (s.status !== "active") continue;
    const k = s.plan_name || "بدون باقة";
    const cur = restoMix[k] ?? { count: 0, mrr: 0 };
    cur.count += 1;
    cur.mrr += s.monthly_amount ?? 0;
    restoMix[k] = cur;
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    amperPlans,
    restoMix,
  });
}

export const GET = withGuard("endur-ai-pricing", GET_);
