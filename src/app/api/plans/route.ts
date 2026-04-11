export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Pricing model — 3-month minimum, no monthly billing.
// `price_monthly_iqd` is the base per-month rate when billing for 3 months.
// Discounts:
//   3 months → 0%, 6 months → 5%, 12 months → 15%
// Use periodMonthlyPrice/periodTotalPrice helpers below to compute.
const DEFAULT_PLANS = [
  {
    id: 'plan-starter', key: 'starter', name_ar: 'Starter ⚡', name_en: 'Starter',
    price_monthly_iqd: 0, price_annual_iqd: 0,
    max_generators: 1, max_subscribers: 25,
    description_ar: 'مجاني — للبدء والتجربة',
    color: '#374151', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'subscriber_app'],
    is_featured: false, sort_order: 0, is_active: true,
    trial_days: 0, includes_whatsapp_support: false, includes_ai: false,
  },
  {
    id: 'plan-pro', key: 'pro', name_ar: 'Pro 🚀', name_en: 'Pro',
    // 22,000/mo × 3 = 66,000 (3mo) | 6mo: 125,400 | 12mo: 224,400
    price_monthly_iqd: 22000, price_annual_iqd: 224400,
    max_generators: 2, max_subscribers: 100,
    description_ar: 'للمولدات المتوسطة — دفع إلكتروني + تقارير + واتساب',
    color: '#1B4FD8', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'subscriber_app', 'daily_brief'],
    is_featured: false, sort_order: 1, is_active: true,
    trial_days: 14, includes_whatsapp_support: true, includes_ai: false,
  },
  {
    id: 'plan-business', key: 'business', name_ar: 'Business 👑', name_en: 'Business',
    // 35,000/mo × 3 = 105,000 (3mo) | 6mo: 199,500 | 12mo: 357,000
    price_monthly_iqd: 35000, price_annual_iqd: 357000,
    max_generators: 5, max_subscribers: 300,
    description_ar: 'الأكثر شيوعاً — تخصيص التطبيق + تقارير متقدمة',
    color: '#D97706', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief', 'multi_branch', 'gps'],
    is_featured: true, sort_order: 2, is_active: true,
    trial_days: 14, includes_whatsapp_support: true, includes_ai: false,
  },
  {
    id: 'plan-corporate', key: 'corporate', name_ar: 'Corporate 🏢', name_en: 'Corporate',
    // 55,000/mo × 3 = 165,000 (3mo) | 6mo: 313,500 | 12mo: 561,000
    price_monthly_iqd: 55000, price_annual_iqd: 561000,
    max_generators: 15, max_subscribers: 1000,
    description_ar: 'للشبكات الكبيرة — API + AI + 25 جابي',
    color: '#0F766E', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief', 'ai_reports', 'multi_branch', 'gps', 'iot_monitoring', 'operator_app'],
    is_featured: false, sort_order: 3, is_active: true,
    trial_days: 14, includes_whatsapp_support: true, includes_ai: true,
  },
  {
    id: 'plan-fleet', key: 'fleet', name_ar: 'Fleet 🏭', name_en: 'Fleet',
    price_monthly_iqd: 0, price_annual_iqd: 0,
    max_generators: 0, max_subscribers: 0,
    description_ar: 'مخصص للأساطيل — غير محدود + White Label',
    color: '#111827', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief', 'ai_reports', 'multi_branch', 'gps', 'iot_monitoring', 'fuel_sensor', 'temperature_sensor', 'operator_app'],
    is_featured: false, sort_order: 4, is_active: true,
    trial_days: 0, includes_whatsapp_support: true, includes_ai: true,
  },
];

// Period helpers — kept in sync with manager-app /api/plan and Flutter.
// Allowed periods: quarterly (3mo, 0%), biannual (6mo, 5%), annual (12mo, 15%).
// There is NO monthly option — minimum subscription is 3 months.
export type BillingPeriod = "quarterly" | "biannual" | "annual"
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { quarterly: 3, biannual: 6, annual: 12 }
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = { quarterly: 0, biannual: 0.05, annual: 0.15 }

export function periodMonthlyPrice(baseMonthly: number, period: BillingPeriod): number {
  if (baseMonthly === 0) return 0
  return Math.round(baseMonthly * (1 - PERIOD_DISCOUNT[period]))
}
export function periodTotalPrice(baseMonthly: number, period: BillingPeriod): number {
  if (baseMonthly === 0) return 0
  return periodMonthlyPrice(baseMonthly, period) * PERIOD_MONTHS[period]
}

export async function GET(req: NextRequest) {
  const isPublic = req.nextUrl.searchParams.get("public") === "true";

  if (!isPublic) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Get client counts per plan
  const tenantCounts = await prisma.tenant.groupBy({
    by: ["plan"],
    where: { is_active: true },
    _count: { id: true },
  });

  const countMap = new Map(tenantCounts.map((t: any) => [t.plan, t._count.id]));

  return NextResponse.json({
    plans: DEFAULT_PLANS.filter(p => p.is_active).map((p) => ({
      ...p,
      client_count: countMap.get(p.key as any) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  // Plans are now defined inline — POST is a no-op
  return NextResponse.json({ error: "Plans are managed via code configuration" }, { status: 400 });
}
