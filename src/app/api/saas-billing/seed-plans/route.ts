/**
 * POST /api/saas-billing/seed-plans
 *
 * One-shot seeder for the canonical 5-plan catalog. Mirrors
 * `prisma/seed-plans.ts` exactly so non-developers can populate the
 * `plans` table from the admin UI without shell access.
 *
 * Behavior:
 *   - For each canonical plan: insert if missing, leave existing rows
 *     untouched (does NOT overwrite an admin-edited plan).
 *   - Legacy `basic` / `gold` rows: mark is_active=false so they stop
 *     showing on /pricing while preserving any historical references.
 *
 * Auth: super_admin only.
 *
 * Response: { ok: true, inserted: number, skipped: number, deactivated: number }
 */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function computePrices(monthlyBase: number) {
  return {
    price_monthly: monthlyBase,
    price_3m: monthlyBase * 3,
    price_6m: Math.round(monthlyBase * 6 * 0.95), // 5% off
    price_12m: Math.round(monthlyBase * 12 * 0.85), // 15% off
  };
}

const CANONICAL_PLANS = [
  {
    id: 'starter',
    name_en: 'Starter',
    name_ar: 'Starter ⚡',
    ...computePrices(0),
    generator_limit: 1,
    subscriber_limit: 25,
    staff_limit: 1,
    has_iot: false,
    has_ai: false,
    has_subscriber_app: true,
    has_api: false,
    has_multi_branch: false,
    has_priority_support: false,
    is_active: true,
    is_popular: false,
    sort_order: 0,
    tagline_ar: 'مجاني — للبدء والتجربة',
    tagline_en: 'Free — for getting started',
  },
  {
    id: 'pro',
    name_en: 'Pro',
    name_ar: 'Pro 🚀',
    ...computePrices(22_000),
    generator_limit: 2,
    subscriber_limit: 150,
    staff_limit: 5,
    has_iot: false,
    has_ai: false,
    has_subscriber_app: true,
    has_api: false,
    has_multi_branch: false,
    has_priority_support: false,
    is_active: true,
    is_popular: false,
    sort_order: 1,
    tagline_ar: 'للمولدات المتوسطة — دفع إلكتروني + تقارير + واتساب',
    tagline_en: 'Mid-size generators — payments + reports + WhatsApp',
  },
  {
    id: 'business',
    name_en: 'Business',
    name_ar: 'Business 👑',
    ...computePrices(35_000),
    generator_limit: 5,
    subscriber_limit: 500,
    staff_limit: 15,
    has_iot: false,
    has_ai: false,
    has_subscriber_app: true,
    has_api: false,
    has_multi_branch: true,
    has_priority_support: true,
    is_active: true,
    is_popular: true,
    sort_order: 2,
    tagline_ar: 'الأكثر شيوعاً — تخصيص التطبيق + تقارير متقدمة',
    tagline_en: 'Most popular — branded app + advanced reports',
  },
  {
    id: 'corporate',
    name_en: 'Corporate',
    name_ar: 'Corporate 🏢',
    ...computePrices(55_000),
    generator_limit: 15,
    subscriber_limit: 2_000,
    staff_limit: 50,
    has_iot: true,
    has_ai: true,
    has_subscriber_app: true,
    has_api: false,
    has_multi_branch: true,
    has_priority_support: true,
    is_active: true,
    is_popular: false,
    sort_order: 3,
    tagline_ar: 'للشبكات الكبيرة — API + AI + 50 موظف',
    tagline_en: 'Large networks — API + AI + 50 staff',
  },
  {
    id: 'fleet',
    name_en: 'Fleet',
    name_ar: 'Fleet 🏭',
    ...computePrices(0),
    generator_limit: -1,
    subscriber_limit: -1,
    staff_limit: -1,
    has_iot: true,
    has_ai: true,
    has_subscriber_app: true,
    has_api: true,
    has_multi_branch: true,
    has_priority_support: true,
    is_active: true,
    is_popular: false,
    sort_order: 4,
    tagline_ar: 'مخصص للأساطيل — غير محدود + White Label',
    tagline_en: 'Fleet — unlimited + White Label',
  },
];

export async function POST() {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let inserted = 0;
  let skipped = 0;
  for (const plan of CANONICAL_PLANS) {
    const existing = await prisma.plan.findUnique({ where: { id: plan.id } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.plan.create({ data: plan });
    inserted += 1;
  }

  // Legacy basic/gold: keep rows so historical FKs survive, but hide them.
  const deactivated = await prisma.plan.updateMany({
    where: { id: { in: ['basic', 'gold'] }, is_active: true },
    data: { is_active: false, sort_order: 999 },
  });

  return NextResponse.json({
    ok: true,
    inserted,
    skipped,
    deactivated: deactivated.count,
    plans: CANONICAL_PLANS.map(p => ({ id: p.id, name_ar: p.name_ar, price_monthly: p.price_monthly })),
  });
}
