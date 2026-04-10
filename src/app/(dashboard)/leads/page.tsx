'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Phone, MessageCircle, Check, Clock, MapPin, User, Mail, Inbox } from 'lucide-react'

type TrialRequest = {
  id: string
  name: string
  phone: string
  governorate: string | null
  generator_count: number
  subscriber_count: number | null
  plan_interest: string | null
  billing_period: string | null
  notes: string | null
  source: string
  status: string
  contacted_at: string | null
  created_at: string
}

type ContactInquiry = {
  id: string
  name: string
  phone: string
  email: string | null
  governorate: string | null
  inquiry_type: string
  message: string
  status: string
  responded_at: string | null
  created_at: string
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter (مجاني)',
  pro: 'Pro (20K)',
  business: 'Business (35K) ⭐',
  corporate: 'Corporate (50K)',
  fleet: 'Fleet (مخصص)',
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'شهري',
  quarterly: '3 شهور',
  biannual: '6 شهور',
  annual: 'سنوي',
}

const INQUIRY_LABELS: Record<string, string> = {
  general: 'استفسار عام',
  sales: 'مبيعات',
  demo: 'عرض توضيحي',
  support: 'دعم فني',
  partnership: 'شراكة',
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  new:        { bg: '#FEF3C7', color: '#92400E', label: 'جديد' },
  contacted:  { bg: '#DBEAFE', color: '#1E40AF', label: 'تم التواصل' },
  converted:  { bg: '#D1FAE5', color: '#065F46', label: 'محوّل' },
  closed:     { bg: '#F3F4F6', color: '#6B7280', label: 'مغلق' },
  responded:  { bg: '#D1FAE5', color: '#065F46', label: 'تم الرد' },
}

