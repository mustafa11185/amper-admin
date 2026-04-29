/**
 * GET /api/saas-billing/payments
 *
 * Recent SaasOnlinePayment records — for monitoring + dunning.
 * Query: ?status=failed|pending|succeeded&limit=50
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales', 'accountant', 'support'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status'); // null = all
  const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

  const where: Record<string, unknown> = {};
  if (status && ['initiated', 'pending', 'succeeded', 'failed', 'refunded'].includes(status)) {
    where.status = status;
  }

  const payments = await prisma.saasOnlinePayment.findMany({
    where,
    orderBy: { initiated_at: 'desc' },
    take: limit,
    include: {
      tenant: {
        select: { id: true, name: true, owner_name: true, phone: true, plan: true },
      },
      invoice: {
        select: { id: true, invoice_number: true, period_months: true },
      },
    },
  });

  return NextResponse.json({
    data: payments.map((p) => ({
      id: p.id,
      tenant: p.tenant,
      invoice_number: p.invoice?.invoice_number,
      invoice_id: p.invoice?.id,
      period_months: p.invoice?.period_months,
      gateway: p.gateway,
      gateway_txn_id: p.gateway_txn_id,
      gateway_ref: p.gateway_ref,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      failure_reason: p.failure_reason,
      is_auto_renewal: p.is_auto_renewal,
      initiated_at: p.initiated_at,
      completed_at: p.completed_at,
    })),
    count: payments.length,
  });
}
