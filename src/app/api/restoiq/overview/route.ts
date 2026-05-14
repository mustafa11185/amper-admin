/**
 * GET /api/restoiq/overview — P-MERGE-2 (2026-05-14).
 *
 * Aggregated KPIs across all RestoIQ tenants from the Amper-side DB.
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the RESTOIQ product row.
  const product = await prisma.product.findUnique({
    where: { key: "RESTOIQ" },
    select: { id: true, status: true, api_base_url: true },
  });

  if (!product) {
    return NextResponse.json({
      error: "RESTOIQ product not registered in catalog",
    }, { status: 404 });
  }

  // Subscriptions to RESTOIQ.
  const [
    totalSubs,
    activeSubs,
    trialSubs,
    pausedSubs,
    cancelledSubs,
    subs,
  ] = await Promise.all([
    prisma.productCustomer.count({ where: { product_id: product.id } }),
    prisma.productCustomer.count({
      where: { product_id: product.id, status: "active" },
    }),
    prisma.productCustomer.count({
      where: { product_id: product.id, status: "trial" },
    }),
    prisma.productCustomer.count({
      where: { product_id: product.id, status: "paused" },
    }),
    prisma.productCustomer.count({
      where: { product_id: product.id, status: "cancelled" },
    }),
    prisma.productCustomer.findMany({
      where: { product_id: product.id, status: "active" },
      select: { monthly_amount: true, started_at: true, plan_name: true },
    }),
  ]);

  const mrr = subs.reduce((acc, s) => acc + (s.monthly_amount ?? 0), 0);

  // Plan distribution.
  const planDist: Record<string, number> = {};
  for (const s of subs) {
    const key = s.plan_name ?? "(غير محدّد)";
    planDist[key] = (planDist[key] ?? 0) + 1;
  }

  // New-customers-this-month (signal of growth).
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
    // P-MERGE-3 markers — these come live once the API proxy lands.
    pending: {
      ordersToday: null,
      activeRestaurantsToday: null,
      aiCallsThisMonth: null,
    },
  });
}
