export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantsWithPartners = await prisma.partner.groupBy({
    by: ['tenant_id'],
    _count: true,
  })

  const totalPartners = await prisma.partner.count()
  const totalActivePartners = await prisma.partner.count({ where: { is_active: true } })
  const totalDistributions = await prisma.profitDistribution.count()
  const totalDistributedAgg = await prisma.partnerWithdrawal.aggregate({
    _sum: { amount: true },
    where: { type: 'profit_distribution' },
  })
  const totalDistributed = Number(totalDistributedAgg._sum.amount ?? 0)

  // Top tenants by partner count
  const topIds = tenantsWithPartners.slice(0, 10).map(t => t.tenant_id)
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true },
  })
  const tenantMap = new Map(tenants.map(t => [t.id, t.name]))

  return NextResponse.json({
    tenants_using_partners: tenantsWithPartners.length,
    total_partners: totalPartners,
    active_partners: totalActivePartners,
    total_distributions: totalDistributions,
    total_distributed_iqd: totalDistributed,
    avg_partners_per_tenant: tenantsWithPartners.length > 0
      ? totalPartners / tenantsWithPartners.length : 0,
    top_tenants: tenantsWithPartners
      .map(t => ({
        tenant_id: t.tenant_id,
        tenant_name: tenantMap.get(t.tenant_id) ?? '—',
        partners_count: t._count,
      }))
      .sort((a, b) => b.partners_count - a.partners_count)
      .slice(0, 10),
  })
}
