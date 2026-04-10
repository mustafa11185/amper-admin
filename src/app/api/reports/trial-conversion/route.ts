export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Trials ever started
  const totalTrials = await prisma.tenant.count({ where: { has_used_trial: true } })

  // Currently in trial
  const activeTrials = await prisma.tenant.count({
    where: {
      trial_plan_until: { gte: new Date() },
    },
  })

  // Trials that converted (had trial → now on business+)
  const converted = await prisma.tenant.count({
    where: {
      has_used_trial: true,
      plan: { in: ['business', 'gold', 'corporate', 'fleet', 'custom'] },
    },
  })

  // Trials that didn't convert (had trial, still on starter/pro)
  const notConverted = await prisma.tenant.count({
    where: {
      has_used_trial: true,
      plan: { in: ['starter', 'trial', 'pro', 'basic'] },
    },
  })

  const conversionRate = totalTrials > 0 ? (converted / totalTrials) * 100 : 0

  return NextResponse.json({
    total_trials_started: totalTrials,
    active_trials: activeTrials,
    converted: converted,
    not_converted: notConverted,
    conversion_rate_pct: conversionRate,
    benchmark: 'الهدف: > 25% (متوسط سوق SaaS)',
  })
}
