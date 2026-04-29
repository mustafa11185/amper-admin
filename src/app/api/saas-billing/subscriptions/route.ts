/**
 * GET /api/saas-billing/subscriptions
 *
 * Paginated list of all tenant subscriptions for the support workflow.
 * Query: ?status=active|trial|grace|suspended&search=...&page=1&limit=20
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales', 'accountant', 'support'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') || 'all';
  const search = (searchParams.get('search') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));

  const now = new Date();
  // Build status filter as a Prisma where clause
  const statusFilter: Record<string, unknown> = {};
  switch (status) {
    case 'active':
      statusFilter.is_trial = false;
      statusFilter.is_in_grace_period = false;
      statusFilter.subscription_ends_at = { gt: now };
      break;
    case 'trial':
      statusFilter.is_trial = true;
      break;
    case 'grace':
      statusFilter.is_in_grace_period = true;
      break;
    case 'suspended':
      statusFilter.OR = [
        { subscription_ends_at: { lt: now }, is_in_grace_period: false, is_trial: false },
        { is_active: false },
      ];
      break;
    case 'all':
    default:
      break;
  }

  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
          { owner_name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const where = { is_active: true, ...statusFilter, ...searchFilter };

  const [tenants, total, plans] = await Promise.all([
    prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        owner_name: true,
        phone: true,
        plan: true,
        is_trial: true,
        trial_ends_at: true,
        subscription_ends_at: true,
        grace_period_ends_at: true,
        is_in_grace_period: true,
        auto_renew_enabled: true,
        created_at: true,
      },
      orderBy: [{ subscription_ends_at: 'asc' }, { created_at: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tenant.count({ where }),
    prisma.plan.findMany({ select: { id: true, name_ar: true, price_monthly: true } }),
  ]);

  const planMap = new Map(plans.map((p) => [p.id, p]));

  const tenantIds = tenants.map((t) => t.id);
  // Pull per-tenant aggregates: total paid + last invoice date.
  const aggregates = await prisma.billingInvoice.groupBy({
    by: ['tenant_id'],
    where: { tenant_id: { in: tenantIds }, is_paid: true },
    _sum: { final_amount: true },
    _count: { _all: true },
    _max: { paid_at: true },
  });
  const aggMap = new Map(aggregates.map((a) => [a.tenant_id, a]));

  const rows = tenants.map((t) => {
    const planInfo = planMap.get(t.plan);
    const agg = aggMap.get(t.id);
    const expiry = t.is_trial ? t.trial_ends_at : t.subscription_ends_at;
    const daysRemaining = expiry
      ? Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: t.id,
      name: t.name,
      owner_name: t.owner_name,
      phone: t.phone,
      plan: t.plan,
      plan_name_ar: planInfo?.name_ar ?? t.plan,
      plan_price_monthly: planInfo?.price_monthly ?? null,
      status: t.is_in_grace_period
        ? 'grace'
        : t.is_trial
          ? 'trial'
          : t.subscription_ends_at && t.subscription_ends_at > now
            ? 'active'
            : 'suspended',
      is_trial: t.is_trial,
      trial_ends_at: t.trial_ends_at,
      subscription_ends_at: t.subscription_ends_at,
      grace_period_ends_at: t.grace_period_ends_at,
      auto_renew_enabled: t.auto_renew_enabled,
      days_remaining: daysRemaining,
      lifetime_revenue: Number(agg?._sum.final_amount || 0),
      paid_invoice_count: agg?._count._all ?? 0,
      last_paid_at: agg?._max.paid_at ?? null,
      created_at: t.created_at,
    };
  });

  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}
