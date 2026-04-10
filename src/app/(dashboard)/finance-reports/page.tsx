'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

type Tab = {
  key: string
  label: string
  endpoint: string
  color: string
}

const TABS: Tab[] = [
  { key: 'mrr',                label: '💵 MRR والإيرادات',     endpoint: '/api/reports/mrr',              color: '#16A34A' },
  { key: 'growth-churn',       label: '📈 النمو والخسارة',     endpoint: '/api/reports/growth-churn',     color: '#2563EB' },
  { key: 'trial-conversion',   label: '🎯 معدل تحويل التجارب',  endpoint: '/api/reports/trial-conversion', color: '#F59E0B' },
  { key: 'upgrade-funnel',     label: '⬆️ قمع الترقيات',       endpoint: '/api/reports/upgrade-funnel',   color: '#7C3AED' },
  { key: 'feature-adoption',   label: '📊 استخدام الميزات',    endpoint: '/api/reports/feature-adoption', color: '#0891B2' },
  { key: 'a-la-carte',         label: '🛒 الميزات المدفوعة',   endpoint: '/api/reports/a-la-carte',       color: '#DB2777' },
  { key: 'iot-activity',       label: '📡 نشاط IoT',           endpoint: '/api/reports/iot-activity',     color: '#0EA5E9' },
  { key: 'partnership-usage',  label: '👥 نظام الشركاء',       endpoint: '/api/reports/partnership-usage',color: '#6366F1' },
  { key: 'geo-usage',          label: '🗺️ التوزيع الجغرافي',   endpoint: '/api/reports/geo-usage',        color: '#10B981' },
  { key: 'late-payments',      label: '⚠️ المتأخرون',          endpoint: '/api/reports/late-payments',    color: '#DC2626' },
]

function fmt(n: number) { return n.toLocaleString('ar-IQ') }

export default function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const tab = TABS.find(t => t.key === activeTab)!
    fetch(tab.endpoint)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData({ error: 'فشل التحميل' }))
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📊 التقارير المالية المتقدمة</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        مؤشرات حيوية لأداء شركة Amper
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === t.key ? t.color : 'var(--bg-elevated)',
              color: activeTab === t.key ? 'white' : 'var(--text-primary)',
              fontWeight: activeTab === t.key ? 700 : 500,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 24, minHeight: 400 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>جاري التحميل...</div>
        ) : data?.error ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#DC2626' }}>{data.error}</div>
        ) : (
          <ReportContent tabKey={activeTab} data={data} />
        )}
      </div>
    </div>
  )
}

function ReportContent({ tabKey, data }: { tabKey: string; data: any }) {
  if (!data) return null
  switch (tabKey) {
    case 'mrr': return <MRRReport data={data} />
    case 'growth-churn': return <GrowthChurnReport data={data} />
    case 'trial-conversion': return <TrialReport data={data} />
    case 'upgrade-funnel': return <UpgradeFunnelReport data={data} />
    case 'feature-adoption': return <FeatureAdoptionReport data={data} />
    case 'a-la-carte': return <AlaCarteReport data={data} />
    case 'iot-activity': return <IotActivityReport data={data} />
    case 'partnership-usage': return <PartnershipUsageReport data={data} />
    case 'geo-usage': return <GeoUsageReport data={data} />
    case 'late-payments': return <LatePaymentsReport data={data} />
    default: return null
  }
}

function StatCard({ label, value, color = '#2563EB', unit = '' }: any) {
  return (
    <div style={{ background: 'var(--bg-card, #1A1F2E)', padding: 16, borderRadius: 12, border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>
        {value} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  )
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>{children}</div>
}

function MRRReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="💵 MRR" value={fmt(data.total_mrr)} unit="د.ع/شهر" color="#16A34A" />
        <StatCard label="📊 ARR" value={fmt(data.total_arr)} unit="د.ع/سنة" color="#10B981" />
        <StatCard label="عملاء نشطون" value={data.active_tenants} color="#2563EB" />
        <StatCard label="متوسط لكل عميل" value={fmt(Math.round(data.avg_revenue_per_tenant))} unit="د.ع" color="#7C3AED" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>التوزيع حسب الباقة</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {Object.entries(data.by_plan as Record<string, number>).map(([plan, count]) => (
          <div key={plan} style={{ background: 'var(--bg-card, #1A1F2E)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{plan}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{count}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function GrowthChurnReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="إجمالي نشط" value={data.total_active} color="#16A34A" />
        <StatCard label="جدد هذا الشهر" value={data.new_this_month} color="#2563EB" />
        <StatCard label="ألغوا الاشتراك" value={data.deactivated_this_month} color="#DC2626" />
        <StatCard label="صافي النمو" value={data.net_new} color="#7C3AED" />
      </StatGrid>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard label="معدل النمو" value={data.growth_rate_pct.toFixed(1)} unit="%" color="#16A34A" />
        <StatCard label="معدل الـ Churn" value={data.churn_rate_pct.toFixed(1)} unit="%"
          color={data.health_status === 'excellent' ? '#16A34A' : data.health_status === 'good' ? '#F59E0B' : '#DC2626'} />
      </div>
    </>
  )
}

function TrialReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="تجارب بدأت" value={data.total_trials_started} color="#F59E0B" />
        <StatCard label="نشطة الآن" value={data.active_trials} color="#2563EB" />
        <StatCard label="تحوّلت لمدفوع" value={data.converted} color="#16A34A" />
        <StatCard label="معدل التحويل" value={data.conversion_rate_pct.toFixed(0)} unit="%" color="#7C3AED" />
      </StatGrid>
      <div style={{ padding: 16, background: 'rgba(59,130,246,0.1)', borderRadius: 12, marginTop: 12 }}>
        💡 {data.benchmark}
      </div>
    </>
  )
}

function UpgradeFunnelReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="ترقيات (90 يوم)" value={data.total_upgrades} color="#16A34A" />
        <StatCard label="تخفيضات" value={data.total_downgrades} color="#DC2626" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>أكثر مسارات الترقية</h3>
      {data.upgrade_paths.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: 'var(--bg-card, #1A1F2E)', borderRadius: 8, marginBottom: 6 }}>
          <span>{p.path}</span>
          <strong>{p.count}</strong>
        </div>
      ))}
    </>
  )
}

