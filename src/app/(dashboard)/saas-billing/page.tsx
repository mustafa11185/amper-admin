"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Users, Sparkles, Clock, AlertTriangle, XCircle, CheckCircle2,
  Search, Loader2, Plus, RefreshCw, DollarSign, CreditCard, Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

type Stats = {
  counts: { active: number; trial: number; grace: number; suspended: number; total_tenants: number };
  revenue: { mrr: number; arr: number; last_30_days: number; last_30_days_invoice_count: number; all_time: number; all_time_invoice_count: number };
  failures: { last_30_days: number };
  plans: Array<{ id: string; name_ar: string; price_monthly: number }>;
};

type Subscription = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  plan: string;
  plan_name_ar: string;
  plan_price_monthly: number | null;
  status: 'active' | 'trial' | 'grace' | 'suspended';
  is_trial: boolean;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  grace_period_ends_at: string | null;
  auto_renew_enabled: boolean;
  days_remaining: number | null;
  lifetime_revenue: number;
  paid_invoice_count: number;
  last_paid_at: string | null;
};

type Payment = {
  id: string;
  tenant: { id: string; name: string; phone: string; plan: string } | null;
  invoice_number: string | null | undefined;
  invoice_id: string | undefined;
  period_months: number | undefined;
  gateway: string;
  gateway_txn_id: string | null;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  is_auto_renewal: boolean;
  initiated_at: string;
  completed_at: string | null;
};

type StatusFilter = 'all' | 'active' | 'trial' | 'grace' | 'suspended';
type Tab = 'overview' | 'analytics' | 'subscriptions' | 'payments' | 'plans';

type Analytics = {
  series: { months: string[]; revenue: number[]; signups: number[]; churn: number[] };
  current: {
    mrr: number; arr: number; arpu: number;
    churn_rate_pct: number; growth_pct: number | null;
    this_month_signups: number; this_month_churn: number;
  };
  plan_distribution: Array<{ id: string; name_ar: string; tenant_count: number; mrr_contribution: number }>;
};

type FullPlan = {
  id: string;
  name_en: string;
  name_ar: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  price_monthly: number;
  price_3m: number;
  price_6m: number;
  price_12m: number;
  generator_limit: number;
  subscriber_limit: number;
  staff_limit: number;
  has_iot: boolean;
  has_ai: boolean;
  has_subscriber_app: boolean;
  has_api: boolean;
  has_multi_branch: boolean;
  has_priority_support: boolean;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

const STATUS_LABEL: Record<Subscription['status'], string> = {
  active: 'فعّال',
  trial: 'تجريبي',
  grace: 'فترة سماح',
  suspended: 'موقوف',
};

const STATUS_COLOR: Record<Subscription['status'], string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-violet-100 text-violet-700 border-violet-200',
  grace: 'bg-amber-100 text-amber-700 border-amber-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  initiated: 'bg-blue-100 text-blue-700',
};

