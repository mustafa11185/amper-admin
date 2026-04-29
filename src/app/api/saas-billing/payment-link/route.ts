/**
 * POST /api/saas-billing/payment-link
 *
 * Generates a one-shot payment link the admin can copy/share with a tenant via
 * WhatsApp. The link points to a public manager-app page that pre-fills tenant
 * + plan + period + (optional) coupon and routes the user through standard
 * checkout once they click "Pay now".
 *
 * Body: { tenant_id, plan_id, period_months, coupon_code?, gateway? }
 *
 * Returns: { payment_url, whatsapp_url }
 *
 * Auth: super_admin / sales.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const { tenant_id, plan_id, period_months, coupon_code, gateway } = body;

  if (!tenant_id || !plan_id) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  const period = Number(period_months);
  if (![1, 3, 6, 12].includes(period)) {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });
  }

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenant_id },
      select: { id: true, name: true, owner_name: true, phone: true },
    }),
    prisma.plan.findUnique({ where: { id: plan_id } }),
  ]);
  if (!tenant) return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
  if (!plan) return NextResponse.json({ error: 'PLAN_NOT_FOUND' }, { status: 404 });

  const baseUrl = process.env.MANAGER_APP_URL || 'http://localhost:3002';
  const params = new URLSearchParams({
    plan: plan_id,
    period: String(period),
  });
  if (coupon_code) params.set('coupon', String(coupon_code).toUpperCase());
  if (gateway) params.set('gateway', String(gateway));
  const paymentUrl = `${baseUrl}/pay?${params.toString()}`;

  // Compute price for message
  const priceMap = { 1: plan.price_monthly, 3: plan.price_3m, 6: plan.price_6m, 12: plan.price_12m } as const;
  const amount = priceMap[period as keyof typeof priceMap];

  // Pre-formatted WhatsApp message (Arabic)
  const periodLabel = period === 1 ? 'شهر' : period === 12 ? 'سنة' : `${period} شهور`;
  const lines = [
    `مرحباً ${tenant.owner_name},`,
    ``,
    `تم تجهيز رابط الدفع الخاص بك من فريق Amper:`,
    ``,
    `📦 الباقة: ${plan.name_ar}`,
    `⏱️ المدة: ${periodLabel}`,
    `💰 المبلغ: ${amount.toLocaleString('en-US')} د.ع`,
    coupon_code ? `🎟️ كوبون: ${coupon_code}` : '',
    ``,
    `للدفع: ${paymentUrl}`,
    ``,
    `عند أي استفسار، نحن في خدمتك.`,
    `— فريق Amper`,
  ].filter(Boolean);
  const message = lines.join('\n');

  // wa.me link — strip leading 0 from Iraqi numbers
  const cleanPhone = tenant.phone.replace(/[^0-9]/g, '').replace(/^0/, '964');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    ok: true,
    payment_url: paymentUrl,
    whatsapp_url: whatsappUrl,
    message,
    summary: {
      tenant: tenant.name,
      plan: plan.name_ar,
      period_months: period,
      amount,
      coupon_code: coupon_code || null,
    },
  });
}
