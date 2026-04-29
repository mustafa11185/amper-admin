/**
 * GET /api/saas-billing/stats
 *
 * Top-level revenue overview for the company-admin SaaS billing dashboard.
 * Returns: MRR (current+projected), ARR, active/trial/grace/suspended counts,
 *          last-30-day revenue, last-30-day failed payments.
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
  const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Pull plans once so we can map plan-id → monthly price.
  const plans = await prisma.plan.findMany({ where: { is_active: true } });
  const monthlyPriceById = new Map(plans.map((p) => [p.id, p.price_monthly]));

  // Tenant subscription state (uses fields embedded in Tenant)
  const allTenants = await prisma.tenant.findMany({
    where: { is_active: true },
    select: {
      id: true,
      plan: true,
      is_trial: true,
      is_in_grace_period: true,
      subscription_ends_at: true,
      trial_ends_at: true,
    },
  });

  let activeCount = 0;
  let trialCount = 0;
  let graceCount = 0;
  let suspendedCount = 0;
  let mrr = 0;

  for (const t of allTenants) {
    if (t.is_in_grace_period) {
      graceCount++;
      continue;
    }
    if (t.is_trial) {
      trialCount++;
      continue;
    }
    if (t.subscription_ends_at && t.subscription_ends_at > now) {
      activeCount++;
      mrr += monthlyPriceById.get(t.plan) ?? 0;
    } else {
      suspendedCount++;
    }
  }

  // Last 30-day collected revenue (paid invoices in window)
  const last30Paid = await prisma.billingInvoice.aggregate({
    where: { is_paid: true, paid_at: { gte: last30Start } },
    _sum: { final_amount: true },
    _count: true,
  });

  // Last 30-day failed online payments
  const last30FailedCount = await prisma.saasOnlinePayment.count({
    where: { status: 'failed', initiated_at: { gte: last30Start } },
  });

  // All-time totals (for reference)
  const totals = await prisma.billingInvoice.aggregate({
    where: { is_paid: true },
    _sum: { final_amount: true },
    _count: true,
  });

  return NextResponse.json({
    counts: {
      active: activeCount,
      trial: trialCount,
      grace: graceCount,
      suspended: suspendedCount,
      total_tenants: allTenants.length,
    },
    revenue: {
      mrr,
      arr: mrr * 12,
      last_30_days: Number(last30Paid._sum.final_amount || 0),
      last_30_days_invoice_count: last30Paid._count,
      all_time: Number(totals._sum.final_amount || 0),
      all_time_invoice_count: totals._count,
    },
    failures: {
      last_30_days: last30FailedCount,
    },
    plans: plans.map((p) => ({
      id: p.id,
      name_ar: p.name_ar,
      price_monthly: p.price_monthly,
    })),
  });
}
