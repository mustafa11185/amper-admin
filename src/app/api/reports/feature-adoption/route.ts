export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Count usage per feature
  const [
    iotDevicesCount,
    iotActiveDevices,
    fuelEventsCount,
    overloadEventsCount,
    voltageEventsCount,
    partnersCount,
    distributionsCount,
    kiosksCount,
    activeKiosks,
    alertsEnabledCount,
  ] = await Promise.all([
    prisma.iotDevice.count(),
    prisma.iotDevice.count({ where: { is_online: true } }),
    prisma.fuelEvent.count(),
    prisma.overloadEvent.count(),
    prisma.voltageEvent.count(),
    prisma.partner.count(),
    prisma.profitDistribution.count(),
    prisma.kioskScreen.count(),
    prisma.kioskScreen.count({ where: { is_active: true } }),
    prisma.tenant.count({ where: { alerts_enabled: true } }),
  ])

  const totalActive = await prisma.tenant.count({ where: { is_active: true } })

  return NextResponse.json({
    total_active_tenants: totalActive,
    features: [
      { key: 'iot_devices', label: 'أجهزة IoT', count: iotDevicesCount, active: iotActiveDevices },
      { key: 'fuel_theft', label: 'كاشف سرقة الوقود', count: fuelEventsCount },
      { key: 'overload', label: 'كشف الاستهلاك المخالف', count: overloadEventsCount },
      { key: 'voltage', label: 'مراقبة الفولتية', count: voltageEventsCount },
      { key: 'partners', label: 'نظام الشركاء', count: partnersCount },
      { key: 'distributions', label: 'توزيعات أرباح', count: distributionsCount },
      { key: 'kiosks', label: 'شاشات Kiosk', count: kiosksCount, active: activeKiosks },
      { key: 'whatsapp_alerts', label: 'تنبيهات WhatsApp', count: alertsEnabledCount },
    ].sort((a, b) => b.count - a.count),
  })
}
