export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Group branches by governorate
  const branches = await prisma.branch.findMany({
    select: {
      governorate: true,
      tenant_id: true,
      id: true,
      tenant: { select: { is_active: true } },
    },
  })

  const byGov: Record<string, { branches: number; tenants: Set<string>; subscribers: number }> = {}

  for (const b of branches) {
    if (!b.tenant.is_active) continue
    const gov = b.governorate ?? 'غير محدد'
    if (!byGov[gov]) byGov[gov] = { branches: 0, tenants: new Set(), subscribers: 0 }
    byGov[gov].branches++
    byGov[gov].tenants.add(b.tenant_id)
  }

  // Subscriber counts per governorate
  for (const gov of Object.keys(byGov)) {
    const branchIds = branches.filter(b => (b.governorate ?? 'غير محدد') === gov).map(b => b.id)
    const subCount = await prisma.subscriber.count({
      where: { branch_id: { in: branchIds }, is_active: true },
    })
    byGov[gov].subscribers = subCount
  }

  return NextResponse.json({
    governorates: Object.entries(byGov)
      .map(([name, data]) => ({
        name,
        branches: data.branches,
        tenants: data.tenants.size,
        subscribers: data.subscribers,
      }))
      .sort((a, b) => b.tenants - a.tenants),
  })
}
