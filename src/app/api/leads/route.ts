export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Combined inbox: trial requests + contact inquiries
export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [trialRequests, inquiries] = await Promise.all([
    prisma.trialRequest.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
    prisma.contactInquiry.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
  ])

  // Aggregate stats
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [newTrials30d, newInquiries30d, pendingTrials, pendingInquiries] = await Promise.all([
    prisma.trialRequest.count({ where: { created_at: { gte: monthAgo } } }),
    prisma.contactInquiry.count({ where: { created_at: { gte: monthAgo } } }),
    prisma.trialRequest.count({ where: { status: 'new' } }),
    prisma.contactInquiry.count({ where: { status: 'new' } }),
  ])

  return NextResponse.json({
    summary: {
      trials_30d: newTrials30d,
      inquiries_30d: newInquiries30d,
      pending_trials: pendingTrials,
      pending_inquiries: pendingInquiries,
      total_pending: pendingTrials + pendingInquiries,
    },
    trial_requests: trialRequests,
    contact_inquiries: inquiries,
  })
}
