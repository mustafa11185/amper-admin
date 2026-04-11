export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Plan prices in IQD per month — base rate (3-month minimum subscription).
// Kept in sync with manager-app/api/plan, company-admin/api/plans, and Flutter.
const PLAN_PRICES: Record<string, number> = {
  starter: 0, trial: 0,
  pro: 22000, basic: 22000,
  business: 35000, gold: 35000,
  corporate: 55000,
  fleet: 0, custom: 0,
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Active tenants by plan
  const tenants = await prisma.tenant.findMany({
    where: { is_active: true },
    select: { plan: true, created_at: true },
  })

  const byPlan: Record<string, number> = {}
  let totalMRR = 0
  for (const t of tenants) {
    const plan = t.plan.toLowerCase()
    byPlan[plan] = (byPlan[plan] || 0) + 1
    totalMRR += PLAN_PRICES[plan] || 0
  }

  // ARR = MRR * 12
  const totalARR = totalMRR * 12

  // Last 6 months MRR trend
  const now = new Date()
  const trend = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const created = await prisma.tenant.count({
      where: {
        is_active: true,
        created_at: { lt: nextMonth },
      },
    })
    // Approximation: assume current plan distribution applies historically
    const monthMRR = totalMRR * (created / Math.max(1, tenants.length))
    trend.push({
      month: `${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`,
      tenants: created,
      mrr: Math.round(monthMRR),
    })
  }

  return NextResponse.json({
    total_mrr: totalMRR,
    total_arr: totalARR,
    active_tenants: tenants.length,
    avg_revenue_per_tenant: tenants.length > 0 ? totalMRR / tenants.length : 0,
    by_plan: byPlan,
    trend,
  })
}
