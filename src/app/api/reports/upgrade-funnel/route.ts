export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Upgrade events from PlanChangeLog
  const monthAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const upgrades = await prisma.planChangeLog.findMany({
    where: {
      change_type: 'plan_change',
      created_at: { gte: monthAgo },
    },
    select: { from_plan: true, to_plan: true, created_at: true },
  })

  const planOrder = ['starter', 'pro', 'basic', 'business', 'gold', 'corporate', 'fleet']
  const isUpgrade = (from: string | null, to: string | null) => {
    if (!from || !to) return false
    return planOrder.indexOf(to.toLowerCase()) > planOrder.indexOf(from.toLowerCase())
  }

  const upgradeEvents = upgrades.filter(u => isUpgrade(u.from_plan, u.to_plan))
  const downgradeEvents = upgrades.filter(u => !isUpgrade(u.from_plan, u.to_plan) && u.from_plan !== u.to_plan)

  // Path frequency
  const paths: Record<string, number> = {}
  for (const u of upgradeEvents) {
    const key = `${u.from_plan} → ${u.to_plan}`
    paths[key] = (paths[key] || 0) + 1
  }

  // Current funnel
  const planCounts = await prisma.tenant.groupBy({
    by: ['plan'],
    where: { is_active: true },
    _count: true,
  })

  return NextResponse.json({
    period_days: 90,
    total_upgrades: upgradeEvents.length,
    total_downgrades: downgradeEvents.length,
    upgrade_paths: Object.entries(paths)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count),
    current_distribution: planCounts.map(p => ({ plan: p.plan, count: p._count })),
  })
}
