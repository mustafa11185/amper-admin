export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    price_monthly_iqd: 20000, price_annual_iqd: 200000,
    max_generators: 2, max_subscribers: 100,
    description_ar: 'للمولدات المتوسطة — دفع إلكتروني + تقارير + واتساب',
    color: '#1B4FD8', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'subscriber_app', 'daily_brief'],
    is_featured: false, sort_order: 1, is_active: true,
    trial_days: 14, includes_whatsapp_support: true, includes_ai: false,
  },
  {
    id: 'plan-business', key: 'business', name_ar: 'Business 👑', name_en: 'Business',
    price_monthly_iqd: 30000, price_annual_iqd: 300000,
    max_generators: 5, max_subscribers: 300,
    description_ar: 'الأكثر شيوعاً — تخصيص التطبيق + تقارير متقدمة',
    color: '#D97706', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief', 'multi_branch', 'gps'],
    is_featured: true, sort_order: 2, is_active: true,
    trial_days: 14, includes_whatsapp_support: true, includes_ai: false,
  },
  {
    id: 'plan-corporate', key: 'corporate', name_ar: 'Corporate 🏢', name_en: 'Corporate',
    price_monthly_iqd: 50000, price_annual_iqd: 500000,
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
