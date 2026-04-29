/**
 * PATCH  /api/saas-billing/coupons/{id}  — toggle is_active or update fields
 * DELETE /api/saas-billing/coupons/{id}  — delete (only if no redemptions)
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !['super_admin', 'sales'].includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ('is_active' in body) data.is_active = !!body.is_active;
  if ('description' in body) data.description = body.description ? String(body.description).slice(0, 200) : null;
  if ('expires_at' in body) data.expires_at = body.expires_at ? new Date(body.expires_at) : null;
  if ('max_redemptions' in body) data.max_redemptions = Math.max(0, Number(body.max_redemptions));

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'NOTHING_TO_UPDATE' }, { status: 400 });
  }

  try {
    const coupon = await prisma.saasCoupon.update({ where: { id }, data });
    return NextResponse.json({ ok: true, coupon });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { id } = await ctx.params;

  // Cannot delete if there are redemptions (preserve audit trail)
  const redemptions = await prisma.saasCouponRedemption.count({ where: { coupon_id: id } });
  if (redemptions > 0) {
    return NextResponse.json({
      error: 'HAS_REDEMPTIONS',
      message: `لا يمكن حذف كوبون استُخدم ${redemptions} مرة. عطّله بدلاً من حذفه.`,
    }, { status: 409 });
  }

  await prisma.saasCoupon.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
