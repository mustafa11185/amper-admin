/**
 * GET  /api/saas-billing/coupons   — list all coupons
 * POST /api/saas-billing/coupons   — create new coupon
 *
 * Auth: super_admin / sales.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales'];

export async function GET() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const coupons = await prisma.saasCoupon.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
  });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const code: string = (body.code || '').toString().trim().toUpperCase();
  const type: 'percent' | 'fixed' = body.type;
  const amount: number = Number(body.amount);
  const description: string | null = body.description ? String(body.description).slice(0, 200) : null;
  const applicable_plans: string[] = Array.isArray(body.applicable_plans) ? body.applicable_plans : [];
  const min_amount: number = Math.max(0, Number(body.min_amount || 0));
  const max_redemptions: number = Math.max(0, Number(body.max_redemptions || 0));
  const expires_at: Date | null = body.expires_at ? new Date(body.expires_at) : null;
  const is_active: boolean = body.is_active !== false;

  // Validation
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    return NextResponse.json({ error: 'INVALID_CODE', message: 'الكود: 3-30 حرف، A-Z + 0-9 + - _' }, { status: 400 });
  }
  if (type !== 'percent' && type !== 'fixed') {
    return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'INVALID_AMOUNT' }, { status: 400 });
  }
  if (type === 'percent' && amount > 100) {
    return NextResponse.json({ error: 'PERCENT_MAX_100' }, { status: 400 });
  }

  try {
    const coupon = await prisma.saasCoupon.create({
      data: {
        code, description, type, amount: Math.round(amount),
        applicable_plans, min_amount, max_redemptions, expires_at, is_active,
        created_by: session.user.id,
      },
    });
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CREATE_FAILED';
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'CODE_ALREADY_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ error: 'CREATE_FAILED', message: msg }, { status: 500 });
  }
}