function FeatureAdoptionReport({ data }: any) {
  return (
    <>
      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
        إجمالي العملاء النشطين: <strong>{data.total_active_tenants}</strong>
      </div>
      {data.features.map((f: any) => (
        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-card, #1A1F2E)', borderRadius: 8, marginBottom: 8 }}>
          <span style={{ flex: 1 }}>{f.label}</span>
          {f.active !== undefined && <span style={{ fontSize: 11, color: '#16A34A' }}>{f.active} نشط</span>}
          <strong style={{ fontSize: 18 }}>{f.count}</strong>
        </div>
      ))}
    </>
  )
}

function AlaCarteReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="عملاء بميزات إضافية" value={data.total_tenants_with_overrides} color="#DB2777" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>الميزات الأكثر طلباً</h3>
      {data.feature_demand.map((f: any) => (
        <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card, #1A1F2E)', borderRadius: 8, marginBottom: 8 }}>
          <span>{f.label}</span>
          <strong>{f.count} عميل</strong>
        </div>
      ))}
    </>
  )
}

function IotActivityReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="أجهزة" value={data.total_devices} color="#0EA5E9" />
        <StatCard label="متصلة الآن" value={`${data.online_devices} (${data.online_pct}%)`} color="#16A34A" />
        <StatCard label="Telemetry/24س" value={fmt(data.telemetry_24h)} color="#2563EB" />
        <StatCard label="تنبيهات/24س" value={data.alerts_24h} color="#DC2626" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>أعلى العملاء بالأجهزة</h3>
      {data.top_tenants.map((t: any) => (
        <div key={t.tenant_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: 'var(--bg-card, #1A1F2E)', borderRadius: 8, marginBottom: 6 }}>
          <span>{t.tenant_name}</span>
          <strong>{t.device_count} جهاز</strong>
        </div>
      ))}
    </>
  )
}

function PartnershipUsageReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="عملاء يستخدمون" value={data.tenants_using_partners} color="#6366F1" />
        <StatCard label="إجمالي شركاء" value={data.total_partners} color="#7C3AED" />
        <StatCard label="توزيعات" value={data.total_distributions} color="#16A34A" />
        <StatCard label="موزّع كأرباح" value={fmt(data.total_distributed_iqd)} unit="د.ع" color="#10B981" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>أعلى العملاء</h3>
      {data.top_tenants.map((t: any) => (
        <div key={t.tenant_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: 'var(--bg-card, #1A1F2E)', borderRadius: 8, marginBottom: 6 }}>
          <span>{t.tenant_name}</span>
          <strong>{t.partners_count} شركاء</strong>
        </div>
      ))}
    </>
  )
}

function GeoUsageReport({ data }: any) {
  return (
    <>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>التوزيع حسب المحافظة</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {data.governorates.map((g: any) => (
          <div key={g.name} style={{ padding: 14, background: 'var(--bg-card, #1A1F2E)', borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>📍 {g.name}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span><strong>{g.tenants}</strong> عميل</span>
              <span><strong>{g.branches}</strong> فرع</span>
              <span><strong>{g.subscribers}</strong> مشترك</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function LatePaymentsReport({ data }: any) {
  return (
    <>
      <StatGrid>
        <StatCard label="إجمالي متأخرين" value={data.summary.total_late} color="#DC2626" />
        <StatCard label="حالات حرجة (>30 يوم)" value={data.summary.critical_count} color="#7F1D1D" />
        <StatCard label="إجمالي مستحق" value={fmt(data.summary.total_owed_iqd)} unit="د.ع" color="#F59E0B" />
      </StatGrid>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>قائمة المتأخرين</h3>
      {data.tenants.map((t: any) => (
        <div key={t.id} style={{
          padding: 14, background: 'var(--bg-card, #1A1F2E)', borderRadius: 10, marginBottom: 8,
          borderRight: `4px solid ${t.severity === 'critical' ? '#7F1D1D' : t.severity === 'high' ? '#DC2626' : '#F59E0B'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.owner_name} · {t.phone}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#DC2626' }}>{fmt(t.owed_amount)} د.ع</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>متأخر {t.days_late} يوم</div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
