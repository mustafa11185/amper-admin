"use client";
export const dynamic = 'force-dynamic'

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { openWhatsApp } from "@/lib/whatsapp";
import {
  Building2,
  Zap,
  Users,
  UserCog,
  Star,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowLeftRight,
  Pause,
  PlayCircle,
  TestTube,
  Save,
  Plus,
  X,
  ChevronDown,
  FileText,
  MessageSquare,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface ClientData {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  plan: string;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  trial_subscriber_limit: number;
  locked_at: string | null;
  created_at: string;
  _count?: {
    branches: number;
    staff: number;
    subscribers: number;
  };
  branches?: { _count?: { generators: number } }[];
  modules?: TenantModuleData[];
  billing_invoices?: BillingInvoiceData[];
  support_tickets?: SupportTicketData[];
  discounts?: TenantDiscountData[];
}

interface TenantModuleData {
  id: string;
  module_key: string;
  is_active: boolean;
  add_on_price: string | null;
  added_outside_plan: boolean;
}

interface BillingInvoiceData {
  id: string;
  amount: string;
  final_amount: string;
  plan: string;
  period_start: string;
  period_end: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

interface SupportTicketData {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface PlanChangeLogData {
  id: string;
  changed_by: string;
  change_type: string;
  from_plan: string | null;
  to_plan: string | null;
  notes: string | null;
  created_at: string;
}

interface TenantDiscountData {
  id: string;
  discount_type: string;
  discount_value: string;
  promo_code: string | null;
  reason: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  applied_by: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  subscriber_management: "ادارة المشتركين",
  basic_invoicing: "الفوترة الاساسية",
  pos: "اجهزة نقاط البيع",
  reports: "التقارير",
  wallet: "المحفظة",
  whatsapp: "واتساب",
  engine_tracking: "تتبع المحركات",
  daily_brief: "التقرير اليومي",
  subscriber_app: "تطبيق المشترك",
  ai_reports: "تقارير الذكاء الاصطناعي",
  multi_branch: "تعدد الفروع",
  gps: "تحديد الموقع",
  iot_monitoring: "مراقبة IoT",
  fuel_sensor: "حساس الوقود",
  temperature_sensor: "حساس الحرارة",
  operator_app: "تطبيق المشغل",
};

const ALL_MODULE_KEYS = Object.keys(MODULE_LABELS);

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  basic: { bg: "var(--blue-soft)", text: "var(--blue-primary)" },
  gold: { bg: "var(--gold-soft)", text: "var(--gold)" },
  fleet: { bg: "var(--violet-soft)", text: "var(--violet)" },
  custom: { bg: "#F0FDF4", text: "var(--success)" },
};

const PLAN_LABELS: Record<string, string> = {
  basic: "اساسي",
  gold: "ذهبي",
  fleet: "اسطول",
  custom: "مخصص",
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "#F0FDF4", text: "var(--success)" },
  normal: { bg: "var(--blue-soft)", text: "var(--blue-primary)" },
  high: { bg: "var(--gold-soft)", text: "var(--gold)" },
  urgent: { bg: "#FEF2F2", text: "var(--danger)" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "var(--gold-soft)", text: "var(--gold)" },
  in_progress: { bg: "var(--blue-soft)", text: "var(--blue-primary)" },
  closed: { bg: "#F0FDF4", text: "var(--success)" },
  resolved: { bg: "#F0FDF4", text: "var(--success)" },
};

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-IQ", {
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ──────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const colors = PLAN_COLORS[plan] || PLAN_COLORS.basic;
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {PLAN_LABELS[plan] || plan}
    </span>
  );
}

