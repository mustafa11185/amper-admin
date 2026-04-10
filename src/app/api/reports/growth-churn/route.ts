export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const twoMonthAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [totalActive, newThisMonth, newLastMonth, deactivated, activeMonthAgo] = await Promise.all([
    prisma.tenant.count({ where: { is_active: true } }),
    prisma.tenant.count({ where: { created_at: { gte: monthAgo } } }),
    prisma.tenant.count({ where: { created_at: { gte: twoMonthAgo, lt: monthAgo } } }),
    prisma.tenant.count({ where: { is_active: false, updated_at: { gte: monthAgo } } }),
    prisma.tenant.count({
      where: {
        OR: [
          { is_active: true, created_at: { lt: monthAgo } },
          { is_active: false, updated_at: { gte: monthAgo } },
        ],
      },
    }),
  ])

  const churnRate = activeMonthAgo > 0 ? (deactivated / activeMonthAgo) * 100 : 0
  const growthRate = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0
  const netNewCustomers = newThisMonth - deactivated

  return NextResponse.json({
    total_active: totalActive,
    new_this_month: newThisMonth,
    new_last_month: newLastMonth,
    deactivated_this_month: deactivated,
    net_new: netNewCustomers,
    growth_rate_pct: growthRate,
    churn_rate_pct: churnRate,
    health_status: churnRate < 5 ? 'excellent' : churnRate < 10 ? 'good' : 'attention',
  })
}
