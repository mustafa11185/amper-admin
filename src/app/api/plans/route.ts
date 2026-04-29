/**
 * GET  /api/plans  — list plans
 * POST /api/plans  — (legacy, removed)
 *
 * Backward-compatible legacy endpoint. Now reads from `plans` table
 * (the SaaS-billing source of truth) instead of hardcoded DEFAULT_PLANS.
 *
 * Response shape preserved for existing consumers:
 *   - company-admin /clients page (filter dropdown)
 *   - company-admin /plans page (read-only display)
 *   - company-admin /finance page (calculations)
 *   - reports/mrr + reports/late-payments (revenue calc helpers below)
 *
 * Editing happens via PATCH /api/saas-billing/plans (super_admin only).
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Pricing model — base monthly rate × period × discount.
// Discounts: 3 months → 0%, 6 months → 5%, 12 months → 15%.
// Used by /reports/mrr and /finance for revenue forecasting.
export type BillingPeriod = 'quarterly' | 'biannual' | 'annual';
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { quarterly: 3, biannual: 6, annual: 12 };
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = { quarterly: 0, biannual: 0.05, annual: 0.15 };

export function periodMonthlyPrice(baseMonthly: number, period: BillingPeriod): number {
  if (baseMonthly === 0) return 0;
  return Math.round(baseMonthly * (1 - PERIOD_DISCOUNT[period]));
}
export function periodTotalPrice(baseMonthly: number, period: BillingPeriod): number {
  if (baseMonthly === 0) return 0;
  return periodMonthlyPrice(baseMonthly, period) * PERIOD_MONTHS[period];
}

// Static color palette per plan key — kept stable so the /plans page table
// stays visually consistent. New plans default to gray.
const PLAN_COLORS: Record<string, string> = {
  starter:   '#374151',
  pro:       '#1B4FD8',
  business:  '#D97706',
  corporate: '#0F766E',
  fleet:     '#111827',
  basic:     '#1B4FD8',
  gold:      '#D97706',
};

// Derive `included_modules` array from DB feature flags. Conservative default
// covers the basics every plan has.
function modulesForPlan(p: {
  has_iot: boolean; has_ai: boolean; has_subscriber_app: boolean;
  has_multi_branch: boolean;
}): string[] {
  const base = ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'daily_brief'];
  const extras: string[] = [];
  if (p.has_subscriber_app) extras.push('subscriber_app');
  if (p.has_ai) extras.push('ai_reports');
  if (p.has_multi_branch) extras.push('multi_branch', 'gps');
  if (p.has_iot) extras.push('iot_monitoring', 'fuel_sensor', 'temperature_sensor');
  return [...base, ...extras];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [dbPlans, tenantCounts] = await Promise.all([
    prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.tenant.groupBy({
      by: ['plan'],
      _count: { id: true },
      where: { is_active: true },
    }),
  ]);

  const countMap = new Map(tenantCounts.map((t) => [t.plan, t._count.id]));

  const plans = dbPlans.map((p) => {
    // -1 sentinel → 9999 in legacy shape (which uses 9999 for unlimited)
    const maxGen = p.generator_limit === -1 ? 9999 : p.generator_limit;
    const maxSub = p.subscriber_limit === -1 ? 9999 : p.subscriber_limit;
    const maxStaff = p.staff_limit === -1 ? 9999 : p.staff_limit;

    return {
      id: `plan-${p.id}`,           // legacy id format
      key: p.id,                     // PlanType enum value (used for filtering)
      name_ar: p.name_ar,
      name_en: p.name_en,
      price_monthly_iqd: p.price_monthly,
      price_annual_iqd: p.price_12m,
      max_generators: maxGen,
      max_subscribers: maxSub,
      max_branches: p.has_multi_branch ? 9999 : 1,
      max_staff: maxStaff,
      description_ar: p.tagline_ar ?? '',
      color: PLAN_COLORS[p.id] ?? '#64748B',
      included_modules: modulesForPlan(p),
      is_featured: p.is_popular,
      sort_order: p.sort_order,
      is_active: p.is_active,
      trial_days: 7,                 // global default — was per-plan in legacy
      includes_whatsapp_support: p.has_priority_support,
      includes_ai: p.has_ai,
      // Live tenant count for this plan (drives "x شركات على هذه الباقة")
      client_count: countMap.get(p.id as never) ?? 0,
    };
  });

  return NextResponse.json({ plans });
}

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  // Plans are now managed via /api/saas-billing/plans (PATCH). Direct creation
  // not supported — the 5 canonical plans are seeded once.
  return NextResponse.json(
    { error: 'Plan creation not supported — edit existing plans via /saas-billing' },
    { status: 400 },
  );
}
