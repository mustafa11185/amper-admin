export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalDevices, onlineDevices, telemetry24h, alerts24h, telemetry7d, devicesByTenant,
  ] = await Promise.all([
    prisma.iotDevice.count(),
    prisma.iotDevice.count({ where: { is_online: true } }),
    prisma.iotTelemetry.count({ where: { recorded_at: { gte: dayAgo } } }),
    prisma.notification.count({
      where: {
        type: { in: ['fuel_theft_suspected', 'temp_critical', 'fuel_critical', 'device_offline', 'overload_detected'] },
        created_at: { gte: dayAgo },
      },
    }),
    prisma.iotTelemetry.count({ where: { recorded_at: { gte: weekAgo } } }),
    prisma.iotDevice.groupBy({
      by: ['tenant_id'],
      _count: true,
      orderBy: { _count: { tenant_id: 'desc' } },
      take: 10,
    }),
  ])

  // Attach tenant names
  const tenantIds = devicesByTenant.map(d => d.tenant_id).filter(Boolean) as string[]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true },
  })
  const tenantMap = new Map(tenants.map(t => [t.id, t.name]))

  return NextResponse.json({
    total_devices: totalDevices,
    online_devices: onlineDevices,
    online_pct: totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0,
    telemetry_24h: telemetry24h,
    telemetry_7d: telemetry7d,
    alerts_24h: alerts24h,
    top_tenants: devicesByTenant.map(d => ({
      tenant_id: d.tenant_id,
      tenant_name: tenantMap.get(d.tenant_id ?? '') ?? '—',
      device_count: d._count,
    })),
  })
}
