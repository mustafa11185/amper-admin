/**
 * GET /api/products/amper/ai/collections — P-AI-4 (2026-05-16).
 *
 * ذكاء امبير — أولويّة الجباية. Deterministic prioritisation of
 * indebted active subscribers (NOT geographic route optimisation —
 * that needs maps/routing infra; this is the honest, data-grounded
 * scope). No LLM, no vendor name; LLM-swappable later.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

const num = (d: unknown) => Number(d ?? 0);

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { is_active: true },
    take: 10000,
    select: {
      id: true,
      name: true,
      phone: true,
      total_debt: true,
      needs_attention: true,
      branch: { select: { name: true } },
    },
  });

  const debtors = subscribers
    .map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      debt: num(s.total_debt),
      flagged: s.needs_attention,
      branch: s.branch?.name ?? "—",
    }))
    .filter((d) => d.debt > 0);

  const sortedDebts = debtors.map((d) => d.debt).sort((a, b) => a - b);
  const p60 = pct(sortedDebts, 0.6);
  const p90 = pct(sortedDebts, 0.9);

  const ranked = debtors
    .map((d) => {
      let band: "high" | "medium" | "low" = "low";
      if (d.flagged || d.debt >= p90) band = "high";
      else if (d.debt >= p60) band = "medium";
      const action =
        band === "high"
          ? "اتصال جباية عاجل اليوم"
          : band === "medium"
            ? "جدولة زيارة جباية هذا الأسبوع"
            : "تذكير ودّي";
      return { ...d, band, action };
    })
    .filter((d) => d.band !== "low")
    .sort((a, b) => b.debt - a.debt);

  const totalOutstanding = debtors.reduce((s, d) => s + d.debt, 0);

  const byBranch: Record<string, { count: number; debt: number }> = {};
  for (const d of debtors) {
    const cur = byBranch[d.branch] ?? { count: 0, debt: 0 };
    cur.count += 1;
    cur.debt += d.debt;
    byBranch[d.branch] = cur;
  }
  const topBranches = Object.entries(byBranch)
    .map(([branch, v]) => ({ branch, ...v }))
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 8);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      debtors: debtors.length,
      totalOutstanding,
      flagged: debtors.filter((d) => d.flagged).length,
      high: ranked.filter((r) => r.band === "high").length,
    },
    topBranches,
    list: ranked.slice(0, 40),
  });
}

export const GET = withGuard("amper-ai-collections", GET_);
