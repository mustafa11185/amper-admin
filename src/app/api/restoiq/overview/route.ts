/**
 * GET /api/restoiq/overview — P-MERGE-2 + P-FIX-1 (2026-05-14).
 *
 * Aggregated KPIs across all RestoIQ tenants from the Amper-side DB.
 * P-FIX-1: every code path is wrapped so the client always gets
 * structured JSON — production was crashing mid-handler and the
 * browser saw an empty 500 ("Unexpected end of JSON input").
 *
 * Live cross-tenant metrics (orders today, real revenue) will be
 * folded in during P-MERGE-3 once the API proxy to RestoIQ backend
 * is wired. Until then, the overview surfaces the data we DO own:
 * ProductCustomer subscriptions + their billing state.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مسجَّل دخول" },
        { status: 401 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { key: "RESTOIQ" },
      select: { id: true, status: true, api_base_url: true },
    });

    if (!product) {
      // Empty-state response — the client renders a friendly card.
      return NextResponse.json({
        product: null,
        subscriptions: { total: 0, active: 0, trial: 0, paused: 0, cancelled: 0 },
        mrr: 0,
        newThisMonth: 0,
        planDistribution: [],
        pending: { ordersToday: null, activeRestaurantsToday: null, aiCallsThisMonth: null },
        note: "RESTOIQ product not registered in catalog — run prisma/scripts/seed-restoiq-product.ts",
      });
    }

    const [
      totalSubs,
      activeSubs,
      trialSubs,
      pausedSubs,
      cancelledSubs,
      subs,
    ] = await Promise.all([
      prisma.productCustomer.count({ where: { product_id: product.id } }),
      prisma.productCustomer.count({ where: { product_id: product.id, status: "active" } }),
      prisma.productCustomer.count({ where: { product_id: product.id, status: "trial" } }),
      prisma.productCustomer.count({ where: { product_id: product.id, status: "paused" } }),
      prisma.productCustomer.count({ where: { product_id: product.id, status: "cancelled" } }),
      prisma.productCustomer.findMany({
        where: { product_id: product.id, status: "active" },
        select: { monthly_amount: true, started_at: true, plan_name: true },
      }),
    ]);

    const mrr = subs.reduce((acc, s) => acc + (s.monthly_amount ?? 0), 0);

    const planDist: Record<string, number> = {};
    for (const s of subs) {
      const key = s.plan_name ?? "(غير محدّد)";
      planDist[key] = (planDist[key] ?? 0) + 1;
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newThisMonth = await prisma.productCustomer.count({
      where: {
        product_id: product.id,
        started_at: { gte: monthStart },
      },
    });

    return NextResponse.json({
      product: {
        id: product.id,
        status: product.status,
        apiConfigured: !!product.api_base_url,
      },
      subscriptions: {
        total: totalSubs,
        active: activeSubs,
        trial: trialSubs,
        paused: pausedSubs,
        cancelled: cancelledSubs,
      },
      mrr,
      newThisMonth,
      planDistribution: Object.entries(planDist).map(([name, count]) => ({
        name,
        count,
      })),
      pending: {
        ordersToday: null,
        activeRestaurantsToday: null,
        aiCallsThisMonth: null,
      },
    });
  } catch (err) {
    // Anything throwing here (DB connection refused, Prisma version
    // mismatch, schema drift) lands in this branch. Returning JSON
    // means the client sees a useful message, not "Unexpected end of
    // JSON input".
    const message = err instanceof Error ? err.message : "تعذّر تنفيذ الاستعلام";
    console.error("[api/restoiq/overview] error:", err);
    return NextResponse.json(
      {
        error: "تعذّر تحميل النظرة العامّة",
        detail: message,
      },
      { status: 500 },
    );
  }
}
