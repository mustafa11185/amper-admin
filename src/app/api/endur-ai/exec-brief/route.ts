/**
 * GET /api/endur-ai/exec-brief — P-CO-2.3 (2026-05-16).
 *
 * ذكاء اندر — الموجز التنفيذي. Deterministic, explainable Arabic
 * briefing (same philosophy as the cross-sell engine: no LLM, no
 * vendor name, swappable later behind an env flag). Synthesises one
 * scan of the customer base into: MRR + biggest churn risk + best
 * cross-sell + AR alert.
 *
 * UI surfaces this strictly as «ذكاء اندر».
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";
import { computeCustomerMetrics } from "@/lib/endur-customer-metrics";
import { crossSellForCustomer } from "@/lib/endur-cross-sell";

const DAY_MS = 86_400_000;

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await prisma.endurCustomer.findMany({
    take: 5000,
    select: {
      id: true,
      name: true,
      governorate: true,
      created_at: true,
      products: {
        select: {
          status: true,
          billing_type: true,
          monthly_amount: true,
          ends_at: true,
          product: { select: { key: true } },
        },
      },
      invoices: {
        select: { status: true, total: true, due_at: true, paid_at: true },
      },
    },
  });

  let mrr = 0;
  let overdueTotal = 0;
  const atRisk: { name: string; mrr: number; reasons: string[] }[] = [];
  const opportunities: {
    name: string;
    customerId: string;
    productNameAr: string;
    confidence: number;
    reasonAr: string;
  }[] = [];

  const now = Date.now();

  for (const c of customers) {
    const m = computeCustomerMetrics({
      created_at: c.created_at,
      products: c.products.map((p) => ({
        status: p.status,
        billing_type: p.billing_type,
        monthly_amount: p.monthly_amount,
        ends_at: p.ends_at,
        product: { key: p.product.key },
      })),
      invoices: c.invoices,
    });
    mrr += m.mrr;

    for (const inv of c.invoices) {
      if (inv.status === "PAID" || inv.status === "CANCELLED") continue;
      const due = inv.due_at ? new Date(inv.due_at).getTime() : null;
      if (due != null && due < now) overdueTotal += inv.total;
    }

    if (m.riskBand !== "low") {
      atRisk.push({ name: c.name, mrr: m.mrr, reasons: m.riskReasons });
    }

    const ops = crossSellForCustomer({
      customerName: c.name,
      governorate: c.governorate,
      owned: c.products.map((p) => ({
        key: p.product.key,
        status: p.status,
      })),
      mrr: m.mrr,
      tenureDays: m.tenureDays,
      riskBand: m.riskBand,
    });
    if (ops[0]) {
      opportunities.push({
        name: c.name,
        customerId: c.id,
        productNameAr: ops[0].productNameAr,
        confidence: ops[0].confidence,
        reasonAr: ops[0].reasonAr,
      });
    }
  }

  atRisk.sort((a, b) => b.mrr - a.mrr);
  opportunities.sort((a, b) => b.confidence - a.confidence);

  const topRisk = atRisk[0];
  const topOpp = opportunities[0];

  const bullets: string[] = [];
  bullets.push(
    `الإيراد الشهري المتكرّر (MRR) الحالي ${iqd(mrr)} عبر ${customers.length} عميل، بسنويّ تقديري ${iqd(mrr * 12)}.`,
  );
  if (topRisk) {
    bullets.push(
      `أكبر خطر تسرّب: «${topRisk.name}» (${iqd(topRisk.mrr)} شهريّاً) — ${topRisk.reasons.join(" · ") || "إشارات خطر"}. تواصل عاجل موصى به.`,
    );
  } else {
    bullets.push("لا عملاء بمخاطر مرتفعة حاليّاً — قاعدة مستقرّة.");
  }
  if (topOpp) {
    bullets.push(
      `أفضل فرصة بيع متقاطع: «${topOpp.name}» → ${topOpp.productNameAr} (ثقة ${Math.round(topOpp.confidence * 100)}%) — ${topOpp.reasonAr}.`,
    );
  }
  if (overdueTotal > 0) {
    bullets.push(
      `تنبيه ذمم: ${iqd(overdueTotal)} فواتير متأخّرة عن السداد — راجِع أعمار الذمم.`,
    );
  } else {
    bullets.push("لا فواتير متأخّرة — التحصيل منضبط.");
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    mrr,
    arr: mrr * 12,
    customerCount: customers.length,
    atRiskCount: atRisk.length,
    overdueTotal,
    bullets,
    topRisk: topRisk ?? null,
    topOpportunity: topOpp ?? null,
  });
}

export const GET = withGuard("endur-ai-exec-brief", GET_);
