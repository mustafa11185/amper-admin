/**
 * POST /api/saas-billing/extend
 *
 * Manually extend a tenant's subscription end date — for support workflows
 * (free month for VIP, recovery from failed auto-renew, etc.).
 *
 * Body: { tenant_id, days, reason }
 *
 * Auth: super_admin / sales (NOT support — needs revenue authority).
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

const ALLOWED_ROLES = ['super_admin', 'sales'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const tenantId: string = body.tenant_id;
  const days: number = body.days;
  const reason: string = (body.reason || '').trim();

  if (!tenantId) return NextResponse.json({ error: 'MISSING_TENANT_ID' }, { status: 400 });
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'INVALID_DAYS' }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: 'REASON_REQUIRED' }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, subscription_ends_at: true, trial_ends_at: true, is_trial: true },
  });
  if (!tenant) return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });

  // Extend from whichever is later: current end OR now (don't shrink)
  const baseDate =
    (tenant.subscription_ends_at && tenant.subscription_ends_at > new Date()
      ? tenant.subscription_ends_at
      : new Date());
  const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        subscription_ends_at: newEnd,
        is_in_grace_period: false,
        grace_period_ends_at: null,
        is_trial: false,
        trial_ends_at: null,
        is_active: true,
        locked_at: null,
      },
    });

    await tx.subscriptionEvent.create({
      data: {
        tenant_id: tenantId,
        event_type: 'reactivated',
        metadata: {
          action: 'manual_extend',
          days_added: days,
          reason,
          actor_id: session.user.id,
          actor_email: session.user.email,
          new_subscription_end: newEnd.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json({ ok: true, new_subscription_end: newEnd });
}
