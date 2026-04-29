/**
 * POST /api/saas-billing/onboard
 *
 * Unified client onboarding for sales reps. Combines what used to be 3 separate
 * flows (admin tenant creation + payment link + manual cash entry) into a
 * single transactional endpoint with 3 payment_method modes:
 *
 *   1. `link`        — create tenant in trial, return /pay?... URL +
 *                      pre-formatted WhatsApp message + wa.me URL.
 *                      Customer clicks the link, logs in, completes checkout.
 *
 *   2. `cash`        — create tenant + create paid BillingInvoice + manual
 *                      Payment record + extend subscription_ends_at by period.
 *                      Tenant is_active=true immediately, no gateway call.
 *
 *   3. `trial_only`  — create tenant in trial mode (7 days, no invoice).
 *                      For warm leads where you want to onboard now and bill later.
 *
 * Auth: super_admin / sales.
 *
 * Returns tenant + password (plaintext, for sales rep to share with customer)
 * + mode-specific URLs/IDs.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

const ALLOWED_ROLES = ['super_admin', 'sales'];
type PaymentMethod = 'link' | 'cash' | 'trial_only';
const VALID_METHODS: PaymentMethod[] = ['link', 'cash', 'trial_only'];
const VALID_GATEWAYS = ['zaincash', 'qi', 'asiapay'];
const VALID_PERIODS = [1, 3, 6, 12];

const IRAQI_PHONE = /^(07[3-9]\d{8}|9647[3-9]\d{8})$/;

function generatePassword(): string {
  // Sales-friendly: 6 lowercase letters + 4 digits → easy to read over WhatsApp
  const letters = 'abcdefghkmnpqrstuvwxyz'; // skip confusing l/i/j/o
  const digits = '23456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

function priceForPeriod(plan: { price_monthly: number; price_3m: number; price_6m: number; price_12m: number }, p: number): number {
  return p === 1 ? plan.price_monthly : p === 3 ? plan.price_3m : p === 6 ? plan.price_6m : plan.price_12m;
}

function addMonths(d: Date, m: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + m);
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  // ── Validate tenant info ──
  const businessName = (body.business_name || '').trim();
  const ownerName = (body.owner_name || '').trim();
  const phoneRaw = (body.phone || '').replace(/[\s\-()]/g, '');
  const email = (body.email || '').trim() || null;
  const governorate = (body.governorate || '').trim() || null;
  const passwordPlain = (body.password || '').trim() || generatePassword();

  if (!businessName || businessName.length < 2) return NextResponse.json({ error: 'INVALID_BUSINESS_NAME' }, { status: 400 });
  if (!ownerName || ownerName.length < 2) return NextResponse.json({ error: 'INVALID_OWNER_NAME' }, { status: 400 });
  if (!IRAQI_PHONE.test(phoneRaw)) return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  const phone = phoneRaw.startsWith('964') ? '0' + phoneRaw.slice(3) : phoneRaw;
  if (passwordPlain.length < 6) return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 });

  // ── Validate plan/period ──
  const planId: string = body.plan_id;
  const periodMonths: number = Number(body.period_months);
  if (!planId) return NextResponse.json({ error: 'MISSING_PLAN_ID' }, { status: 400 });
  if (!VALID_PERIODS.includes(periodMonths)) return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.is_active) return NextResponse.json({ error: 'PLAN_NOT_FOUND' }, { status: 404 });

  // ── Validate payment method ──
  const paymentMethod: PaymentMethod = body.payment_method;
  if (!VALID_METHODS.includes(paymentMethod)) return NextResponse.json({ error: 'INVALID_PAYMENT_METHOD' }, { status: 400 });

  const gateway: string = body.gateway || 'zaincash';
  if (paymentMethod === 'link' && !VALID_GATEWAYS.includes(gateway)) {
    return NextResponse.json({ error: 'INVALID_GATEWAY' }, { status: 400 });
  }

  // ── Phone uniqueness ──
  const existing = await prisma.tenant.findUnique({ where: { phone }, select: { id: true } });
  if (existing) return NextResponse.json({ error: 'PHONE_ALREADY_REGISTERED' }, { status: 409 });

  // ── Coupon (optional) ──
  const couponCodeRaw = (body.coupon_code || '').toString().trim().toUpperCase();
  let couponDiscount = 0;
  let couponId: string | null = null;
  if (couponCodeRaw) {
    const coupon = await prisma.saasCoupon.findUnique({ where: { code: couponCodeRaw } });
    if (coupon && coupon.is_active && (!coupon.expires_at || coupon.expires_at > new Date())
        && (coupon.max_redemptions === 0 || coupon.redeemed_count < coupon.max_redemptions)
        && (coupon.applicable_plans.length === 0 || coupon.applicable_plans.includes(planId))) {
      const base = priceForPeriod(plan, periodMonths);
      if (coupon.min_amount === 0 || base >= coupon.min_amount) {
        couponDiscount = coupon.type === 'percent' ? Math.round((base * coupon.amount) / 100) : coupon.amount;
        couponDiscount = Math.min(couponDiscount, base);
        couponId = coupon.id;
      }
    }
  }

  const baseAmount = priceForPeriod(plan, periodMonths);
  const finalAmount = Math.max(0, baseAmount - couponDiscount);

  // ── Create tenant + branch (always) ──
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const now = new Date();

  // Branch by payment_method to set initial subscription state
  const tenantInitial = (() => {
    if (paymentMethod === 'cash') {
      // Active immediately
      return {
        is_trial: false,
        trial_ends_at: null,
        is_active: true,
        subscription_ends_at: addMonths(now, periodMonths),
      };
    } else if (paymentMethod === 'trial_only') {
      // Free trial 7 days
      return {
        is_trial: true,
        trial_ends_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
        subscription_ends_at: null,
      };
    } else {
      // 'link' — trial state until customer pays via the link
      return {
        is_trial: true,
        trial_ends_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
        subscription_ends_at: null,
      };
    }
  })();

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: businessName,
        owner_name: ownerName,
        phone,
        email,
        password: passwordHash,
        plan: planId as 'starter' | 'pro' | 'business' | 'corporate' | 'fleet' | 'basic' | 'gold' | 'custom' | 'trial',
        ...tenantInitial,
        auto_renew_enabled: paymentMethod !== 'trial_only',
      },
    });

    await tx.branch.create({
      data: {
        tenant_id: tenant.id,
        name: 'الفرع الرئيسي',
        governorate: governorate ?? undefined,
        is_active: true,
      },
    });

    // Mode-specific writes
    if (paymentMethod === 'cash') {
      // Generate invoice number
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const seq = await tx.billingInvoice.count({ where: { created_at: { gte: monthStart, lt: monthEnd } } });
      const invoiceNumber = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(seq + 1).padStart(3, '0')}`;

      const invoice = await tx.billingInvoice.create({
        data: {
          tenant_id: tenant.id,
          amount: baseAmount as unknown as Prisma.Decimal,
          discount_amount: couponDiscount as unknown as Prisma.Decimal,
          final_amount: finalAmount as unknown as Prisma.Decimal,
          plan: planId as 'starter' | 'pro' | 'business' | 'corporate' | 'fleet' | 'basic' | 'gold' | 'custom' | 'trial',
          period_months: periodMonths,
          period_start: now,
          period_end: addMonths(now, periodMonths),
          is_paid: true,
          paid_at: now,
          invoice_number: invoiceNumber,
        },
      });

      const payment = await tx.payment.create({
        data: {
          tenant_id: tenant.id,
          invoice_id: invoice.id,
          amount: finalAmount as unknown as Prisma.Decimal,
          method: 'cash',
          reference: body.cash_reference ? String(body.cash_reference).slice(0, 100) : null,
          notes: body.cash_notes ? String(body.cash_notes).slice(0, 500) : `Manual cash entry by ${session.user.email}`,
          recorded_by: session.user.id,
        },
      });

      if (couponId) {
        await tx.saasCoupon.update({ where: { id: couponId }, data: { redeemed_count: { increment: 1 } } });
        await tx.saasCouponRedemption.create({
          data: { coupon_id: couponId, tenant_id: tenant.id, invoice_id: invoice.id, discount_amount: couponDiscount },
        });
      }

      await tx.subscriptionEvent.create({
        data: {
          tenant_id: tenant.id,
          event_type: 'trial_converted',
          metadata: {
            source: 'admin_onboard_cash',
            actor_email: session.user.email,
            invoice_id: invoice.id,
            payment_id: payment.id,
            amount: finalAmount,
            coupon_code: couponCodeRaw || null,
            cash_reference: body.cash_reference || null,
          } as Prisma.InputJsonValue,
        },
      });

      return { tenant, invoice, payment };
    }

    // For link + trial_only: just emit trial_started
    await tx.subscriptionEvent.create({
      data: {
        tenant_id: tenant.id,
        event_type: 'trial_started',
        metadata: {
          source: paymentMethod === 'link' ? 'admin_onboard_link' : 'admin_onboard_trial',
          actor_email: session.user.email,
          plan: planId,
          period_months: periodMonths,
          coupon_code: couponCodeRaw || null,
        } as Prisma.InputJsonValue,
      },
    });

    return { tenant, invoice: null, payment: null };
  });

  // ── Build mode-specific response payload ──
  const baseResp = {
    ok: true,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      phone: result.tenant.phone,
    },
    password: passwordPlain, // ONE-TIME — sales rep must share now
    plan: { id: plan.id, name_ar: plan.name_ar, base_amount: baseAmount },
    coupon_applied: couponId ? { code: couponCodeRaw, discount: couponDiscount } : null,
    final_amount: finalAmount,
  };

  if (paymentMethod === 'cash') {
    return NextResponse.json({
      ...baseResp,
      payment_method: 'cash',
      invoice_id: result.invoice?.id,
      payment_id: result.payment?.id,
      subscription_ends_at: addMonths(now, periodMonths),
    });
  }

  if (paymentMethod === 'trial_only') {
    return NextResponse.json({
      ...baseResp,
      payment_method: 'trial_only',
      trial_ends_at: tenantInitial.trial_ends_at,
    });
  }

  // 'link' — generate /pay URL + WhatsApp message
  const baseUrl = process.env.MANAGER_APP_URL || 'http://localhost:3002';
  const params = new URLSearchParams({ plan: planId, period: String(periodMonths), gateway });
  if (couponCodeRaw) params.set('coupon', couponCodeRaw);
  const paymentUrl = `${baseUrl}/pay?${params.toString()}`;

  const periodLabel = periodMonths === 1 ? 'شهر' : periodMonths === 12 ? 'سنة' : `${periodMonths} شهور`;
  const lines = [
    `مرحباً ${ownerName},`,
    ``,
    `أهلاً بك في Amper · نظام إدارة المولدات`,
    ``,
    `📦 الباقة: ${plan.name_ar}`,
    `⏱️ المدة: ${periodLabel}`,
    `💰 المبلغ: ${finalAmount.toLocaleString('en-US')} د.ع${couponDiscount > 0 ? ` (بعد خصم ${couponDiscount.toLocaleString('en-US')})` : ''}`,
    couponCodeRaw ? `🎟️ كوبون: ${couponCodeRaw}` : '',
    ``,
    `🔐 معلومات تسجيل الدخول:`,
    `   📞 الهاتف: ${phone}`,
    `   🔑 كلمة المرور: ${passwordPlain}`,
    ``,
    `للدفع: ${paymentUrl}`,
    ``,
    `بعد الدفع سيتم تفعيل حسابك تلقائياً.`,
    ``,
    `أي استفسار، نحن في خدمتك.`,
    `— فريق Amper`,
  ].filter(Boolean);
  const message = lines.join('\n');

  const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '964');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    ...baseResp,
    payment_method: 'link',
    payment_url: paymentUrl,
    whatsapp_url: whatsappUrl,
    whatsapp_message: message,
    gateway,
  });
}
