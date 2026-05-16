/**
 * GET /api/products/restoiq/ai/upgrade — P-AI-3 (2026-05-16).
 *
 * ذكاء ريستو — توصيات الترقية. Operator lens (does NOT duplicate
 * RestoIQ's in-product AI). Deterministic, explainable; derived from
 * the Endur-side RESTOIQ subscriptions (RestoIQ ops DB is remote).
 * No vendor name; LLM-swappable later.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

const DAY_MS = 86_400_000;

// RestoIQ tiers (no list-price table on the Endur side): the ladder
// is مجانيّة → بريميوم → برو. Map current plan to the next step.
function nextTier(plan: string | null): string | null {
  const p = (plan ?? "").trim();
  if (!p || p === "بدون باقة" || p.includes("مجان") || /free/i.test(p))
    return "بريميوم";
  if (p.includes("بريميوم") || /premium/i.test(p)) return "برو";
  return null; // already top (برو) → no upgrade, only add-ons
}

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
    return NextResponse.json({ empty: true, recommendations: [] });
  }

  const subs = await prisma.productCustomer.findMany({
    where: { product_id: product.id },
    take: 5000,
    select: {
      customer_id: true,
      plan_name: true,
      status: true,
      started_at: true,
    },
  });

  const ids = [...new Set(subs.map((s) => s.customer_id))];
  const customers = await prisma.endurCustomer.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, phone: true },
  });
  const info = new Map(customers.map((c) => [c.id, c]));

  const now = Date.now();
  const recommendations: {
    customerId: string;
    name: string;
    phone: string | null;
    currentPlan: string;
    recommendedPlan: string;
    confidence: number;
    reasonAr: string;
    scriptAr: string;
  }[] = [];

  for (const s of subs) {
    const tenureDays = Math.floor(
      (now - new Date(s.started_at).getTime()) / DAY_MS,
    );
    const cur = s.plan_name || "بدون باقة";
    const next = nextTier(s.plan_name);
    if (!next) continue;

    let confidence = 0;
    let reason = "";

    if (s.status === "trial" && tenureDays >= 14) {
      confidence = 0.75;
      reason = `تجربة مفتوحة منذ ${tenureDays} يوم بلا تحويل — جاهزة للترقية إلى ${next}`;
    } else if (
      s.status === "active" &&
      (cur === "بدون باقة" || /مجان|free/i.test(cur)) &&
      tenureDays >= 30
    ) {
      confidence = 0.7;
      reason = `نشط على ${cur} منذ ${tenureDays} يوم — قيمة كافية لاقتراح ${next}`;
    } else if (s.status === "active" && tenureDays >= 90) {
      confidence = 0.55;
      reason = `عميل ناضج (${tenureDays} يوم) على ${cur} — فرصة ترقية إلى ${next}`;
    } else {
      continue;
    }

    const c = info.get(s.customer_id);
    const who = c?.name ?? "عميلنا العزيز";
    recommendations.push({
      customerId: s.customer_id,
      name: c?.name ?? s.customer_id.slice(0, 8),
      phone: c?.phone ?? null,
      currentPlan: cur,
      recommendedPlan: next,
      confidence: Math.round(confidence * 100) / 100,
      reasonAr: reason,
      scriptAr: `مرحباً ${who} 👋 نشكر ثقتكم بـ ريستو. بناءً على استخدامكم نقترح الترقية إلى باقة ${next} لمزايا أوسع — نسوّيلكم تفعيل تجريبي بدون التزام؟`,
    });
  }

  recommendations.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      total: recommendations.length,
      strong: recommendations.filter((r) => r.confidence >= 0.7).length,
    },
    recommendations: recommendations.slice(0, 40),
  });
}

export const GET = withGuard("restoiq-ai-upgrade", GET_);
