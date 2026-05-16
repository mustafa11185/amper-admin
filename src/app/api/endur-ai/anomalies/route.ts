/**
 * GET /api/endur-ai/anomalies — P-AI-2 (2026-05-16).
 *
 * ذكاء اندر — كاشف الشذوذ المالي. Deterministic statistics only
 * (Tukey IQR fences) — fully explainable, no LLM, no vendor name.
 * Scans Endur invoices, Amper payments, collector wallets, and
 * cancellation clusters for outliers worth a human look.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

const num = (d: unknown) => Number(d ?? 0);

function quartiles(values: number[]): { q1: number; q3: number; iqr: number } {
  if (values.length < 4) return { q1: 0, q3: 0, iqr: 0 };
  const s = [...values].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const q1 = at(0.25);
  const q3 = at(0.75);
  return { q1, q3, iqr: q3 - q1 };
}

interface Anomaly {
  type: string;
  label: string;
  ref: string;
  value: number;
  expectedMax: number;
  severity: "high" | "medium";
  explanationAr: string;
}

function iqd(n: number) {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invoices, payments, wallets] = await Promise.all([
    prisma.endurInvoice.findMany({
      take: 6000,
      select: {
        invoice_number: true,
        total: true,
        status: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      take: 6000,
      orderBy: { created_at: "desc" },
      select: { amount: true, method: true, reference: true },
    }),
    prisma.collectorWallet.findMany({
      take: 3000,
      select: {
        staff_id: true,
        balance: true,
        total_collected: true,
      },
    }),
  ]);

  const anomalies: Anomaly[] = [];

  // ── invoice amount outliers (Tukey upper fence) ─────────────────
  const invActive = invoices.filter((i) => i.status !== "CANCELLED");
  const invVals = invActive.map((i) => num(i.total)).filter((v) => v > 0);
  const { q3: iq3, iqr: iiqr } = quartiles(invVals);
  const invFence = iq3 + 1.5 * iiqr;
  if (invFence > 0) {
    for (const i of invActive) {
      const v = num(i.total);
      if (v > invFence) {
        anomalies.push({
          type: "invoice",
          label: `فاتورة ${i.invoice_number}`,
          ref: i.customer?.name ?? "—",
          value: v,
          expectedMax: Math.round(invFence),
          severity: v > invFence * 2 ? "high" : "medium",
          explanationAr: `قيمة الفاتورة ${iqd(v)} تتجاوز الحدّ الإحصائي المتوقّع ${iqd(invFence)} — راجِع البنود`,
        });
      }
    }
  }

  // ── payment amount outliers ─────────────────────────────────────
  const payVals = payments.map((p) => num(p.amount)).filter((v) => v > 0);
  const { q3: pq3, iqr: piqr } = quartiles(payVals);
  const payFence = pq3 + 1.5 * piqr;
  if (payFence > 0) {
    for (const p of payments) {
      const v = num(p.amount);
      if (v > payFence) {
        anomalies.push({
          type: "payment",
          label: `دفعة ${p.method}`,
          ref: p.reference ?? "—",
          value: v,
          expectedMax: Math.round(payFence),
          severity: v > payFence * 2 ? "high" : "medium",
          explanationAr: `مبلغ الدفعة ${iqd(v)} أعلى من الحدّ المتوقّع ${iqd(payFence)} — تحقّق من صحّتها`,
        });
      }
    }
  }

  // ── collector wallet: held cash ratio ───────────────────────────
  for (const w of wallets) {
    const bal = num(w.balance);
    const col = num(w.total_collected);
    if (col <= 0 || bal <= 0) continue;
    const ratio = bal / col;
    if (ratio >= 0.5 && bal > 100_000) {
      anomalies.push({
        type: "wallet",
        label: "محفظة جابٍ",
        ref: w.staff_id.slice(0, 8),
        value: bal,
        expectedMax: Math.round(col * 0.5),
        severity: ratio >= 0.75 ? "high" : "medium",
        explanationAr: `الجابي يحتفظ بـ ${Math.round(ratio * 100)}% ممّا حصّله (${iqd(bal)}) غير مسلَّم — خطر نقد بالطريق`,
      });
    }
  }

  // ── cancellation clusters per customer ──────────────────────────
  const cancelByCustomer: Record<string, number> = {};
  for (const i of invoices) {
    if (i.status !== "CANCELLED") continue;
    const k = i.customer?.name ?? "—";
    cancelByCustomer[k] = (cancelByCustomer[k] ?? 0) + 1;
  }
  for (const [name, cnt] of Object.entries(cancelByCustomer)) {
    if (cnt >= 3) {
      anomalies.push({
        type: "cancellations",
        label: "تكرار إلغاء فواتير",
        ref: name,
        value: cnt,
        expectedMax: 2,
        severity: cnt >= 5 ? "high" : "medium",
        explanationAr: `${cnt} فواتير ملغاة لنفس العميل — نمط يستحقّ المراجعة`,
      });
    }
  }

  anomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return b.value / (b.expectedMax || 1) - a.value / (a.expectedMax || 1);
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      total: anomalies.length,
      high: anomalies.filter((a) => a.severity === "high").length,
      byType: anomalies.reduce<Record<string, number>>((m, a) => {
        m[a.type] = (m[a.type] ?? 0) + 1;
        return m;
      }, {}),
    },
    anomalies: anomalies.slice(0, 40),
  });
}

export const GET = withGuard("endur-ai-anomalies", GET_);