export default function SaasBillingPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [extendModalSub, setExtendModalSub] = useState<Subscription | null>(null);
  const [fullPlans, setFullPlans] = useState<FullPlan[]>([]);
  const [editPlan, setEditPlan] = useState<FullPlan | null>(null);
  const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/saas-billing/stats');
      const d = await r.json();
      if (r.ok) setStats(d);
    } catch (e) { console.error(e); }
  }, []);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const r = await fetch(`/api/saas-billing/subscriptions?${params}`);
      const d = await r.json();
      if (r.ok) setSubs(d.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, search]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paymentFilter !== 'all') params.set('status', paymentFilter);
      const r = await fetch(`/api/saas-billing/payments?${params}`);
      const d = await r.json();
      if (r.ok) setPayments(d.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [paymentFilter]);

  const loadFullPlans = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/saas-billing/plans');
      const d = await r.json();
      if (r.ok) setFullPlans(d.plans);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/saas-billing/analytics');
      const d = await r.json();
      if (r.ok) setAnalytics(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'subscriptions') loadSubs(); }, [tab, loadSubs]);
  useEffect(() => { if (tab === 'payments') loadPayments(); }, [tab, loadPayments]);
  useEffect(() => { if (tab === 'plans') loadFullPlans(); }, [tab, loadFullPlans]);
  useEffect(() => { if (tab === 'analytics') loadAnalytics(); }, [tab, loadAnalytics]);

  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الاشتراكات</h1>
          <p className="text-sm text-gray-500 mt-1">SaaS subscription billing — اشتراكات Amper نفسها</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnboard(true)}
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            ➕ إضافة عميل
          </button>
          <a
            href="/saas-billing/credentials"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            🔐 حسابات الدفع
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { id: 'overview' as Tab, label: '📊 نظرة عامة' },
          { id: 'analytics' as Tab, label: '📈 التحليلات' },
          { id: 'subscriptions' as Tab, label: '👥 الاشتراكات' },
          { id: 'payments' as Tab, label: '💳 المدفوعات' },
          { id: 'plans' as Tab, label: '📦 الباقات' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Revenue cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="MRR" value={fmt(stats.revenue.mrr)} suffix="د.ع" icon={TrendingUp} color="blue" />
            <Card label="ARR" value={fmt(stats.revenue.arr)} suffix="د.ع" icon={DollarSign} color="violet" />
            <Card label="آخر 30 يوم" value={fmt(stats.revenue.last_30_days)} suffix={`د.ع · ${stats.revenue.last_30_days_invoice_count} فاتورة`} icon={Calendar} color="green" />
            <Card label="مدفوعات فاشلة (30 يوم)" value={fmt(stats.failures.last_30_days)} suffix="" icon={AlertTriangle} color={stats.failures.last_30_days > 0 ? 'red' : 'gray'} />
          </div>

          {/* Subscription counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card label="إجمالي العملاء" value={fmt(stats.counts.total_tenants)} icon={Users} color="gray" />
            <Card label="فعّال" value={fmt(stats.counts.active)} icon={CheckCircle2} color="green" />
            <Card label="تجريبي" value={fmt(stats.counts.trial)} icon={Sparkles} color="violet" />
            <Card label="فترة سماح" value={fmt(stats.counts.grace)} icon={Clock} color="amber" />
            <Card label="موقوف" value={fmt(stats.counts.suspended)} icon={XCircle} color="red" />
          </div>

          {/* All-time */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4 text-gray-900">إجمالي تاريخي</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-gray-500 mb-1">إجمالي الإيرادات (كل الزمن)</div>
                <div className="text-3xl font-bold text-gray-900">{fmt(stats.revenue.all_time)} <span className="text-base text-gray-500">د.ع</span></div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">إجمالي الفواتير المدفوعة</div>
                <div className="text-3xl font-bold text-gray-900">{fmt(stats.revenue.all_time_invoice_count)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <AnalyticsView data={analytics} loading={loading} />
      )}

      {/* Subscriptions */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث: اسم، هاتف، صاحب…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadSubs()}
                className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">كل الحالات</option>
              <option value="active">فعّال</option>
              <option value="trial">تجريبي</option>
              <option value="grace">فترة سماح</option>
              <option value="suspended">موقوف</option>
            </select>
            <button onClick={loadSubs} className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 inline ml-1" /> تحديث
            </button>
          </div>

          <div className="bg-white rounded-2xl border overflow-x-auto">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : subs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">لا توجد اشتراكات تطابق هذه المعايير</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">العميل</th>
                    <th className="text-right px-4 py-3 font-medium">الباقة</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">الانتهاء</th>
                    <th className="text-right px-4 py-3 font-medium">إجمالي</th>
                    <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => setDetailTenantId(s.id)}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.owner_name} · {s.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.plan_name_ar}</div>
                        {s.plan_price_monthly && <div className="text-xs text-gray-500">{fmt(s.plan_price_monthly)} د.ع/شهر</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[s.status]}`}>
                          {STATUS_LABEL[s.status]}
                        </span>
                        {s.auto_renew_enabled && <div className="text-[10px] text-gray-400 mt-1">تجديد تلقائي ✓</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.subscription_ends_at ? (
                          <>
                            <div>{new Date(s.subscription_ends_at).toLocaleDateString('ar-IQ')}</div>
                            {s.days_remaining !== null && (
                              <div className={`${s.days_remaining < 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                                {s.days_remaining} يوم
                              </div>
                            )}
                          </>
                        ) : s.is_trial && s.trial_ends_at ? (
                          <div className="text-violet-600">تجربة · {new Date(s.trial_ends_at).toLocaleDateString('ar-IQ')}</div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div>{fmt(s.lifetime_revenue)}</div>
                        <div className="text-[10px] text-gray-400">{s.paid_invoice_count} فاتورة</div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setExtendModalSub(s)}
                          className="text-xs text-blue-600 hover:underline ml-2"
                        >تمديد</button>
                        <button
                          onClick={() => setDetailTenantId(s.id)}
                          className="text-xs text-gray-600 hover:underline"
                        >تفاصيل</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">كل الحالات</option>
              <option value="succeeded">ناجح</option>
              <option value="failed">فاشل</option>
              <option value="pending">قيد المعالجة</option>
              <option value="refunded">مرتجع</option>
            </select>
            <button onClick={loadPayments} className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 inline ml-1" /> تحديث
            </button>
          </div>

          <div className="bg-white rounded-2xl border overflow-x-auto">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-gray-400">لا توجد مدفوعات</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium">العميل</th>
                    <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-3 font-medium">البوابة</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">السبب</th>
                    <th className="text-right px-4 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">
                        <div>{new Date(p.initiated_at).toLocaleDateString('ar-IQ')}</div>
                        <div className="text-gray-400">{new Date(p.initiated_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3">
                        {p.tenant ? (
                          <>
                            <div className="font-medium">{p.tenant.name}</div>
                            <div className="text-xs text-gray-500">{p.tenant.phone}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{fmt(p.amount)} <span className="text-xs text-gray-500">{p.currency}</span></td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium">{p.gateway.replace('_', ' ')}</div>
                        {p.is_auto_renewal && <div className="text-[10px] text-blue-500">تلقائي</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${PAYMENT_STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={p.failure_reason || ''}>
                        {p.failure_reason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'succeeded' && (
                          <button
                            onClick={() => setRefundPaymentId(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >استرداد</button>
                        )}
                        {p.tenant && (
                          <button
                            onClick={() => setDetailTenantId(p.tenant!.id)}
                            className="text-xs text-gray-500 hover:underline mr-2"
                          >تفاصيل</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Plans (read-only summary; full editor coming) */}
      {tab === 'plans' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>تعديل أي سعر يطغى فوراً على كل واجهات الدفع (landing /pricing, signup, manager-app, /api/plans). تغييرات الميزات تأخذ مفعول للاشتراكات الجديدة.</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fullPlans.map((p) => (
                <PlanCard key={p.id} plan={p} onEdit={() => setEditPlan(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extend Modal */}
      {extendModalSub && (
        <ExtendModal
          sub={extendModalSub}
          onClose={() => setExtendModalSub(null)}
          onSuccess={() => { setExtendModalSub(null); loadSubs(); loadStats(); }}
        />
      )}

      {/* Edit Plan Modal */}
      {editPlan && (
        <EditPlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => { setEditPlan(null); loadFullPlans(); loadStats(); }}
        />
      )}

      {/* Detail Drawer */}
      {detailTenantId && (
        <DetailDrawer
          tenantId={detailTenantId}
          onClose={() => setDetailTenantId(null)}
          onAction={() => { loadSubs(); loadPayments(); loadStats(); }}
          onRefund={(paymentId) => setRefundPaymentId(paymentId)}
          onExtend={(s) => setExtendModalSub(s)}
        />
      )}

      {/* Refund Modal */}
      {refundPaymentId && (
        <RefundModal
          paymentId={refundPaymentId}
          onClose={() => setRefundPaymentId(null)}
          onSuccess={() => { setRefundPaymentId(null); loadPayments(); loadStats(); }}
        />
      )}

      {/* Onboard Wizard */}
      {showOnboard && (
        <OnboardWizard
          plans={fullPlans.length > 0 ? fullPlans : (stats?.plans || []).map((p) => ({
            id: p.id, name_ar: p.name_ar, name_en: p.name_ar, tagline_ar: null, tagline_en: null,
            price_monthly: p.price_monthly, price_3m: 0, price_6m: 0, price_12m: 0,
            generator_limit: 0, subscriber_limit: 0, staff_limit: 0,
            has_iot: false, has_ai: false, has_subscriber_app: false, has_api: false,
            has_multi_branch: false, has_priority_support: false,
            is_active: true, is_popular: false, sort_order: 0,
          }))}
          onClose={() => setShowOnboard(false)}
          onSuccess={() => { setShowOnboard(false); loadStats(); loadSubs(); }}
        />
      )}
    </div>
  );
}

function Card({
  label, value, suffix, icon: Icon, color,
}: { label: string; value: string; suffix?: string; icon: React.ElementType; color: 'blue' | 'green' | 'violet' | 'amber' | 'red' | 'gray' }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {suffix && <div className="text-xs text-gray-500 mt-1">{suffix}</div>}
    </div>
  );
}

function ExtendModal({ sub, onClose, onSuccess }: { sub: Subscription; onClose: () => void; onSuccess: () => void }) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast.error('السبب مطلوب');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/saas-billing/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: sub.id, days, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'EXTEND_FAILED');
      toast.success(`تم تمديد ${sub.name} لمدة ${days} يوم`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل التمديد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">تمديد اشتراك {sub.name}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">عدد الأيام</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            />
            <div className="flex gap-1 mt-2">
              {[7, 14, 30, 90].map((d) => (
                <button key={d} onClick={() => setDays(d)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">{d} يوم</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">السبب (مطلوب — للسجل)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="مثلاً: تعويض عن انقطاع، VIP، شكوى عميل..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            <button onClick={submit} disabled={submitting} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد التمديد'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLAN_EMOJI: Record<string, string> = {
  starter: '⚡', pro: '🚀', business: '👑', corporate: '🏢', fleet: '🏭',
};

function PlanCard({ plan, onEdit }: { plan: FullPlan; onEdit: () => void }) {
  const fmt = (n: number) => n.toLocaleString('en-US');
  const isFree = plan.price_monthly === 0;
  const features = [
    { key: 'has_iot', label: 'IoT', enabled: plan.has_iot },
    { key: 'has_ai', label: 'AI', enabled: plan.has_ai },
    { key: 'has_subscriber_app', label: 'تطبيق المشترك', enabled: plan.has_subscriber_app },
    { key: 'has_multi_branch', label: 'فروع متعددة', enabled: plan.has_multi_branch },
    { key: 'has_priority_support', label: 'دعم أولوية', enabled: plan.has_priority_support },
    { key: 'has_api', label: 'API', enabled: plan.has_api },
  ];
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col ${plan.is_popular ? 'ring-2 ring-amber-400' : ''} ${!plan.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">{plan.id}</div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>{PLAN_EMOJI[plan.id] || '📦'}</span>
            <span>{plan.name_ar}</span>
            {plan.is_popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ مميزة</span>}
          </h3>
        </div>
        <button onClick={onEdit} className="text-blue-600 hover:underline text-sm">تعديل</button>
      </div>

      <div className="mb-3">
        {isFree ? (
          <span className="text-2xl font-bold text-gray-400">{plan.id === 'fleet' ? 'مخصص' : 'مجاني'}</span>
        ) : (
          <>
            <span className="text-2xl font-bold">{fmt(plan.price_monthly)}</span>
            <span className="text-sm text-gray-500 mr-1">د.ع/شهر</span>
          </>
        )}
      </div>

      {!isFree && (
        <div className="grid grid-cols-3 gap-1 text-xs mb-3 text-center">
          <div className="bg-gray-50 rounded p-2"><div className="text-gray-400">3شهر</div><div className="font-semibold">{fmt(plan.price_3m)}</div></div>
          <div className="bg-gray-50 rounded p-2"><div className="text-gray-400">6شهر</div><div className="font-semibold">{fmt(plan.price_6m)}</div></div>
          <div className="bg-gray-50 rounded p-2"><div className="text-gray-400">سنوي</div><div className="font-semibold">{fmt(plan.price_12m)}</div></div>
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-1 mb-3 flex-1">
        <div>⚙️ {plan.generator_limit === -1 ? 'مولدات غير محدودة' : `${plan.generator_limit} مولدة`} · {plan.subscriber_limit === -1 ? 'مشتركين غير محدود' : `${plan.subscriber_limit} مشترك`}</div>
        <div className="flex flex-wrap gap-1 mt-2">
          {features.map((f) => (
            <span key={f.key} className={`px-2 py-0.5 rounded text-[10px] ${f.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400 line-through'}`}>
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {!plan.is_active && <div className="text-xs text-red-600 mt-2">🔴 معطّلة</div>}
    </div>
  );
}

function EditPlanModal({
  plan, onClose, onSaved,
}: { plan: FullPlan; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FullPlan>({ ...plan });
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FullPlan>(k: K, v: FullPlan[K]) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch('/api/saas-billing/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error || 'فشل الحفظ');
        setSubmitting(false);
        return;
      }
      toast.success('تم الحفظ ✓');
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('فشل الاتصال');
      setSubmitting(false);
    }
  };

  // Auto-recompute period prices when monthly changes
  const autoRecompute = (monthly: number) => {
    setForm({
      ...form,
      price_monthly: monthly,
      price_3m: monthly * 3,
      price_6m: Math.round(monthly * 6 * 0.95),
      price_12m: Math.round(monthly * 12 * 0.85),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{PLAN_EMOJI[plan.id] || '📦'} تعديل {plan.name_ar}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">الاسم بالعربي</label>
              <input value={form.name_ar} onChange={(e) => setField('name_ar', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">English Name</label>
              <input value={form.name_en} onChange={(e) => setField('name_en', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">الوصف القصير (Tagline)</label>
            <input value={form.tagline_ar ?? ''} onChange={(e) => setField('tagline_ar', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Pricing */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">الأسعار</h3>
              <button onClick={() => autoRecompute(form.price_monthly)} className="text-xs text-blue-600 hover:underline">
                ⟳ إعادة حساب 3/6/12 من الشهري (-5%/-15%)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PriceField label="شهري" value={form.price_monthly} onChange={(v) => setField('price_monthly', v)} />
              <PriceField label="3 أشهر" value={form.price_3m} onChange={(v) => setField('price_3m', v)} />
              <PriceField label="6 أشهر" value={form.price_6m} onChange={(v) => setField('price_6m', v)} />
              <PriceField label="12 شهر" value={form.price_12m} onChange={(v) => setField('price_12m', v)} />
            </div>
          </div>

          {/* Limits */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3">الحدود (-1 = غير محدود)</h3>
            <div className="grid grid-cols-3 gap-3">
              <PriceField label="مولدات" value={form.generator_limit} onChange={(v) => setField('generator_limit', v)} allowNegative />
              <PriceField label="مشتركين" value={form.subscriber_limit} onChange={(v) => setField('subscriber_limit', v)} allowNegative />
              <PriceField label="موظفين" value={form.staff_limit} onChange={(v) => setField('staff_limit', v)} allowNegative />
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-bold text-sm mb-2">الميزات</h3>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="IoT (DSE 5110)" checked={form.has_iot} onChange={(v) => setField('has_iot', v)} />
              <Toggle label="مساعد AI" checked={form.has_ai} onChange={(v) => setField('has_ai', v)} />
              <Toggle label="تطبيق المشترك" checked={form.has_subscriber_app} onChange={(v) => setField('has_subscriber_app', v)} />
              <Toggle label="فروع متعددة" checked={form.has_multi_branch} onChange={(v) => setField('has_multi_branch', v)} />
              <Toggle label="API" checked={form.has_api} onChange={(v) => setField('has_api', v)} />
              <Toggle label="دعم أولوية" checked={form.has_priority_support} onChange={(v) => setField('has_priority_support', v)} />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Toggle label="مفعّلة" checked={form.is_active} onChange={(v) => setField('is_active', v)} />
            <Toggle label="⭐ مميزة (الأكثر شيوعاً)" checked={form.is_popular} onChange={(v) => setField('is_popular', v)} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceField({ label, value, onChange, allowNegative }: {
  label: string; value: number; onChange: (v: number) => void; allowNegative?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        min={allowNegative ? -1 : 0}
        value={value}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
        className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
        dir="ltr"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
      <span>{label}</span>
    </label>
  );
}

// ─── DETAIL DRAWER ────────────────────────────────────────────

type Detail = {
  tenant: {
    id: string; name: string; owner_name: string; phone: string; email: string | null;
    plan: string; is_active: boolean; is_trial: boolean;
    trial_ends_at: string | null; subscription_ends_at: string | null;
    grace_period_ends_at: string | null; is_in_grace_period: boolean;
    auto_renew_enabled: boolean; created_at: string;
  };
  plan: { id: string; name_ar: string; price_monthly: number; generator_limit: number; subscriber_limit: number } | null;
  metrics: {
    lifetime_revenue: number; paid_invoice_count: number; unpaid_invoice_count: number;
    successful_payment_count: number; failed_payment_count: number;
  };
  invoices: Array<{
    id: string; invoice_number: string | null; final_amount: number;
    plan: string; period_months: number; period_start: string; period_end: string;
    is_paid: boolean; paid_at: string | null; created_at: string;
  }>;
  payments: Array<{
    id: string; gateway: string; gateway_txn_id: string | null;
    amount: number; status: string; failure_reason: string | null;
    is_auto_renewal: boolean; initiated_at: string; completed_at: string | null;
  }>;
  events: Array<{ id: string; event_type: string; metadata: unknown; created_at: string }>;
};

const EVENT_LABELS: Record<string, string> = {
  trial_started: '🚀 بدء التجربة',
  trial_converted: '✅ تحويل من تجربة لمدفوع',
  plan_changed: '🔄 تغيير باقة',
  payment_succeeded: '💚 دفع ناجح',
  payment_failed: '❌ فشل دفع',
  auto_renewed: '⚡ تجديد تلقائي',
  cancelled: '🛑 إلغاء',
  reactivated: '♻️ إعادة تفعيل',
  suspended: '⛔ تعليق',
  grace_started: '⚠️ بداية فترة سماح',
  grace_ended: '⏰ نهاية فترة سماح',
};

function DetailDrawer({
  tenantId, onClose, onAction, onRefund, onExtend,
}: {
  tenantId: string;
  onClose: () => void;
  onAction: () => void;
  onRefund: (paymentId: string) => void;
  onExtend: (s: Subscription) => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/saas-billing/subscriptions/${tenantId}`);
      const d = await r.json();
      if (r.ok) setData(d);
      else toast.error(d.error || 'فشل التحميل');
    } catch (err) { console.error(err); toast.error('فشل الاتصال'); }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">تفاصيل الاشتراك</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : !data ? (
          <div className="p-12 text-center text-gray-500">لا توجد بيانات</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Tenant header */}
            <div className="bg-gradient-to-l from-blue-50 to-violet-50 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold">{data.tenant.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{data.tenant.owner_name} · {data.tenant.phone}</p>
                  {data.tenant.email && <p className="text-xs text-gray-500">{data.tenant.email}</p>}
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  data.tenant.is_in_grace_period ? 'bg-amber-100 text-amber-800' :
                  data.tenant.is_trial ? 'bg-violet-100 text-violet-800' :
                  data.tenant.subscription_ends_at && new Date(data.tenant.subscription_ends_at) > new Date() ?
                    'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.tenant.is_in_grace_period ? 'فترة سماح' :
                   data.tenant.is_trial ? 'تجريبي' :
                   data.tenant.subscription_ends_at && new Date(data.tenant.subscription_ends_at) > new Date() ? 'فعّال' : 'موقوف'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <Mini label="الباقة" value={data.plan?.name_ar || data.tenant.plan} />
                <Mini label="الإيرادات" value={`${fmt(data.metrics.lifetime_revenue)} د.ع`} />
                <Mini label="فواتير مدفوعة" value={String(data.metrics.paid_invoice_count)} />
                <Mini label="مدفوعات فاشلة" value={String(data.metrics.failed_payment_count)} highlight={data.metrics.failed_payment_count > 0} />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onExtend({
                    id: data.tenant.id, name: data.tenant.name, owner_name: data.tenant.owner_name,
                    phone: data.tenant.phone, plan: data.tenant.plan, plan_name_ar: data.plan?.name_ar || '',
                    plan_price_monthly: data.plan?.price_monthly ?? null,
                    status: data.tenant.is_trial ? 'trial' : 'active',
                    is_trial: data.tenant.is_trial, trial_ends_at: data.tenant.trial_ends_at,
                    subscription_ends_at: data.tenant.subscription_ends_at,
                    grace_period_ends_at: data.tenant.grace_period_ends_at,
                    auto_renew_enabled: data.tenant.auto_renew_enabled,
                    days_remaining: null, lifetime_revenue: data.metrics.lifetime_revenue,
                    paid_invoice_count: data.metrics.paid_invoice_count, last_paid_at: null,
                  })}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >📅 تمديد</button>
              </div>
            </div>

            {/* Events log */}
            <Section title="📋 سجل الأحداث" count={data.events.length}>
              {data.events.length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {data.events.map((ev) => (
                    <div key={ev.id} className="flex items-start justify-between gap-3 text-sm py-2 border-b last:border-b-0">
                      <div>
                        <div className="font-medium">{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                        {ev.metadata !== null && ev.metadata !== undefined && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {JSON.stringify(ev.metadata).slice(0, 120)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(ev.created_at).toLocaleDateString('ar-IQ')} · {new Date(ev.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Payments */}
            <Section title="💳 المدفوعات" count={data.payments.length}>
              {data.payments.length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-gray-500">{new Date(p.initiated_at).toLocaleDateString('ar-IQ')}</div>
                        <div className="font-semibold">{p.gateway.replace('_', ' ')} · {fmt(p.amount)} د.ع</div>
                        {p.failure_reason && <div className="text-[10px] text-red-600 truncate">{p.failure_reason}</div>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${PAYMENT_STATUS_COLOR[p.status] || 'bg-gray-100'}`}>{p.status}</span>
                      {p.status === 'succeeded' && (
                        <button onClick={() => onRefund(p.id)} className="text-xs text-red-600 hover:underline">استرداد</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Invoices */}
            <Section title="🧾 الفواتير" count={data.invoices.length}>
              {data.invoices.length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {data.invoices.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-gray-500">{i.invoice_number || i.id.slice(0, 8)}</div>
                        <div>{fmt(i.final_amount)} د.ع · {i.period_months} شهر · {i.plan}</div>
                      </div>
                      {i.is_paid ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">✓ مدفوع</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">معلّق</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <button
              onClick={() => { onAction(); load(); }}
              className="w-full text-xs text-blue-600 hover:underline py-2"
            >⟳ إعادة تحميل البيانات</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm">{title}</h4>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  );
}
function Empty() {
  return <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات</p>;
}

// ─── ANALYTICS ────────────────────────────────────────────────

function AnalyticsView({ data, loading }: { data: Analytics | null; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">لا توجد بيانات</div>;

  const fmt = (n: number) => n.toLocaleString('en-US');
  const c = data.current;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR الحالي" value={fmt(c.mrr)} suffix="د.ع" trend={c.growth_pct} />
        <KpiCard label="ARR" value={fmt(c.arr)} suffix="د.ع" />
        <KpiCard label="ARPU" value={fmt(c.arpu)} suffix="د.ع/عميل" hint="متوسط الإيراد لكل عميل دافع" />
        <KpiCard label="معدل churn" value={`${c.churn_rate_pct}%`} hint={`${c.this_month_churn} ألغوا هذا الشهر`} negative={c.churn_rate_pct > 5} />
      </div>

      {/* Revenue trend */}
      <ChartCard title="📈 الإيرادات (12 شهر)" hint="مجموع الفواتير المدفوعة شهرياً">
        <BarChart labels={data.series.months} values={data.series.revenue} format={fmt} suffix="د.ع" color="#2D8CFF" />
      </ChartCard>

      {/* Signups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="📊 العملاء الجدد (12 شهر)" hint="عدد التسجيلات الجديدة">
          <BarChart labels={data.series.months} values={data.series.signups} format={fmt} color="#22C55E" />
        </ChartCard>
        <ChartCard title="📉 churn (12 شهر)" hint="إلغاءات + تعليقات">
          <BarChart labels={data.series.months} values={data.series.churn} format={fmt} color="#EF4444" />
        </ChartCard>
      </div>

      {/* Plan distribution */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          توزيع العملاء على الباقات
        </h3>
        <div className="space-y-2">
          {data.plan_distribution.map((p) => {
            const total = data.plan_distribution.reduce((sum, x) => sum + x.tenant_count, 0);
            const pct = total > 0 ? Math.round((p.tenant_count / total) * 100) : 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="font-semibold w-32 flex-shrink-0">{p.name_ar}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden relative">
                  <div className="absolute inset-y-0 right-0 bg-blue-500" style={{ width: `${pct}%` }} />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                    <span>{p.tenant_count} عميل ({pct}%)</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-24 text-left font-mono flex-shrink-0">
                  {fmt(p.mrr_contribution)} د.ع
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix, hint, trend, negative }: {
  label: string; value: string; suffix?: string; hint?: string;
  trend?: number | null; negative?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${negative ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
        {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </div>
      {trend != null && (
        <div className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% عن الشهر السابق
        </div>
      )}
      {hint && !trend && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function BarChart({ labels, values, format, suffix, color }: {
  labels: string[]; values: number[]; format?: (n: number) => string; suffix?: string; color: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex items-end gap-1 h-32 mb-2">
        {values.map((v, i) => {
          const heightPct = (v / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(2, heightPct)}%`,
                  background: v > 0 ? color : '#E5E7EB',
                  opacity: i === values.length - 1 ? 1 : 0.7,
                }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {format ? format(v) : v}{suffix ? ` ${suffix}` : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 text-[10px] text-gray-400 text-center">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 truncate" title={l}>
            {l.split(' ')[0].slice(0, 4)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ONBOARD WIZARD ───────────────────────────────────────────

type OnboardResult = {
  ok: true;
  tenant: { id: string; name: string; phone: string };
  password: string;
  plan: { id: string; name_ar: string; base_amount: number };
  coupon_applied: { code: string; discount: number } | null;
  final_amount: number;
  payment_method: 'link' | 'cash' | 'trial_only';
  payment_url?: string;
  whatsapp_url?: string;
  whatsapp_message?: string;
  invoice_id?: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
};

function OnboardWizard({
  plans, onClose, onSuccess,
}: {
  plans: FullPlan[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: tenant info
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: plan + coupon
  const [planId, setPlanId] = useState('business');
  const [periodMonths, setPeriodMonths] = useState<1 | 3 | 6 | 12>(1);
  const [couponCode, setCouponCode] = useState('');

  // Step 3: payment method
  const [paymentMethod, setPaymentMethod] = useState<'link' | 'cash' | 'trial_only'>('link');
  const [gateway, setGateway] = useState<'zaincash' | 'qi' | 'asiapay'>('zaincash');
  const [cashRef, setCashRef] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  // Step 4: result
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const purchasablePlans = plans.filter((p) => p.is_active && p.price_monthly > 0);

  const submit = async () => {
    if (!businessName.trim() || !ownerName.trim() || !phone.trim()) {
      toast.error('املأ كل الحقول المطلوبة');
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/saas-billing/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          owner_name: ownerName,
          phone: phone.trim(),
          email: email.trim() || undefined,
          governorate: governorate || undefined,
          password: password.trim() || undefined,
          plan_id: planId,
          period_months: periodMonths,
          coupon_code: couponCode.trim() || undefined,
          payment_method: paymentMethod,
          gateway: paymentMethod === 'link' ? gateway : undefined,
          cash_reference: paymentMethod === 'cash' ? cashRef.trim() || undefined : undefined,
          cash_notes: paymentMethod === 'cash' ? cashNotes.trim() || undefined : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const errMap: Record<string, string> = {
          INVALID_PHONE: 'رقم الهاتف غير صحيح — لازم 07XXXXXXXXX',
          PHONE_ALREADY_REGISTERED: 'الهاتف مسجّل سابقاً',
          PLAN_NOT_FOUND: 'الباقة غير موجودة',
          PASSWORD_TOO_SHORT: 'كلمة المرور أقل من 6 أحرف',
        };
        toast.error(errMap[d.error] || d.error || 'فشل الإنشاء');
        setSubmitting(false);
        return;
      }
      setResult(d);
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error('فشل الاتصال');
      setSubmitting(false);
    }
    setSubmitting(false);
  };

  const StepHeader = () => (
    <div className="flex items-center justify-center gap-2 mb-6 px-6 pt-2">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            n === step ? 'bg-blue-600 text-white' : n < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>{n < step ? '✓' : n}</div>
          {n < 4 && <div className={`w-8 h-0.5 ${n < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  const planObj = plans.find((p) => p.id === planId);
  const priceForPeriod = (p: FullPlan, m: number) =>
    m === 1 ? p.price_monthly : m === 3 ? p.price_3m : m === 6 ? p.price_6m : p.price_12m;
  const currentPrice = planObj ? priceForPeriod(planObj, periodMonths) : 0;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">➕ إضافة عميل جديد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <StepHeader />

        {/* Step 1: Tenant info */}
        {step === 1 && (
          <div className="px-6 pb-6 space-y-3">
            <h3 className="font-bold text-base mb-2">معلومات العميل</h3>
            <Field label="اسم النشاط *" value={businessName} onChange={setBusinessName} placeholder="مولدات الياسمين" />
            <Field label="اسم المالك *" value={ownerName} onChange={setOwnerName} placeholder="أحمد محمد" />
            <Field label="رقم الهاتف *" value={phone} onChange={setPhone} placeholder="07701234567" inputMode="tel" />
            <Field label="البريد (اختياري)" value={email} onChange={setEmail} placeholder="email@example.com" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">المحافظة (اختياري)</label>
              <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— اختر —</option>
                {['بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'ذي قار', 'بابل', 'ديالى', 'الأنبار', 'كركوك', 'صلاح الدين', 'واسط', 'المثنى', 'ميسان', 'القادسية', 'دهوك', 'السليمانية'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <Field label="كلمة المرور (اختياري — تُولَّد تلقائياً)" value={password} onChange={setPassword} placeholder="اتركها فارغة للتوليد" />
          </div>
        )}

        {/* Step 2: Plan + period + coupon */}
        {step === 2 && (
          <div className="px-6 pb-6 space-y-4">
            <h3 className="font-bold text-base">الباقة والمدة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {purchasablePlans.map((p) => (
                <button key={p.id} onClick={() => setPlanId(p.id)}
                  className={`p-3 rounded-xl border-2 text-right transition-all ${planId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="font-bold">{p.name_ar} {p.is_popular && '⭐'}</div>
                  <div className="text-xs text-gray-500 mt-1">{fmt(p.price_monthly)} د.ع/شهر</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">المدة</label>
              <div className="grid grid-cols-4 gap-1">
                {([1, 3, 6, 12] as const).map((p) => (
                  <button key={p} onClick={() => setPeriodMonths(p)}
                    className={`py-2 rounded-lg text-sm border-2 ${periodMonths === p ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    {p === 1 ? 'شهر' : p === 12 ? 'سنة' : `${p} شهور`}
                  </button>
                ))}
              </div>
            </div>

            <Field label="كود الكوبون (اختياري)" value={couponCode} onChange={(v) => setCouponCode(v.toUpperCase())} placeholder="WELCOME20" />

            {planObj && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between"><span>السعر:</span><span className="font-bold">{fmt(currentPrice)} د.ع</span></div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Payment method */}
        {step === 3 && (
          <div className="px-6 pb-6 space-y-3">
            <h3 className="font-bold text-base">طريقة الدفع</h3>

            <PaymentOption emoji="💚" title="رابط دفع (WhatsApp)" desc="ينشئ tenant + رابط دفع — العميل يكمل الدفع لاحقاً"
              checked={paymentMethod === 'link'} onClick={() => setPaymentMethod('link')} />
            {paymentMethod === 'link' && (
              <div className="mr-8 p-3 bg-gray-50 rounded-lg">
                <label className="block text-xs text-gray-500 mb-1">البوابة المختارة في الرابط</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['zaincash', 'qi', 'asiapay'] as const).map((g) => (
                    <button key={g} onClick={() => setGateway(g)} className={`py-2 rounded text-xs border-2 ${gateway === g ? 'border-blue-500 bg-white' : 'border-transparent'}`}>{g}</button>
                  ))}
                </div>
              </div>
            )}

            <PaymentOption emoji="💵" title="نقداً (مدفوع الآن)" desc="ينشئ tenant مفعّل + يسجّل الدفعة + يمدّد الاشتراك"
              checked={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} />
            {paymentMethod === 'cash' && (
              <div className="mr-8 space-y-2">
                <Field label="رقم الإيصال (اختياري)" value={cashRef} onChange={setCashRef} placeholder="REC-2026-0142" small />
                <Field label="ملاحظات (اختياري)" value={cashNotes} onChange={setCashNotes} placeholder="مثلاً: عميل VIP، استلمت من المحاسب" small />
              </div>
            )}

            <PaymentOption emoji="🆓" title="تجربة فقط (7 أيام)" desc="ينشئ tenant بـ trial، بدون دفعة. ادفع لاحقاً"
              checked={paymentMethod === 'trial_only'} onClick={() => setPaymentMethod('trial_only')} />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              {paymentMethod === 'cash' && '✓ سيتم تفعيل الحساب فوراً + تمديد الاشتراك بالمدة المختارة.'}
              {paymentMethod === 'link' && '✓ سيتم إنشاء tenant بـ trial 7 أيام. عند دفع العميل عبر الرابط، يُفعّل تلقائياً.'}
              {paymentMethod === 'trial_only' && 'ℹ️ سيتم إنشاء tenant بـ trial 7 أيام. لا يوجد invoice. ادفع لاحقاً عبر الـ drawer.'}
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="px-6 pb-6 space-y-4">
            <div className="text-center py-2">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="font-bold text-lg">تم إنشاء الحساب ✓</h3>
              <p className="text-sm text-gray-500">{result.tenant.name} · {result.tenant.phone}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-blue-900 mb-2">🔐 معلومات تسجيل الدخول (احفظها — لن تُعرض مرة أخرى)</div>
              <CopyRow label="الهاتف" value={result.tenant.phone} />
              <CopyRow label="كلمة المرور" value={result.password} mono />
            </div>

            {result.payment_method === 'link' && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-green-900">💚 رابط الدفع</div>
                  <CopyRow label="" value={result.payment_url || ''} small />
                  <a href={result.whatsapp_url} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1faa55] text-white text-sm font-bold text-center">
                    📱 افتح WhatsApp وارسل الرسالة
                  </a>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">عرض/نسخ نص الرسالة</summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap font-mono text-[11px]" dir="rtl">{result.whatsapp_message}</pre>
                </details>
              </div>
            )}

            {result.payment_method === 'cash' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-green-900 mb-1">✅ تم تفعيل الحساب</div>
                <div className="text-green-800">
                  المبلغ: {fmt(result.final_amount)} د.ع<br />
                  تنتهي الفترة: {result.subscription_ends_at ? new Date(result.subscription_ends_at).toLocaleDateString('ar-IQ') : '—'}
                </div>
              </div>
            )}

            {result.payment_method === 'trial_only' && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-900">
                <div className="font-bold mb-1">🆓 تجربة 7 أيام</div>
                <div>تنتهي التجربة: {result.trial_ends_at ? new Date(result.trial_ends_at).toLocaleDateString('ar-IQ') : '—'}</div>
              </div>
            )}

            <button onClick={() => { onSuccess(); }}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">
              تم — اغلق
            </button>
          </div>
        )}

        {/* Footer nav */}
        {step < 4 && (
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
            {step > 1 && <button onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">رجوع</button>}
            {step < 3 && (
              <button onClick={() => {
                if (step === 1) {
                  if (!businessName.trim() || !ownerName.trim() || !phone.trim()) {
                    toast.error('املأ الحقول المطلوبة'); return;
                  }
                }
                setStep((step + 1) as 2 | 3);
              }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-bold">التالي →</button>
            )}
            {step === 3 && (
              <button onClick={submit} disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ إنشاء الحساب'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, inputMode, small }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: 'tel' | 'text' | 'email'; small?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode}
        className={`w-full border rounded-lg px-3 ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
        dir={inputMode === 'tel' ? 'ltr' : 'rtl'} />
    </div>
  );
}

function PaymentOption({ emoji, title, desc, checked, onClick }: {
  emoji: string; title: string; desc: string; checked: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-right p-3 rounded-xl border-2 flex items-start gap-3 transition-all ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}>
      <span className="text-2xl flex-shrink-0">{emoji}</span>
      <div className="flex-1">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      {checked && <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">✓</div>}
    </button>
  );
}

function CopyRow({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => toast.success(`نُسخ ${label || 'الرابط'}`));
  };
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-600 w-24 flex-shrink-0">{label}:</span>}
      <code className={`flex-1 bg-white px-2 py-1 rounded border ${mono ? 'font-mono' : ''} ${small ? 'text-[11px]' : 'text-xs'} truncate`} dir="ltr">{value}</code>
      <button onClick={copy} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0">نسخ</button>
    </div>
  );
}

// ─── REFUND MODAL ────────────────────────────────────────────

function RefundModal({ paymentId, onClose, onSuccess }: {
  paymentId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('السبب مطلوب (5 أحرف على الأقل)');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/saas-billing/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, reason }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error || 'فشل الاسترداد');
        setSubmitting(false);
        return;
      }
      toast.success('تم الاسترداد ✓');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('فشل الاتصال');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">استرداد دفعة</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mb-4">
          ⚠️ هذا الإجراء يُعلّم الدفعة كـ "مرتجعة" + يُلغي الفاتورة المرتبطة. الاسترداد الفعلي للأموال لازم يصير من خلال البوابة (ZainCash/Qi/AsiaPay) مباشرة.
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">السبب (مطلوب — للسجل)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            placeholder="مثلاً: شكوى عميل، خطأ بالخصم، طلب إلغاء..."
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '💸 تأكيد الاسترداد'}
          </button>
        </div>
      </div>
    </div>
  );
}
