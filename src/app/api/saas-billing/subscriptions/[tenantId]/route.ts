/**
 * GET /api/saas-billing/subscriptions/{tenantId}
 *
 * Full subscription detail for the support drawer:
 *   - tenant info
 *   - plan info
 *   - all invoices (paid + unpaid)
 *   - all online payments
 *   - subscription event log
 *
 * Auth: super_admin / sales / accountant / support.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const ALLOWED_ROLES = ['super_admin', 'sales', 'accountant', 'support'];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tenantId: string }> }) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { tenantId } = await ctx.params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      owner_name: true,
      phone: true,
      email: true,
      plan: true,
      is_active: true,
      is_trial: true,
      trial_ends_at: true,
      subscription_ends_at: true,
      grace_period_ends_at: true,
      is_in_grace_period: true,
      auto_renew_enabled: true,
      created_at: true,
    },
  });
  if (!tenant) return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });

  const [plan, invoices, payments, events] = await Promise.all([
    prisma.plan.findUnique({
      where: { id: tenant.plan },
      select: { id: true, name_ar: true, price_monthly: true, generator_limit: true, subscriber_limit: true },
    }),
    prisma.billingInvoice.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 30,
      select: {
        id: true, invoice_number: true, amount: true, final_amount: true,
        plan: true, period_months: true, period_start: true, period_end: true,
        is_paid: true, paid_at: true, created_at: true,
      },
    }),
    prisma.saasOnlinePayment.findMany({
      where: { tenant_id: tenantId },
      orderBy: { initiated_at: 'desc' },
      take: 30,
      select: {
        id: true, gateway: true, gateway_txn_id: true, gateway_ref: true,
        amount: true, currency: true, status: true, failure_reason: true,
        is_auto_renewal: true, initiated_at: true, completed_at: true,
        invoice_id: true,
      },
    }),
    prisma.subscriptionEvent.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: { id: true, event_type: true, metadata: true, created_at: true },
    }),
  ]);

  // Aggregate metrics
  const lifetimeRevenue = invoices
    .filter((i) => i.is_paid)
    .reduce((acc, i) => acc + Number(i.final_amount), 0);

  return NextResponse.json({
    tenant,
    plan,
    metrics: {
      lifetime_revenue: lifetimeRevenue,
      paid_invoice_count: invoices.filter((i) => i.is_paid).length,
      unpaid_invoice_count: invoices.filter((i) => !i.is_paid).length,
      successful_payment_count: payments.filter((p) => p.status === 'succeeded').length,
      failed_payment_count: payments.filter((p) => p.status === 'failed').length,
    },
    invoices: invoices.map((i) => ({
      ...i,
      amount: Number(i.amount),
      final_amount: Number(i.final_amount),
    })),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    events,
  });
}