function StatusBadge({
  label,
  colorMap,
  value,
}: {
  label: string;
  colorMap: Record<string, { bg: string; text: string }>;
  value: string;
}) {
  const colors = colorMap[value] || { bg: "var(--bg-muted)", text: "var(--text-muted)" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 animate-pulse ${className}`}
      style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="h-5 w-32 rounded mb-4" style={{ background: "var(--bg-muted)" }} />
      <div className="h-4 w-48 rounded mb-3" style={{ background: "var(--bg-muted)" }} />
      <div className="h-4 w-40 rounded mb-3" style={{ background: "var(--bg-muted)" }} />
      <div className="h-4 w-36 rounded" style={{ background: "var(--bg-muted)" }} />
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientData | null>(null);
  const [planLogs, setPlanLogs] = useState<PlanChangeLogData[]>([]);
  const [loading, setLoading] = useState(true);

  // Module state
  const [moduleStates, setModuleStates] = useState<
    Record<string, { active: boolean; price: string }>
  >({});
  const [savingModules, setSavingModules] = useState(false);

  // Modals
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  // Modal form state
  const [newPlan, setNewPlan] = useState("basic");
  const [freezeReason, setFreezeReason] = useState("");
  const [discountForm, setDiscountForm] = useState({
    discount_type: "percentage",
    discount_value: "",
    promo_code: "",
    reason: "",
    valid_from: "",
    valid_until: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch data ────────────────────────────────────────────

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("فشل في تحميل بيانات العميل");
      const data = await res.json();
      setClient(data);

      // Initialize module states
      const states: Record<string, { active: boolean; price: string }> = {};
      ALL_MODULE_KEYS.forEach((key) => {
        const existing = data.modules?.find(
          (m: TenantModuleData) => m.module_key === key
        );
        states[key] = {
          active: existing ? existing.is_active : false,
          price: existing?.add_on_price || "",
        };
      });
      setModuleStates(states);
    } catch {
      toast.error("فشل في تحميل بيانات العميل");
    }
  }, [id]);

  const fetchPlanLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}/plan-logs`);
      if (res.ok) {
        const data = await res.json();
        setPlanLogs(data);
      }
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchClient(), fetchPlanLogs()]).finally(() =>
      setLoading(false)
    );
  }, [fetchClient, fetchPlanLogs]);

  // ─── Actions ───────────────────────────────────────────────

  async function handleChangePlan() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تغيير الباقة بنجاح");
      setChangePlanOpen(false);
      fetchClient();
      fetchPlanLogs();
    } catch {
      toast.error("فشل في تغيير الباقة");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFreeze() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked_at: new Date().toISOString(),
          freeze_reason: freezeReason,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تجميد الحساب");
      setFreezeOpen(false);
      setFreezeReason("");
      fetchClient();
      fetchPlanLogs();
    } catch {
      toast.error("فشل في تجميد الحساب");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnfreeze() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked_at: null }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم الغاء التجميد");
      fetchClient();
      fetchPlanLogs();
    } catch {
      toast.error("فشل في الغاء التجميد");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivateTrial() {
    setSubmitting(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_trial: true,
          trial_ends_at: trialEnd.toISOString(),
          trial_subscriber_limit: 20,
          plan: "gold",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تفعيل الفترة التجريبية (7 ايام ذهبي)");
      setTrialOpen(false);
      fetchClient();
      fetchPlanLogs();
    } catch {
      toast.error("فشل في تفعيل الفترة التجريبية");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveModules() {
    setSavingModules(true);
    try {
      const modules = ALL_MODULE_KEYS.map((key) => ({
        module_key: key,
        is_active: moduleStates[key]?.active || false,
        add_on_price: moduleStates[key]?.price || null,
      }));
      const res = await fetch(`/api/clients/${id}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم حفظ التغييرات");
      fetchClient();
    } catch {
      toast.error("فشل في حفظ الموديولات");
    } finally {
      setSavingModules(false);
    }
  }

  async function handleAddDiscount() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${id}/discounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discountForm),
      });
      if (!res.ok) throw new Error();
      toast.success("تم اضافة الخصم");
      setDiscountOpen(false);
      setDiscountForm({
        discount_type: "percentage",
        discount_value: "",
        promo_code: "",
        reason: "",
        valid_from: "",
        valid_until: "",
      });
      fetchClient();
    } catch {
      toast.error("فشل في اضافة الخصم");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Computed ──────────────────────────────────────────────

  const generatorsCount =
    client?.branches?.reduce(
      (sum, b) => sum + (b._count?.generators || 0),
      0
    ) || 0;

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
      >
        <AlertCircle size={48} style={{ color: "var(--danger)" }} />
        <p className="mt-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          لم يتم العثور على العميل
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-6">
          {/* ── Client Info Card ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2
                  className="text-xl font-bold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {client.name}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {client.owner_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge plan={client.plan} />
                {client.locked_at && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: "#FEF2F2", color: "var(--danger)" }}
                  >
                    مجمد
                  </span>
                )}
                {client.is_trial && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                  >
                    تجريبي
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <Phone size={14} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontFamily: "var(--font-rajdhani)" }}>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <Mail size={14} style={{ color: "var(--text-muted)" }} />
                  <span>{client.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                <span>{formatDate(client.created_at)}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  icon: <Building2 size={16} />,
                  label: "فروع",
                  value: client._count?.branches || 0,
                },
                {
                  icon: <Zap size={16} />,
                  label: "مولدات",
                  value: generatorsCount,
                },
                {
                  icon: <Users size={16} />,
                  label: "مشتركين",
                  value: client._count?.subscribers || 0,
                },
                {
                  icon: <UserCog size={16} />,
                  label: "موظفين",
                  value: client._count?.staff || 0,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <span style={{ color: "var(--blue-primary)" }}>{stat.icon}</span>
                  <span
                    className="text-lg font-bold"
                    style={{
                      fontFamily: "var(--font-rajdhani)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Plan Management ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              ادارة الباقة
            </h3>

            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                الباقة الحالية:
              </span>
              <PlanBadge plan={client.plan} />
              {client.is_trial && client.trial_ends_at && (
                <span className="text-xs" style={{ color: "var(--gold)" }}>
                  تنتهي {formatDate(client.trial_ends_at)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setNewPlan(client.plan);
                  setChangePlanOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--blue-soft)",
                  color: "var(--blue-primary)",
                }}
              >
                <ArrowLeftRight size={14} />
                تغيير الباقة
              </button>

              {client.locked_at ? (
                <button
                  onClick={handleUnfreeze}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: "#F0FDF4",
                    color: "var(--success)",
                  }}
                >
                  <PlayCircle size={14} />
                  الغاء التجميد
                </button>
              ) : (
                <button
                  onClick={() => setFreezeOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: "#FEF2F2",
                    color: "var(--danger)",
                  }}
                >
                  <Pause size={14} />
                  تجميد
                </button>
              )}

              <button
                onClick={() => setTrialOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--gold-soft)",
                  color: "var(--gold)",
                }}
              >
                <TestTube size={14} />
                تفعيل تجريبية
              </button>

              {/* Activate / Deactivate */}
              {client.is_active ? (
                <button
                  onClick={async () => {
                    if (!confirm("هل أنت متأكد من تعطيل هذا الحساب؟")) return;
                    try {
                      const res = await fetch(`/api/clients/${client.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_active: false }),
                      });
                      if (res.ok) { toast.success("تم تعطيل الحساب"); fetchClient(); }
                    } catch { toast.error("خطأ"); }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "#FEF2F2", color: "var(--danger)" }}
                >
                  <Pause size={14} />
                  تعطيل الحساب
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/clients/${client.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_active: true }),
                      });
                      if (res.ok) { toast.success("تم تفعيل الحساب"); fetchClient(); }
                    } catch { toast.error("خطأ"); }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "#F0FDF4", color: "var(--success)" }}
                >
                  <PlayCircle size={14} />
                  تفعيل الحساب
                </button>
              )}

              {/* Reset password */}
              <button
                onClick={async () => {
                  const newPass = prompt("كلمة المرور الجديدة:");
                  if (!newPass || newPass.length < 4) { toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل"); return; }
                  try {
                    const res = await fetch(`/api/clients/${client.id}/reset-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: newPass }),
                    });
                    if (res.ok) toast.success("تم إعادة تعيين كلمة المرور");
                    else toast.error("فشل إعادة التعيين");
                  } catch { toast.error("خطأ"); }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
              >
                <AlertCircle size={14} />
                إعادة تعيين كلمة المرور
              </button>
            </div>
          </div>

          {/* Delete client — super_admin only */}
          <DeleteClientSection clientId={client.id} clientName={client.name} />

          {/* Trial Conversion */}
          {client.is_trial && (
            <div className="rounded-2xl p-5" style={{ background: "#FFF7ED", boxShadow: "var(--shadow-md)", border: "1px solid #FDE68A" }}>
              <div className="flex items-center gap-2 mb-3">
                <Star size={18} style={{ color: "#D97706" }} />
                <h3 className="text-sm font-bold" style={{ color: "#92400E" }}>حوّل للاشتراك الكامل</h3>
              </div>
              {client.trial_ends_at && (
                <p className="text-xs mb-3" style={{ color: "#92400E" }}>
                  {Math.ceil((new Date(client.trial_ends_at).getTime() - Date.now()) / 86400000) > 0
                    ? `باقي ${Math.ceil((new Date(client.trial_ends_at).getTime() - Date.now()) / 86400000)} يوم على انتهاء التجربة`
                    : "انتهت فترة التجربة"}
                </p>
              )}
              <div className="flex gap-2">
                {["basic", "gold", "fleet"].map(plan => (
                  <button key={plan} onClick={async () => {
                    if (!confirm(`ترقية إلى باقة ${plan}؟`)) return;
                    try {
                      const res = await fetch(`/api/clients/${client.id}`, {
                        method: "PUT", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ plan, is_trial: false, trial_ends_at: null }),
                      });
                      if (res.ok) { toast.success("تم الترقية بنجاح"); fetchClient(); }
                    } catch { toast.error("خطأ"); }
                  }}
                    className="flex-1 h-10 rounded-xl text-xs font-bold text-white"
                    style={{ background: plan === "gold" ? "#D97706" : plan === "fleet" ? "#7C3AED" : "var(--blue-primary)" }}
                  >
                    {plan === "basic" ? "أساسية" : plan === "gold" ? "ذهبية" : "أسطول"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subscriber App Activation */}
          <SubscriberAppActivation clientId={client.id} generatorName={client.name} />

          {/* ── Modules Section ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              الموديولات
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {ALL_MODULE_KEYS.map((key) => (
                <div key={key} className="space-y-1.5">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {MODULE_LABELS[key]}
                    </span>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() =>
                        setModuleStates((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], active: !prev[key]?.active },
                        }))
                      }
                      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer"
                      style={{
                        background: moduleStates[key]?.active
                          ? "var(--blue-primary)"
                          : "var(--border)",
                      }}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                        style={{
                          transform: moduleStates[key]?.active
                            ? "translate(-16px, 2px)"
                            : "translate(-2px, 2px)",
                        }}
                      />
                    </button>
                  </label>
                  {/* Optional price field for add-on modules */}
                  {moduleStates[key]?.active && (
                    <input
                      type="text"
                      placeholder="سعر اضافي (IQD/شهر)"
                      value={moduleStates[key]?.price || ""}
                      onChange={(e) =>
                        setModuleStates((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], price: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-rajdhani)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveModules}
              disabled={savingModules}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer"
              style={{
                background: savingModules ? "var(--text-muted)" : "var(--blue-primary)",
              }}
            >
              {savingModules ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              حفظ التغييرات
            </button>
          </div>

          {/* ── Tenant Discounts ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                الخصومات
              </h3>
              <button
                onClick={() => setDiscountOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                style={{
                  background: "var(--blue-soft)",
                  color: "var(--blue-primary)",
                }}
              >
                <Plus size={12} />
                اضافة خصم
              </button>
            </div>

            {client.discounts && client.discounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <th className="text-right pb-2 font-medium">النوع</th>
                      <th className="text-right pb-2 font-medium">القيمة</th>
                      <th className="text-right pb-2 font-medium">كود</th>
                      <th className="text-right pb-2 font-medium">الحالة</th>
                      <th className="text-right pb-2 font-medium">حتى</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.discounts
                      .filter((d) => d.is_active)
                      .map((d) => (
                        <tr
                          key={d.id}
                          className="border-t"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                            {d.discount_type === "percentage"
                              ? "نسبة"
                              : d.discount_type === "fixed"
                                ? "مبلغ ثابت"
                                : "اشهر مجانية"}
                          </td>
                          <td
                            className="py-2 font-bold"
                            style={{
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-rajdhani)",
                            }}
                          >
                            {d.discount_value}
                            {d.discount_type === "percentage" ? "%" : ""}
                          </td>
                          <td
                            className="py-2"
                            style={{
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-rajdhani)",
                            }}
                          >
                            {d.promo_code || "-"}
                          </td>
                          <td className="py-2">
                            <span
                              className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                background: d.is_active ? "#F0FDF4" : "#FEF2F2",
                                color: d.is_active ? "var(--success)" : "var(--danger)",
                              }}
                            >
                              {d.is_active ? "فعال" : "منتهي"}
                            </span>
                          </td>
                          <td className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                            {formatDate(d.valid_until)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                لا توجد خصومات فعالة
              </p>
            )}
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="space-y-6">
          {/* ── Plan Change Log Timeline ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              سجل تغييرات الباقة
            </h3>

            {planLogs.length > 0 ? (
              <div className="relative pr-4">
                {/* Timeline line */}
                <div
                  className="absolute top-0 right-0 w-0.5 h-full"
                  style={{ background: "var(--border)" }}
                />

                <div className="space-y-4">
                  {planLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="relative flex gap-3">
                      {/* Dot */}
                      <div
                        className="absolute -right-[18px] top-1.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          background: "var(--bg-surface)",
                          borderColor: "var(--blue-primary)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {log.change_type}
                          </span>
                          {log.from_plan && log.to_plan && (
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: "var(--font-rajdhani)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {PLAN_LABELS[log.from_plan] || log.from_plan} &larr;{" "}
                              {PLAN_LABELS[log.to_plan] || log.to_plan}
                            </span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
                            {log.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {formatDate(log.created_at)}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {log.changed_by}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Clock size={32} style={{ color: "var(--text-muted)" }} />
                <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  لا توجد تغييرات مسجلة
                </p>
              </div>
            )}
          </div>

          {/* ── Recent Billing Invoices ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              <FileText
                size={16}
                className="inline-block ml-2"
                style={{ color: "var(--blue-primary)" }}
              />
              اخر الفواتير
            </h3>

            {client.billing_invoices && client.billing_invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <th className="text-right pb-2 font-medium">الفترة</th>
                      <th className="text-right pb-2 font-medium">المبلغ</th>
                      <th className="text-right pb-2 font-medium">الحالة</th>
                      <th className="text-right pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.billing_invoices.slice(0, 6).map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-t"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="py-2" style={{ color: "var(--text-secondary)" }}>
                          {formatDateShort(inv.period_start)} -{" "}
                          {formatDateShort(inv.period_end)}
                        </td>
                        <td
                          className="py-2 font-bold"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-rajdhani)",
                          }}
                        >
                          {inv.final_amount}
                        </td>
                        <td className="py-2">
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              background: inv.is_paid ? "#F0FDF4" : "var(--gold-soft)",
                              color: inv.is_paid ? "var(--success)" : "var(--gold)",
                            }}
                          >
                            {inv.is_paid ? "مدفوع" : "معلق"}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => {
                              const phone = client.phone?.replace(/[^0-9]/g, '') || ''
                              const intl = phone.startsWith('0') ? '964' + phone.slice(1) : phone
                              const period = `${formatDateShort(inv.period_start)} - ${formatDateShort(inv.period_end)}`
                              const status = inv.is_paid ? 'مدفوع ✅' : 'معلق ⏳'
                              window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`مرحباً — فاتورة أمبير\n\nالفترة: ${period}\nالمبلغ: ${inv.final_amount}\nالحالة: ${status}\n\nأمبير ⚡`)}`, '_blank')
                            }}
                            className="text-[10px] px-2 py-1 rounded-lg cursor-pointer transition-colors"
                            style={{ background: "#ECFDF5", color: "#059669" }}
                            title="إرسال عبر واتساب"
                          >
                            📱
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                لا توجد فواتير
              </p>
            )}
          </div>

          {/* ── Support Tickets ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              <MessageSquare
                size={16}
                className="inline-block ml-2"
                style={{ color: "var(--violet)" }}
              />
              تذاكر الدعم
            </h3>

            {client.support_tickets && client.support_tickets.length > 0 ? (
              <div className="space-y-3">
                {client.support_tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between p-3 rounded-xl"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate mb-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ticket.title}
                      </p>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mr-3">
                      <StatusBadge
                        label={
                          ticket.status === "open"
                            ? "مفتوح"
                            : ticket.status === "in_progress"
                              ? "قيد المعالجة"
                              : ticket.status === "resolved"
                                ? "تم الحل"
                                : "مغلق"
                        }
                        colorMap={STATUS_COLORS}
                        value={ticket.status}
                      />
                      <StatusBadge
                        label={
                          ticket.priority === "low"
                            ? "منخفض"
                            : ticket.priority === "normal"
                              ? "عادي"
                              : ticket.priority === "high"
                                ? "عالي"
                                : "عاجل"
                        }
                        colorMap={PRIORITY_COLORS}
                        value={ticket.priority}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                لا توجد تذاكر
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* Change Plan Modal */}
      <Modal
        open={changePlanOpen}
        onClose={() => setChangePlanOpen(false)}
        title="تغيير الباقة"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              الباقة الجديدة
            </label>
            <div className="relative">
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none cursor-pointer outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="basic">اساسي</option>
                <option value="gold">ذهبي</option>
                <option value="fleet">اسطول</option>
                <option value="custom">مخصص</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setChangePlanOpen(false)}
              className="px-4 py-2 rounded-xl text-sm cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              الغاء
            </button>
            <button
              onClick={handleChangePlan}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
              style={{
                background: submitting ? "var(--text-muted)" : "var(--blue-primary)",
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              تاكيد
            </button>
          </div>
        </div>
      </Modal>

      {/* Freeze Modal */}
      <Modal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        title="تجميد الحساب"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              سبب التجميد
            </label>
            <textarea
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="ادخل سبب التجميد..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setFreezeOpen(false)}
              className="px-4 py-2 rounded-xl text-sm cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              الغاء
            </button>
            <button
              onClick={handleFreeze}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
              style={{
                background: submitting ? "var(--text-muted)" : "var(--danger)",
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              تجميد
            </button>
          </div>
        </div>
      </Modal>

      {/* Trial Activation Modal */}
      <Modal
        open={trialOpen}
        onClose={() => setTrialOpen(false)}
        title="تفعيل الفترة التجريبية"
      >
        <div className="space-y-4">
          <div
            className="p-4 rounded-xl"
            style={{ background: "var(--gold-soft)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              سيتم تفعيل الباقة الذهبية لمدة <strong>7 ايام</strong> مع حد اقصى{" "}
              <strong>20 مشترك</strong>.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setTrialOpen(false)}
              className="px-4 py-2 rounded-xl text-sm cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              الغاء
            </button>
            <button
              onClick={handleActivateTrial}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
              style={{
                background: submitting ? "var(--text-muted)" : "var(--gold)",
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              تفعيل
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Discount Modal */}
      <Modal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        title="اضافة خصم"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              نوع الخصم
            </label>
            <div className="relative">
              <select
                value={discountForm.discount_type}
                onChange={(e) =>
                  setDiscountForm((p) => ({ ...p, discount_type: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none cursor-pointer outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="percentage">نسبة مئوية</option>
                <option value="fixed">مبلغ ثابت</option>
                <option value="free_months">اشهر مجانية</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              القيمة
            </label>
            <input
              type="text"
              value={discountForm.discount_value}
              onChange={(e) =>
                setDiscountForm((p) => ({ ...p, discount_value: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-rajdhani)",
              }}
              placeholder={
                discountForm.discount_type === "percentage"
                  ? "مثال: 15"
                  : discountForm.discount_type === "fixed"
                    ? "مثال: 50000"
                    : "مثال: 3"
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              كود الخصم (اختياري)
            </label>
            <input
              type="text"
              value={discountForm.promo_code}
              onChange={(e) =>
                setDiscountForm((p) => ({ ...p, promo_code: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-rajdhani)",
              }}
              placeholder="AMPER2026"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              السبب
            </label>
            <input
              type="text"
              value={discountForm.reason}
              onChange={(e) =>
                setDiscountForm((p) => ({ ...p, reason: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="سبب الخصم..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
                من تاريخ
              </label>
              <input
                type="date"
                value={discountForm.valid_from}
                onChange={(e) =>
                  setDiscountForm((p) => ({ ...p, valid_from: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-rajdhani)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
                الى تاريخ
              </label>
              <input
                type="date"
                value={discountForm.valid_until}
                onChange={(e) =>
                  setDiscountForm((p) => ({ ...p, valid_until: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-rajdhani)",
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setDiscountOpen(false)}
              className="px-4 py-2 rounded-xl text-sm cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              الغاء
            </button>
            <button
              onClick={handleAddDiscount}
              disabled={submitting || !discountForm.discount_value}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
              style={{
                background:
                  submitting || !discountForm.discount_value
                    ? "var(--text-muted)"
                    : "var(--blue-primary)",
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              اضافة
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DeleteClientSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const nameMatch = confirmText.trim() === clientName.trim() ||
    confirmText.trim().toLowerCase() === clientName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!nameMatch) {
      toast.error("يرجى كتابة اسم العميل بشكل صحيح");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف العميل");
        router.push("/clients");
      } else {
        toast.error("فشل الحذف");
      }
    } catch {
      toast.error("خطأ");
    }
    setDeleting(false);
  };

  return (
    <>
      <div className="rounded-2xl p-5" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--danger)" }}>منطقة الخطر</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>حذف العميل سيعطّل الحساب نهائياً</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
          style={{ background: "var(--danger)" }}>
          <Trash2 size={14} /> حذف العميل
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="rounded-2xl w-full max-w-sm p-6 space-y-4" style={{ background: "var(--bg-surface)" }}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#FEF2F2" }}>
                <AlertCircle size={24} style={{ color: "var(--danger)" }} />
              </div>
              <h3 className="text-base font-bold mb-1">حذف العميل</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                هذا الإجراء لا يمكن التراجع عنه. سيتم تعطيل الحساب نهائياً.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                اكتب &ldquo;{clientName}&rdquo; للتأكيد
              </label>
              <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <p className="text-[10px] mt-1 select-all cursor-pointer" style={{ color: "var(--text-muted)" }}
                onClick={() => { setConfirmText(clientName); }}>
                انقر للنسخ: <span style={{ color: "var(--danger)", fontWeight: 600 }}>{clientName}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); setConfirmText(""); }}
                className="flex-1 h-10 rounded-xl text-sm font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                إلغاء
              </button>
              <button onClick={handleDelete} disabled={deleting || !nameMatch}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ background: "var(--danger)" }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubscriberAppActivation({ clientId, generatorName }: { clientId: string; generatorName: string }) {
  const [stats, setStats] = useState<{ total: number; with_code: number } | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/subscriber-app`)
      .then(r => r.json())
      .then(d => setStats({ total: d.total_subscribers ?? 0, with_code: d.with_code ?? 0 }))
      .catch(() => {})
  }, [clientId])

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📱</span>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>تطبيق المشتركين</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#F0FDF4", color: "#059669" }}>متاح تلقائياً</span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>متاح تلقائياً لجميع الباقات — كل مشترك يحصل على كود خاص</p>
      {stats && (
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>المشتركون المفعّلون</span>
          <span className="text-sm font-bold font-num" style={{ color: "var(--blue-primary)" }}>
            {stats.with_code} / {stats.total}
          </span>
        </div>
      )}
    </div>
  )
}
