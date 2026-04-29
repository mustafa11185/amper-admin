/**
 * POST /api/saas-billing/refund
 *
 * Mark a SaasOnlinePayment as refunded + unmark the linked invoice.
 * Does NOT call the gateway — we trust the operator has refunded
 * out-of-band (most Iraqi gateways don't offer programmatic refunds).
 *
 * Body: { payment_id, reason }
 *
 * Auth: super_admin / accountant.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

const ALLOWED_ROLES = ['super_admin', 'accountant'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });

  const paymentId: string = body.payment_id;
  const reason: string = (body.reason || '').trim();
  if (!paymentId) return NextResponse.json({ error: 'MISSING_PAYMENT_ID' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'REASON_REQUIRED' }, { status: 400 });

  const payment = await prisma.saasOnlinePayment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });
  if (!payment) return NextResponse.json({ error: 'PAYMENT_NOT_FOUND' }, { status: 404 });
  if (payment.status === 'refunded') {
    return NextResponse.json({ error: 'ALREADY_REFUNDED' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.saasOnlinePayment.update({
      where: { id: paymentId },
      data: {
        status: 'refunded',
        failure_reason: `refund: ${reason}`.slice(0, 500),
      },
    });

    if (payment.invoice && payment.invoice.is_paid) {
      await tx.billingInvoice.update({
        where: { id: payment.invoice.id },
        data: { is_paid: false, paid_at: null, saas_payment_id: null },
      });
    }

    await tx.subscriptionEvent.create({
      data: {
        tenant_id: payment.tenant_id,
        event_type: 'cancelled',
        metadata: {
          action: 'refund',
          payment_id: paymentId,
          invoice_id: payment.invoice?.id,
          amount: payment.amount.toString(),
          reason,
          actor_id: session.user.id,
          actor_email: session.user.email,
        } as Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