export default function LeadsPage() {
  const [tab, setTab] = useState<'trials' | 'inquiries'>('trials')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const d = await res.json()
      setData(d)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (type: 'trial' | 'inquiry', id: string, status: string) => {
    await fetch(`/api/leads/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const ago = (iso: string) => {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'الآن'
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)}د`
    if (diff < 86400000) return `قبل ${Math.floor(diff / 3600000)}س`
    return `قبل ${Math.floor(diff / 86400000)}ي`
  }

  const filtered = data ? (
    tab === 'trials'
      ? (data.trial_requests as TrialRequest[]).filter(t => filter === 'all' || t.status === filter)
      : (data.contact_inquiries as ContactInquiry[]).filter(i => filter === 'all' || i.status === filter)
  ) : []

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📥 صندوق العملاء المحتملين</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        كل طلبات التجربة والاستفسارات من موقع amper.com تأتي هنا
      </p>

      {/* Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard icon={<Inbox size={20} />} label="بانتظار الرد" value={data.summary.total_pending} color="#DC2626" />
          <StatCard icon={<Clock size={20} />} label="تجارب جديدة (30 يوم)" value={data.summary.trials_30d} color="#2563EB" />
          <StatCard icon={<MessageCircle size={20} />} label="استفسارات (30 يوم)" value={data.summary.inquiries_30d} color="#7C3AED" />
          <StatCard icon={<Check size={20} />} label="إجمالي" value={data.trial_requests.length + data.contact_inquiries.length} color="#16A34A" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setTab('trials'); setFilter('all') }}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: tab === 'trials' ? '#2563EB' : 'var(--bg-elevated)',
            color: tab === 'trials' ? 'white' : 'var(--text-primary)',
            fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>
          🚀 طلبات التجربة ({data?.trial_requests?.length ?? 0})
        </button>
        <button onClick={() => { setTab('inquiries'); setFilter('all') }}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: tab === 'inquiries' ? '#2563EB' : 'var(--bg-elevated)',
            color: tab === 'inquiries' ? 'white' : 'var(--text-primary)',
            fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>
          💬 استفسارات ({data?.contact_inquiries?.length ?? 0})
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'new', 'contacted', 'converted'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none',
              background: filter === f ? '#0F172A' : 'var(--bg-elevated)',
              color: filter === f ? 'white' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            }}>
            {f === 'all' ? 'الكل' : (STATUS_COLORS[f]?.label ?? f)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Inbox size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>لا توجد سجلات</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'trials'
            ? (filtered as TrialRequest[]).map(t => (
                <TrialCard key={t.id} t={t} ago={ago(t.created_at)} onUpdate={(s) => updateStatus('trial', t.id, s)} />
              ))
            : (filtered as ContactInquiry[]).map(i => (
                <InquiryCard key={i.id} i={i} ago={ago(i.created_at)} onUpdate={(s) => updateStatus('inquiry', i.id, s)} />
              ))
          }
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12, border: `1px solid ${color}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
    </div>
  )
}

function TrialCard({ t, ago, onUpdate }: { t: TrialRequest; ago: string; onUpdate: (s: string) => void }) {
  const status = STATUS_COLORS[t.status] ?? STATUS_COLORS.new
  return (
    <div style={{
      background: 'var(--bg-elevated)', padding: 16, borderRadius: 12,
      borderRight: `4px solid ${status.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <User size={16} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: 12, background: status.bg, color: status.color, fontSize: 10, fontWeight: 700 }}>
              {status.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <span><Phone size={11} style={{ display: 'inline', marginLeft: 4 }} />{t.phone}</span>
            {t.governorate && <span><MapPin size={11} style={{ display: 'inline', marginLeft: 4 }} />{t.governorate}</span>}
            <span>{ago}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <Detail label="مولدات" value={String(t.generator_count)} />
        <Detail label="مشتركون" value={t.subscriber_count ? String(t.subscriber_count) : '—'} />
        <Detail label="باقة مهتم" value={t.plan_interest ? PLAN_LABELS[t.plan_interest] ?? t.plan_interest : '—'} />
        <Detail label="فترة الدفع" value={t.billing_period ? PERIOD_LABELS[t.billing_period] ?? t.billing_period : '—'} />
      </div>

      {t.notes && (
        <div style={{ background: 'var(--bg-card, #1A1F2E)', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          💬 {t.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://wa.me/${t.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً ${t.name}، بخصوص طلب التجربة على أمبير`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ padding: '8px 14px', borderRadius: 8, background: '#22C55E', color: 'white', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
          <MessageCircle size={12} style={{ display: 'inline', marginLeft: 4 }} /> راسل واتساب
        </a>
        {t.status !== 'contacted' && (
          <button onClick={() => onUpdate('contacted')}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#2563EB', color: 'white', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✓ تم التواصل
          </button>
        )}
        {t.status !== 'converted' && (
          <button onClick={() => onUpdate('converted')}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#16A34A', color: 'white', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            🎉 محوّل لعميل
          </button>
        )}
        {t.status !== 'closed' && (
          <button onClick={() => onUpdate('closed')}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--bg-card, #1A1F2E)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            إغلاق
          </button>
        )}
      </div>
    </div>
  )
}

function InquiryCard({ i, ago, onUpdate }: { i: ContactInquiry; ago: string; onUpdate: (s: string) => void }) {
  const status = STATUS_COLORS[i.status] ?? STATUS_COLORS.new
  return (
    <div style={{
      background: 'var(--bg-elevated)', padding: 16, borderRadius: 12,
      borderRight: `4px solid ${status.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <User size={16} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>{i.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: 12, background: status.bg, color: status.color, fontSize: 10, fontWeight: 700 }}>
              {status.label}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(124,58,237,0.15)', color: '#7C3AED', fontSize: 10, fontWeight: 700 }}>
              {INQUIRY_LABELS[i.inquiry_type] ?? i.inquiry_type}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <span><Phone size={11} style={{ display: 'inline', marginLeft: 4 }} />{i.phone}</span>
            {i.email && <span><Mail size={11} style={{ display: 'inline', marginLeft: 4 }} />{i.email}</span>}
            {i.governorate && <span><MapPin size={11} style={{ display: 'inline', marginLeft: 4 }} />{i.governorate}</span>}
            <span>{ago}</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card, #1A1F2E)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, lineHeight: 1.7 }}>
        💬 {i.message}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://wa.me/${i.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً ${i.name}، بخصوص استفسارك`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ padding: '8px 14px', borderRadius: 8, background: '#22C55E', color: 'white', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
          <MessageCircle size={12} style={{ display: 'inline', marginLeft: 4 }} /> راسل واتساب
        </a>
        {i.status !== 'responded' && (
          <button onClick={() => onUpdate('responded')}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#16A34A', color: 'white', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✓ تم الرد
          </button>
        )}
        {i.status !== 'closed' && (
          <button onClick={() => onUpdate('closed')}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--bg-card, #1A1F2E)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            إغلاق
          </button>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-card, #1A1F2E)', padding: 8, borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
