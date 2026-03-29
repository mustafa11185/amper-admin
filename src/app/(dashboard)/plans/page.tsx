"use client";

import { useEffect, useState } from "react";
import {
  Gem, Plus, Pencil, Star, Check, X, Loader2, Users, Zap,
  Crown, Shield, Sparkles, MessageSquare, Brain, Clock,
} from "lucide-react";
import toast from "react-hot-toast";

const ALL_MODULES: { key: string; label: string }[] = [
  { key: "subscriber_management", label: "ادارة المشتركين" },
  { key: "basic_invoicing", label: "الفوترة" },
  { key: "pos", label: "نقاط البيع" },
  { key: "reports", label: "التقارير" },
  { key: "wallet", label: "المحفظة" },
  { key: "whatsapp", label: "واتساب" },
  { key: "engine_tracking", label: "تتبع المحركات" },
  { key: "daily_brief", label: "ملخص يومي" },
  { key: "subscriber_app", label: "تطبيق المشترك" },
  { key: "ai_reports", label: "تقارير AI" },
  { key: "multi_branch", label: "فروع متعددة" },
  { key: "gps", label: "GPS" },
  { key: "iot_monitoring", label: "IoT" },
  { key: "fuel_sensor", label: "حساس وقود" },
  { key: "temperature_sensor", label: "حساس حرارة" },
  { key: "operator_app", label: "تطبيق المشغل" },
];

const COLORS = ["#1B4FD8", "#D97706", "#7C3AED", "#059669", "#DC2626", "#0891B2"];

