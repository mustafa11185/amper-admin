export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Mark a trial request as contacted/converted/etc
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  await prisma.trialRequest.update({
    where: { id },
    data: {
      status,
      contacted_at: status !== 'new' ? new Date() : undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
