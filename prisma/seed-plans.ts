/**
 * Seed Plan catalog with the 5 Amper plans.
 * Source of truth for pricing: matches `company-admin/src/app/api/plans/route.ts`
 * DEFAULT_PLANS array (the legacy /plans page).
 *
 * Discount schedule (period-based):
 *   - Monthly (1m): 0% off (allowed only for first-time subscribers)
 *   - 3 months: 0% off
 *   - 6 months: 5% off
 *   - 12 months: 15% off
 *
 * Idempotent: uses upsert so re-running is safe.
 *
 * Run: npx tsx prisma/seed-plans.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function computePrices(monthlyBase: number) {
  return {
    price_monthly: monthlyBase,
    price_3m: monthlyBase * 3,
    price_6m: Math.round(monthlyBase * 6 * 0.95), // 5% off
    price_12m: Math.round(monthlyBase * 12 * 0.85), // 15% off
  };
}

const plans = [
  {
    id: 'starter',
    name_en: 'Starter',
    name_ar: 'Starter ⚡',
    ...computePrices(0), // Free — no online checkout
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
    is_popular: true, // ⭐ "الأكثر شيوعاً"
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
    ...computePrices(0), // Custom quote — no online checkout
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

async function main() {
  console.log('▸ Seeding 5-plan catalog (matches company-admin DEFAULT_PLANS)…');

  // Deactivate the old basic/gold rows that I seeded earlier (keep them so any
  // existing references don't break, but hide from new signups).
  await prisma.plan.updateMany({
    where: { id: { in: ['basic', 'gold'] } },
    data: { is_active: false, sort_order: 999 },
  });
  console.log('  ✓ deactivated legacy basic/gold');

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    const priceStr = plan.price_monthly === 0 ? 'مجاني/مخصص' : `${plan.price_monthly.toLocaleString()} د.ع/شهر`;
    console.log(`  ✓ ${plan.id.padEnd(10)} · ${plan.name_ar.padEnd(15)} · ${priceStr}`);
  }
  console.log('✅ Plans seeded.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