interface Plan {
  id: string;
  key: string;
  name_ar: string;
  name_en: string | null;
  price_monthly_iqd: number;
  price_annual_iqd: number | null;
  max_generators: number;
  max_subscribers: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  description_ar: string | null;
  color: string;
  included_modules: string[];
  trial_days: number;
  includes_whatsapp_support: boolean;
  includes_ai: boolean;
  client_count: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function refresh() {
    fetch("/api/plans")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setPlans(d.plans || []); setLoading(false); })
      .catch(() => { setPlans([]); setLoading(false); toast.error("فشل تحميل الباقات"); });
  }

  useEffect(() => { refresh(); }, []);

  const fmt = (n: number) => n === 0 ? "غير محدود" : n.toLocaleString("en");

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--blue-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem size={22} style={{ color: "var(--violet)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>إدارة الباقات</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold text-white" style={{ background: "var(--blue-primary)" }}>
          <Plus size={14} /> باقة جديدة
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl p-5 relative" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)", border: plan.is_featured ? `2px solid ${plan.color}` : "1px solid var(--border)" }}>
            {plan.is_featured && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: plan.color }}>
                الأكثر شيوعاً
              </div>
            )}

            {/* Badge */}
            <div className="flex items-center justify-between mb-3 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: plan.color }}>
                {plan.key === "gold" && <Crown size={10} />}
                {plan.key === "fleet" && <Sparkles size={10} />}
                {plan.name_ar}
              </span>
              <button onClick={() => setEditPlan(plan)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-muted)" }}>
                <Pencil size={12} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* Price */}
            <div className="mb-3">
              <div className="flex items-baseline gap-1">
                <span className="font-num text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {plan.price_monthly_iqd === 0 ? "حسب الطلب" : plan.price_monthly_iqd.toLocaleString("en")}
                </span>
                {plan.price_monthly_iqd > 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>د.ع/شهر</span>}
              </div>
              {plan.price_annual_iqd && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  سنوي: {plan.price_annual_iqd.toLocaleString("en")} د.ع
                </p>
              )}
            </div>

            {/* Limits */}
            <div className="space-y-1.5 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Zap size={11} style={{ color: plan.color }} />
                <span>المولدات: <strong>{fmt(plan.max_generators)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={11} style={{ color: plan.color }} />
                <span>المشتركون: <strong>{fmt(plan.max_subscribers)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} style={{ color: plan.color }} />
                <span>تجربة: <strong>{plan.trial_days} يوم</strong></span>
              </div>
              {plan.includes_whatsapp_support && (
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={11} style={{ color: "#25D366" }} />
                  <span>دعم واتساب</span>
                </div>
              )}
              {plan.includes_ai && (
                <div className="flex items-center gap-1.5">
                  <Brain size={11} style={{ color: "var(--violet)" }} />
                  <span>ميزات AI</span>
                </div>
              )}
            </div>

            {/* Modules */}
            <div className="flex flex-wrap gap-1 mb-3">
              {plan.included_modules.slice(0, 6).map((m) => {
                const mod = ALL_MODULES.find(am => am.key === m);
                return (
                  <span key={m} className="px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ background: `${plan.color}15`, color: plan.color }}>
                    {mod?.label ?? m}
                  </span>
                );
              })}
              {plan.included_modules.length > 6 && (
                <span className="px-1.5 py-0.5 rounded text-[8px]" style={{ color: "var(--text-muted)" }}>+{plan.included_modules.length - 6}</span>
              )}
            </div>

            {/* Client count */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1">
                <Shield size={11} style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>عملاء نشطون</span>
              </div>
              <span className="font-num text-sm font-bold" style={{ color: plan.color }}>{plan.client_count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="p-3 text-right font-bold" style={{ color: "var(--text-primary)" }}>الميزة</th>
              {plans.map(p => (
                <th key={p.id} className="p-3 text-center font-bold" style={{ color: p.color }}>{p.name_ar}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>السعر الشهري</td>
              {plans.map(p => <td key={p.id} className="p-3 text-center font-num font-bold">{p.price_monthly_iqd === 0 ? "—" : `${p.price_monthly_iqd.toLocaleString("en")}`}</td>)}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>المولدات</td>
              {plans.map(p => <td key={p.id} className="p-3 text-center font-num">{fmt(p.max_generators)}</td>)}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>المشتركون</td>
              {plans.map(p => <td key={p.id} className="p-3 text-center font-num">{fmt(p.max_subscribers)}</td>)}
            </tr>
            {ALL_MODULES.slice(0, 10).map(mod => (
              <tr key={mod.key} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{mod.label}</td>
                {plans.map(p => (
                  <td key={p.id} className="p-3 text-center">
                    {p.included_modules.includes(mod.key)
                      ? <Check size={14} className="mx-auto" style={{ color: "var(--success)" }} />
                      : <X size={14} className="mx-auto" style={{ color: "var(--border)" }} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trial clients */}
      <TrialClientsTable />

      {/* Edit/Add modal */}
      {(editPlan || showAdd) && (
        <PlanFormModal
          plan={editPlan}
          onClose={() => { setEditPlan(null); setShowAdd(false); }}
          onSuccess={() => { setEditPlan(null); setShowAdd(false); refresh(); }}
        />
      )}
    </div>
  );
}

function PlanFormModal({ plan, onClose, onSuccess }: { plan: Plan | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    key: plan?.key ?? "",
    name_ar: plan?.name_ar ?? "",
    name_en: plan?.name_en ?? "",
    price_monthly_iqd: plan?.price_monthly_iqd ?? 0,
    price_annual_iqd: plan?.price_annual_iqd ?? null as number | null,
    max_generators: plan?.max_generators ?? 1,
    max_subscribers: plan?.max_subscribers ?? 100,
    description_ar: plan?.description_ar ?? "",
    color: plan?.color ?? "#1B4FD8",
    included_modules: plan?.included_modules ?? [] as string[],
    is_featured: plan?.is_featured ?? false,
    sort_order: plan?.sort_order ?? 0,
    trial_days: plan?.trial_days ?? 7,
    includes_whatsapp_support: plan?.includes_whatsapp_support ?? false,
    includes_ai: plan?.includes_ai ?? false,
  });
  const [saving, setSaving] = useState(false);

  const toggleModule = (key: string) => {
    setForm(f => ({
      ...f,
      included_modules: f.included_modules.includes(key)
        ? f.included_modules.filter(m => m !== key)
        : [...f.included_modules, key],
    }));
  };

  const handleSave = async () => {
    if (!form.name_ar) { toast.error("اسم الباقة مطلوب"); return; }
    if (!isEdit && !form.key) { toast.error("مفتاح الباقة مطلوب"); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/plans/${plan!.id}` : "/api/plans";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(isEdit ? "تم تحديث الباقة" : "تم إنشاء الباقة");
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "خطأ");
      }
    } catch { toast.error("خطأ في الاتصال"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">{isEdit ? "تعديل الباقة" : "باقة جديدة"}</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>المفتاح (key)</label>
            <input type="text" dir="ltr" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. premium"
              className="w-full h-10 px-3 rounded-xl text-sm font-mono" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>الاسم (عربي)</label>
            <input type="text" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>الاسم (English)</label>
            <input type="text" dir="ltr" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>السعر الشهري (د.ع)</label>
            <input type="number" dir="ltr" value={form.price_monthly_iqd} onChange={e => setForm(f => ({ ...f, price_monthly_iqd: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-xl text-sm font-num" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>السعر السنوي (د.ع)</label>
            <input type="number" dir="ltr" value={form.price_annual_iqd ?? ""} onChange={e => setForm(f => ({ ...f, price_annual_iqd: e.target.value ? Number(e.target.value) : null }))}
              placeholder={String(form.price_monthly_iqd * 10)}
              className="w-full h-10 px-3 rounded-xl text-sm font-num" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>المولدات (0=∞)</label>
            <input type="number" dir="ltr" value={form.max_generators} onChange={e => setForm(f => ({ ...f, max_generators: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-xl text-sm font-num text-center" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>المشتركون (0=∞)</label>
            <input type="number" dir="ltr" value={form.max_subscribers} onChange={e => setForm(f => ({ ...f, max_subscribers: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-xl text-sm font-num text-center" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>تجربة (أيام)</label>
            <input type="number" dir="ltr" value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))}
              className="w-full h-10 px-3 rounded-xl text-sm font-num text-center" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>لون الباقة</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-8 h-8 rounded-xl transition-all" style={{ background: c, border: form.color === c ? "3px solid var(--text-primary)" : "3px solid transparent" }} />
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          {[
            { key: "is_featured", label: "مميزة (الأكثر شيوعاً)" },
            { key: "includes_whatsapp_support", label: "دعم واتساب" },
            { key: "includes_ai", label: "ميزات AI" },
          ].map(t => (
            <label key={t.key} className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t.label}</span>
              <input type="checkbox" checked={(form as any)[t.key]} onChange={e => setForm(f => ({ ...f, [t.key]: e.target.checked }))}
                className="w-4 h-4 rounded" />
            </label>
          ))}
        </div>

        {/* Modules */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>الوحدات المضمّنة</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_MODULES.map(m => (
              <label key={m.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs"
                style={{ background: form.included_modules.includes(m.key) ? `${form.color}10` : "var(--bg-base)" }}>
                <input type="checkbox" checked={form.included_modules.includes(m.key)} onChange={() => toggleModule(m.key)} className="w-3.5 h-3.5 rounded" />
                <span style={{ color: form.included_modules.includes(m.key) ? form.color : "var(--text-muted)" }}>{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>الوصف</label>
          <input type="text" value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--blue-primary)" }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : isEdit ? "حفظ التعديلات" : "إنشاء الباقة"}
        </button>
      </div>
    </div>
  );
}

function TrialClientsTable() {
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeId, setUpgradeId] = useState<string | null>(null);
  const [upgradePlan, setUpgradePlan] = useState("basic");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch("/api/clients?status=trial&limit=50")
      .then(r => r.json())
      .then(d => { setTrials(d.tenants || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    if (!upgradeId) return;
    setUpgrading(true);
    try {
      const res = await fetch(`/api/clients/${upgradeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradePlan, is_trial: false, trial_ends_at: null }),
      });
      if (res.ok) {
        toast.success("تم الترقية");
        setTrials(prev => prev.filter(t => t.id !== upgradeId));
        setUpgradeId(null);
      }
    } catch { toast.error("خطأ"); }
    setUpgrading(false);
  };

  if (loading) return null;
  if (trials.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          العملاء التجريبيون <span className="font-num text-xs mr-1" style={{ color: "var(--text-muted)" }}>({trials.length})</span>
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="p-3 text-right text-xs font-medium" style={{ color: "var(--text-muted)" }}>العميل</th>
            <th className="p-3 text-right text-xs font-medium" style={{ color: "var(--text-muted)" }}>تاريخ البدء</th>
            <th className="p-3 text-right text-xs font-medium" style={{ color: "var(--text-muted)" }}>ينتهي في</th>
            <th className="p-3 text-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>باقي</th>
            <th className="p-3 text-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {trials.map(t => {
            const daysLeft = t.trial_ends_at ? Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86400000) : 0;
            const statusColor = daysLeft > 3 ? "#059669" : daysLeft > 0 ? "#D97706" : "#DC2626";
            const statusBg = daysLeft > 3 ? "#F0FDF4" : daysLeft > 0 ? "#FFF7ED" : "#FEF2F2";
            return (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3">
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.owner_name}</p>
                </td>
                <td className="p-3 text-xs font-num" style={{ color: "var(--text-muted)" }}>
                  {new Date(t.created_at).toLocaleDateString("en")}
                </td>
                <td className="p-3 text-xs font-num" style={{ color: "var(--text-muted)" }}>
                  {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString("en") : "—"}
                </td>
                <td className="p-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusBg, color: statusColor }}>
                    {daysLeft > 0 ? `${daysLeft} يوم` : "منتهي"}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => { setUpgradeId(t.id); setUpgradePlan("basic"); }}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: "var(--blue-primary)" }}>
                    ترقية
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Upgrade modal */}
      {upgradeId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-bold">ترقية العميل</h3>
            <div className="flex gap-2">
              {[{k:"basic",l:"أساسية",c:"var(--blue-primary)"},{k:"gold",l:"ذهبية",c:"#D97706"},{k:"fleet",l:"أسطول",c:"#7C3AED"}].map(p => (
                <button key={p.k} onClick={() => setUpgradePlan(p.k)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold"
                  style={{ background: upgradePlan === p.k ? p.c : "var(--bg-muted)", color: upgradePlan === p.k ? "#fff" : "var(--text-muted)" }}>
                  {p.l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setUpgradeId(null)} className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>إلغاء</button>
              <button onClick={handleUpgrade} disabled={upgrading}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: "var(--blue-primary)" }}>
                {upgrading ? <Loader2 size={12} className="animate-spin" /> : null} تأكيد الترقية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
