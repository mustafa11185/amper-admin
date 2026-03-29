import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DEFAULT_PLANS = [
  {
    id: 'plan-trial', key: 'trial', name_ar: 'تجريبية', name_en: 'Trial',
    price_monthly_iqd: 0, price_annual_iqd: 0,
    max_generators: 1, max_subscribers: 20,
    description_ar: 'تجربة مجانية لمدة 7 أيام',
    color: '#64748B', included_modules: ['subscriber_management', 'basic_invoicing'],
    is_featured: false, sort_order: 0, is_active: true,
    trial_days: 7, includes_whatsapp_support: false, includes_ai: false,
  },
  {
    id: 'plan-basic', key: 'basic', name_ar: 'أساسية', name_en: 'Basic',
    price_monthly_iqd: 15000, price_annual_iqd: 150000,
    max_generators: 1, max_subscribers: 100,
    description_ar: 'للمولدات الصغيرة — جابي + مشغل',
    color: '#1B4FD8', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet'],
    is_featured: false, sort_order: 1, is_active: true,
    trial_days: 0, includes_whatsapp_support: false, includes_ai: false,
  },
  {
    id: 'plan-gold', key: 'gold', name_ar: 'ذهبية', name_en: 'Gold',
    price_monthly_iqd: 35000, price_annual_iqd: 350000,
    max_generators: 3, max_subscribers: 400,
    description_ar: 'الأكثر شيوعاً — كل الأدوار + تطبيق المشتركين',
    color: '#D97706', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief'],
    is_featured: true, sort_order: 2, is_active: true,
    trial_days: 0, includes_whatsapp_support: true, includes_ai: false,
  },
  {
    id: 'plan-fleet', key: 'fleet', name_ar: 'أسطول', name_en: 'Fleet',
    price_monthly_iqd: 75000, price_annual_iqd: 750000,
    max_generators: 0, max_subscribers: 0,
    description_ar: 'للشبكات الكبيرة — غير محدود + AI + API',
    color: '#7C3AED', included_modules: ['subscriber_management', 'basic_invoicing', 'pos', 'reports', 'wallet', 'whatsapp', 'engine_tracking', 'subscriber_app', 'daily_brief', 'ai_reports', 'multi_branch', 'gps', 'iot_monitoring', 'operator_app'],
    is_featured: false, sort_order: 3, is_active: true,
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
