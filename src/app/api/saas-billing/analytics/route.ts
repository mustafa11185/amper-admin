/**
 * GET /api/saas-billing/analytics
 *
 * Time-series + aggregate KPIs for the SaaS billing overview tab.
 * Returns 12-month windows for revenue + new signups + churn.
 *
 * Auth: super_admin / sales / accountant.
 */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales', 'accountant'];

export async function GET() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const now = new Date();
  // Build a 12-month window (latest month inclusive). Each bucket = first day of month.
  const months: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const oldestStart = months[0];

  // Pull all paid invoices in window, plus all tenant created_at for signups,
  // plus all subscription_events for churn.
  const [invoices, signupsRaw, churnEvents, plans, currentTenants] = await Promise.all([
    prisma.billingInvoice.findMany({
      where: { is_paid: true, paid_at: { gte: oldestStart } },
      select: { final_amount: true, paid_at: true, plan: true },
    }),
    prisma.tenant.findMany({
      where: { is_active: true, created_at: { gte: oldestStart } },
      select: { created_at: true, plan: true },
    }),
    prisma.subscriptionEvent.findMany({
      where: {
        event_type: { in: ['cancelled', 'suspended'] },
        created_at: { gte: oldestStart },
      },
      select: { created_at: true, event_type: true },
    }),
    prisma.plan.findMany({ where: { is_active: true } }),
    prisma.tenant.findMany({
      where: { is_active: true },
      select: { plan: true, is_trial: true, is_in_grace_period: true, subscription_ends_at: true },
    }),
  ]);

  function bucketFor(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
  }
  const monthBuckets = months.map((m) => bucketFor(m));

  function fillSeries<T>(items: T[], dateGetter: (t: T) => Date | null) {
    const counts = new Array(months.length).fill(0);
    for (const item of items) {
      const d = dateGetter(item);
      if (!d) continue;
      const b = bucketFor(d);
      const idx = monthBuckets.indexOf(b);
      if (idx >= 0) counts[idx]++;
    }
    return counts;
  }

  // Revenue series — sum final_amount per month
  const revenueSeries = new Array(months.length).fill(0);
  for (const inv of invoices) {
    if (!inv.paid_at) continue;
    const idx = monthBuckets.indexOf(bucketFor(inv.paid_at));
    if (idx >= 0) revenueSeries[idx] += Number(inv.final_amount);
  }

  // Signups + churn series
  const signupsSeries = fillSeries(signupsRaw, (t) => t.created_at);
  const churnSeries = fillSeries(churnEvents, (e) => e.created_at);

  // Current MRR (active non-trial tenants × their plan price)
  const planPriceById = new Map(plans.map((p) => [p.id, p.price_monthly]));
  let currentMrr = 0;
  const planDistribution: Record<string, number> = {};
  for (const t of currentTenants) {
    if (t.is_trial || t.is_in_grace_period) continue;
    if (!t.subscription_ends_at || t.subscription_ends_at <= now) continue;
    currentMrr += planPriceById.get(t.plan) ?? 0;
    planDistribution[t.plan] = (planDistribution[t.plan] ?? 0) + 1;
  }

  // Growth: this-month signups vs prev-month
  const thisMonthSignups = signupsSeries[signupsSeries.length - 1];
  const prevMonthSignups = signupsSeries[signupsSeries.length - 2] ?? 0;
  const growthPct = prevMonthSignups > 0
    ? Math.round(((thisMonthSignups - prevMonthSignups) / prevMonthSignups) * 100)
    : null;

  // Churn rate: this-month churn / start-of-month active count
  // (approximation — uses current active count as denominator)
  const activeBaseline = Math.max(1, currentTenants.filter((t) => !t.is_trial).length);
  const thisMonthChurn = churnSeries[churnSeries.length - 1];
  const churnRate = Math.round((thisMonthChurn / activeBaseline) * 1000) / 10; // 1 decimal

  // Average revenue per paying tenant (ARPU)
  const arpu = Object.values(planDistribution).reduce((a, b) => a + b, 0) > 0
    ? Math.round(currentMrr / Object.values(planDistribution).reduce((a, b) => a + b, 0))
    : 0;

  return NextResponse.json({
    series: {
      months: months.map((m) =>
        m.toLocaleDateString('ar-IQ', { month: 'short', year: 'numeric' }),
      ),
      revenue: revenueSeries,
      signups: signupsSeries,
      churn: churnSeries,
    },
    current: {
      mrr: currentMrr,
      arr: currentMrr * 12,
      arpu,
      churn_rate_pct: churnRate,
      growth_pct: growthPct,
      this_month_signups: thisMonthSignups,
      this_month_churn: thisMonthChurn,
    },
    plan_distribution: plans.map((p) => ({
      id: p.id,
      name_ar: p.name_ar,
      tenant_count: planDistribution[p.id] ?? 0,
      mrr_contribution: (planDistribution[p.id] ?? 0) * p.price_monthly,
    })),
  });
}
