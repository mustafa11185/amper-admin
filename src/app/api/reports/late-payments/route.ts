export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Per-month base rate (3-month minimum). Kept in sync with /api/plans + Flutter.
const PLAN_PRICES: Record<string, number> = {
  pro: 22000, basic: 22000,
  business: 35000, gold: 35000,
  corporate: 55000,
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // Tenants with subscription_ends_at in the past or in grace period
  const lateTenants = await prisma.tenant.findMany({
    where: {
      is_active: true,
      OR: [
        { subscription_ends_at: { lt: now } },
        { is_in_grace_period: true },
      ],
    },
    select: {
      id: true,
      name: true,
      owner_name: true,
      phone: true,
      plan: true,
      subscription_ends_at: true,
      grace_period_ends_at: true,
      is_in_grace_period: true,
    },
    orderBy: { subscription_ends_at: 'asc' },
  })

  const enriched = lateTenants.map(t => {
    const daysLate = t.subscription_ends_at
      ? Math.floor((now.getTime() - t.subscription_ends_at.getTime()) / (24 * 60 * 60 * 1000))
      : 0
    const owedAmount = PLAN_PRICES[t.plan.toLowerCase()] ?? 0
    return {
      ...t,
      days_late: daysLate,
      owed_amount: owedAmount,
      severity: daysLate > 30 ? 'critical' : daysLate > 14 ? 'high' : 'medium',
    }
  })

  const totalOwed = enriched.reduce((s, t) => s + t.owed_amount, 0)
  const critical = enriched.filter(t => t.severity === 'critical').length

  return NextResponse.json({
    summary: {
      total_late: enriched.length,
      critical_count: critical,
      total_owed_iqd: totalOwed,
    },
    tenants: enriched,
  })
}
