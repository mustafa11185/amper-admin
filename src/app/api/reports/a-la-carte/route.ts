export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// À la carte feature overrides — most-requested individual features
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, plan: true, feature_overrides: true },
  })

  // Count each feature
  const counts: Record<string, number> = {}
  const tenantsWithOverrides: Array<{ id: string; name: string; plan: string; features: string[] }> = []

  for (const t of tenants) {
    const overrides = t.feature_overrides as string[]
    if (overrides.length > 0) {
      tenantsWithOverrides.push({
        id: t.id, name: t.name, plan: t.plan, features: overrides,
      })
    }
    for (const f of overrides) {
      counts[f] = (counts[f] || 0) + 1
    }
  }

  const labels: Record<string, string> = {
    fuel_theft_detection: 'كاشف سرقة الوقود',
    overload_detection: 'كشف الاستهلاك المخالف',
    voltage_monitoring: 'مراقبة الفولتية',
    profitability_calc: 'حاسبة الربحية',
    whatsapp_alerts: 'تنبيهات WhatsApp',
    smart_maintenance: 'الصيانة الذكية',
    partner_login_dashboard: 'دخول الشركاء',
  }

  return NextResponse.json({
    total_tenants_with_overrides: tenantsWithOverrides.length,
    feature_demand: Object.entries(counts)
      .map(([key, count]) => ({ key, label: labels[key] ?? key, count }))
      .sort((a, b) => b.count - a.count),
    tenants: tenantsWithOverrides,
  })
}
