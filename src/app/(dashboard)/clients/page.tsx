"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Eye,
  Loader2,
} from "lucide-react";
import { getProvinceOptions, getDistrictOptions } from "@/lib/iraq-geo";

// ─── Types ───────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  plan: PlanType;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  locked_at: string | null;
  created_at: string;
  _count?: { subscribers: number };
}

type PlanType = "starter" | "pro" | "business" | "corporate" | "fleet" | "custom";

type ModuleKey =
  | "subscriber_management"
  | "basic_invoicing"
  | "pos"
  | "reports"
  | "wallet"
  | "whatsapp"
  | "engine_tracking"
  | "daily_brief"
  | "subscriber_app"
  | "ai_reports"
  | "multi_branch"
  | "gps"
  | "iot_monitoring"
  | "fuel_sensor"
  | "temperature_sensor"
  | "operator_app";

type FilterChip =
  | "all"
  | "starter"
  | "pro"
  | "business"
  | "corporate"
  | "fleet"
  | "custom"
  | "active"
  | "trial"
  | "locked";

interface ClientsResponse {
  data: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Constants ───────────────────────────────────────────────

const ALL_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "subscriber_management", label: "ادارة المشتركين" },
  { key: "basic_invoicing", label: "الفوترة الاساسية" },
  { key: "pos", label: "نقاط البيع" },
  { key: "reports", label: "التقارير" },
  { key: "wallet", label: "المحفظة" },
  { key: "whatsapp", label: "واتساب" },
  { key: "engine_tracking", label: "تتبع المحركات" },
  { key: "daily_brief", label: "التقرير اليومي" },
  { key: "subscriber_app", label: "تطبيق المشترك" },
  { key: "ai_reports", label: "تقارير الذكاء الاصطناعي" },
  { key: "multi_branch", label: "الفروع المتعددة" },
  { key: "gps", label: "GPS" },
  { key: "iot_monitoring", label: "مراقبة IoT" },
  { key: "fuel_sensor", label: "حساس الوقود" },
  { key: "temperature_sensor", label: "حساس الحرارة" },
  { key: "operator_app", label: "تطبيق المشغل" },
];

const PLAN_DEFAULT_MODULES: Record<PlanType, ModuleKey[]> = {
  starter: ["subscriber_management", "basic_invoicing", "pos", "subscriber_app"],
  pro: ["subscriber_management", "basic_invoicing", "pos", "reports", "wallet", "whatsapp", "subscriber_app", "daily_brief"],
  business: [
    "subscriber_management", "basic_invoicing", "pos", "reports", "wallet",
    "whatsapp", "engine_tracking", "daily_brief", "subscriber_app", "multi_branch", "gps",
  ],
  corporate: [
    "subscriber_management", "basic_invoicing", "pos", "reports", "wallet",
    "whatsapp", "engine_tracking", "daily_brief", "subscriber_app",
    "ai_reports", "multi_branch", "gps", "iot_monitoring", "operator_app",
  ],
  fleet: [
    "subscriber_management",
    "basic_invoicing",
    "pos",
    "reports",
    "wallet",
    "whatsapp",
    "engine_tracking",
    "daily_brief",
    "subscriber_app",
    "ai_reports",
    "multi_branch",
    "gps",
    "iot_monitoring",
    "fuel_sensor",
    "temperature_sensor",
    "operator_app",
  ],
  custom: [],
};

const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "starter", label: "Starter" },
  { key: "pro", label: "Pro" },
  { key: "business", label: "Business" },
  { key: "corporate", label: "Corporate" },
  { key: "fleet", label: "Fleet" },
  { key: "custom", label: "Custom" },
  { key: "active", label: "نشط" },
  { key: "trial", label: "تجريبي" },
  { key: "locked", label: "موقوف" },
];

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────

function getTenantStatus(t: Tenant): {
  label: string;
  bg: string;
  color: string;
} {
  if (t.locked_at) {
    return { label: "موقوف", bg: "#FEE2E2", color: "#DC2626" };
  }
  if (
    t.grace_period_ends_at &&
    new Date(t.grace_period_ends_at) > new Date()
  ) {
    return { label: "فترة سماح", bg: "#FFEDD5", color: "#EA580C" };
  }
  if (t.is_trial) {
    return { label: "تجربة", bg: "#FEF3C7", color: "#D97706" };
  }
  if (t.is_active) {
    return { label: "نشط", bg: "#D1FAE5", color: "#059669" };
  }
  return { label: "معطّل", bg: "#F3F4F6", color: "#6B7280" };
}

function getPlanBadge(plan: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    starter:   { bg: "#F3F4F6", color: "#374151" },
    pro:       { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
    business:  { bg: "var(--gold-soft)", color: "var(--gold)" },
    corporate: { bg: "#F0FDFA", color: "#0F766E" },
    fleet:     { bg: "var(--violet-soft)", color: "var(--violet)" },
    custom:    { bg: "#F1F5F9", color: "#64748B" },
    // Legacy
    trial:     { bg: "#F3F4F6", color: "#374151" },
    basic:     { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
    gold:      { bg: "var(--gold-soft)", color: "var(--gold)" },
  }
  return map[plan] ?? { bg: "#F3F4F6", color: "#64748B" }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Wizard Form State ──────────────────────────────────────

interface WizardData {
  name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  governorate: string;
  province_key: string;
  district_key: string;
  neighborhood: string;
  alley: string;
  plan: PlanType;
  modules: ModuleKey[];
  max_generators: number | null;
  max_subscribers: number | null;
}

const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "ذي قار", "بابل",
  "ديالى", "الأنبار", "كركوك", "صلاح الدين", "واسط", "المثنى", "ميسان",
  "القادسية", "دهوك", "السليمانية",
];

const initialWizardData: WizardData = {
  name: "",
  owner_name: "",
  phone: "",
  email: "",
  password: "",
  governorate: "",
  province_key: "",
  district_key: "",
  neighborhood: "",
  alley: "",
  plan: "pro",
  modules: [...PLAN_DEFAULT_MODULES.pro],
  max_generators: null,
  max_subscribers: null,
};

// ─── Component ──────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");

  // Dynamic plans
  const [dbPlans, setDbPlans] = useState<Array<{ key: string; name_ar: string; color: string; price_monthly_iqd: number; trial_days?: number }>>([]);
  useEffect(() => {
    fetch("/api/plans").then(r => r.json()).then(d => {
      const plans = (d.plans || []).filter((p: any) => p.key !== 'custom')
      // Deduplicate by key
      const seen = new Set<string>()
      setDbPlans(plans.filter((p: any) => { if (seen.has(p.key)) return false; seen.add(p.key); return true }))
    }).catch(() => {});
  }, []);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    ...initialWizardData,
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (filter === "active" || filter === "locked" || filter === "trial") {
        params.set("status", filter);
      } else if (filter === "starter" || filter === "pro" || filter === "business" || filter === "corporate" || filter === "fleet" || filter === "custom") {
        params.set("plan", filter);
      }

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("فشل في تحميل البيانات");
      const json = await res.json();
      setClients(json.tenants || json.data || []);
      setTotal(json.total);
    } catch {
      toast.error("فشل في تحميل قائمة العملاء");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset to page 1 when search/filter change
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ─── Wizard Handlers ────────────────────────────────────

  function openWizard() {
    setWizardData({ ...initialWizardData });
    setWizardStep(1);
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
  }

  function handlePlanChange(plan: PlanType) {
    // Guard against unknown plan keys (e.g. legacy plans from /api/plans).
    // Without this guard, [...PLAN_DEFAULT_MODULES[plan]] throws on undefined
    // and the state update never runs — leaving the wizard stuck on "pro".
    const defaults = PLAN_DEFAULT_MODULES[plan]
    const modules =
      plan === "custom"
        ? wizardData.modules
        : defaults
          ? [...defaults]
          : [...PLAN_DEFAULT_MODULES.pro]
    setWizardData((prev) => ({ ...prev, plan, modules }))
  }

  function toggleModule(key: ModuleKey) {
    setWizardData((prev) => {
      const has = prev.modules.includes(key);
      return {
        ...prev,
        modules: has
          ? prev.modules.filter((m) => m !== key)
          : [...prev.modules, key],
      };
    });
  }

  async function submitWizard() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "فشل في اضافة العميل");
      }
      toast.success("تم اضافة العميل بنجاح");
      closeWizard();
      setSearch("");
      setFilter("all");
      setPage(1);
      // fetchClients will fire via the useEffect when page/search/filter reset
      setTimeout(() => fetchClients(), 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function canGoNext(): boolean {
    if (wizardStep === 1) {
      return !!(
        wizardData.name.trim() &&
        wizardData.owner_name.trim() &&
        wizardData.phone.trim() &&
        wizardData.password.trim()
      );
    }
    if (wizardStep === 2) {
      return wizardData.modules.length > 0;
    }
    return true;
  }

  // ─── Pagination Helpers ──────────────────────────────────

  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          العملاء
        </h1>
        <button
          onClick={openWizard}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-colors"
          style={{ background: "var(--blue-primary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--blue-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--blue-primary)")
          }
        >
          <Plus size={18} />
          <span>+ عميل جديد</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="بحث بالاسم، الهاتف، او البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-hover)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_CHIPS.map((chip) => {
          const isActive = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
              style={{
                background: isActive
                  ? "var(--blue-primary)"
                  : "var(--bg-muted)",
                color: isActive ? "#fff" : "var(--text-secondary)",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Trial management view */}
      {filter === "trial" && <TrialManagementView />}

      {/* Table Card */}
      {filter !== "trial" && <div
        className="overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {[
                  "#",
                  "الاسم",
                  "الهاتف",
                  "الباقة",
                  "المشتركون",
                  "الحالة",
                  "تاريخ الانضمام",
                  "اجراءات",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-right font-semibold whitespace-nowrap"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div
                            className="h-4 rounded animate-pulse"
                            style={{
                              background: "var(--bg-muted)",
                              width: j === 1 ? 120 : j === 6 ? 100 : 60,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : (clients || []).map((client, idx) => {
                    const status = getTenantStatus(client);
                    const planBadge = getPlanBadge(client.plan);
                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr
                        key={client.id}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid var(--border)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--bg-muted)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          className="px-4 py-3"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {rowNum}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-right cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div style={{ color: "var(--text-primary)" }}>
                              {client.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {client.owner_name}
                            </div>
                          </button>
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {client.phone}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-3 py-0.5 text-xs font-semibold"
                            style={{
                              background: planBadge.bg,
                              color: planBadge.color,
                              borderRadius: 20,
                            }}
                          >
                            {client.plan}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {client._count?.subscribers ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-3 py-0.5 text-xs font-semibold"
                            style={{
                              background: status.bg,
                              color: status.color,
                              borderRadius: 20,
                            }}
                          >
                            {status.label}
                          </span>
                          {client.is_trial && client.trial_ends_at && (() => {
                            const daysLeft = Math.ceil((new Date(client.trial_ends_at).getTime() - Date.now()) / 86400000);
                            return daysLeft > 0 ? (
                              <span className="inline-block mr-1 px-2 py-0.5 text-[10px] font-bold" style={{ background: daysLeft <= 2 ? "#FEF2F2" : "#FFF7ED", color: daysLeft <= 2 ? "var(--danger)" : "#D97706", borderRadius: 10 }}>
                                باقي {daysLeft} يوم
                              </span>
                            ) : (
                              <span className="inline-block mr-1 px-2 py-0.5 text-[10px] font-bold" style={{ background: "#FEF2F2", color: "var(--danger)", borderRadius: 10 }}>
                                انتهت التجربة
                              </span>
                            );
                          })()}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatDate(client.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="p-1.5 rounded-lg cursor-pointer transition-colors"
                            style={{ color: "var(--blue-primary)" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--blue-soft)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "transparent")
                            }
                            title="عرض التفاصيل"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && clients.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    لا يوجد عملاء
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-1 py-4 px-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "var(--text-secondary)" }}
            >
              <ChevronRight size={18} />
            </button>
            {getPageNumbers().map((pn, i) =>
              pn === "..." ? (
                <span
                  key={`dots-${i}`}
                  className="px-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  className="w-8 h-8 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                  style={{
                    background:
                      page === pn ? "var(--blue-primary)" : "transparent",
                    color: page === pn ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {pn}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "var(--text-secondary)" }}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>}

      {/* ─── Wizard Modal ─────────────────────────────────── */}
      {showWizard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeWizard();
          }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                اضافة عميل جديد
              </h2>
              <button
                onClick={closeWizard}
                className="p-1 rounded-lg cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3 py-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                    style={{
                      background:
                        wizardStep >= step
                          ? "var(--blue-primary)"
                          : "var(--bg-muted)",
                      color:
                        wizardStep >= step ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {wizardStep > step ? <Check size={16} /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className="w-8 h-0.5"
                      style={{
                        background:
                          wizardStep > step
                            ? "var(--blue-primary)"
                            : "var(--border)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="px-6 pb-6">
              {/* Step 1: Owner Data */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    بيانات المالك
                  </p>
                  <InputField
                    label="اسم المشروع"
                    value={wizardData.name}
                    onChange={(v) =>
                      setWizardData((d) => ({ ...d, name: v }))
                    }
                    placeholder="مثال: مولدات النور"
                  />
                  <InputField
                    label="اسم المالك"
                    value={wizardData.owner_name}
                    onChange={(v) =>
                      setWizardData((d) => ({ ...d, owner_name: v }))
                    }
                    placeholder="الاسم الكامل"
                  />
                  <InputField
                    label="رقم الهاتف"
                    value={wizardData.phone}
                    onChange={(v) =>
                      setWizardData((d) => ({ ...d, phone: v }))
                    }
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                  />
                  <InputField
                    label="البريد الالكتروني"
                    value={wizardData.email}
                    onChange={(v) =>
                      setWizardData((d) => ({ ...d, email: v }))
                    }
                    placeholder="email@example.com"
                    dir="ltr"
                    required={false}
                  />
                  <InputField
                    label="كلمة المرور"
                    value={wizardData.password}
                    onChange={(v) =>
                      setWizardData((d) => ({ ...d, password: v }))
                    }
                    placeholder="كلمة مرور قوية"
                    type="password"
                  />
                  {/* Province dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      المحافظة
                    </label>
                    <select
                      value={wizardData.province_key}
                      onChange={(e) => {
                        const prov = getProvinceOptions().find(p => p.key === e.target.value)
                        setWizardData((d) => ({
                          ...d,
                          province_key: e.target.value,
                          district_key: "",
                          governorate: prov?.name || "",
                        }))
                      }}
                      className="w-full h-11 px-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--bg-base)",
                        color: wizardData.province_key ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      <option value="">اختر المحافظة</option>
                      {getProvinceOptions().map((p) => (
                        <option key={p.key} value={p.key}>{p.num} — {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* District dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      القضاء
                    </label>
                    <select
                      value={wizardData.district_key}
                      onChange={(e) => setWizardData((d) => ({ ...d, district_key: e.target.value }))}
                      disabled={!wizardData.province_key}
                      className="w-full h-11 px-3 rounded-xl text-sm outline-none transition-all disabled:opacity-40"
                      style={{
                        border: "1px solid var(--border)",
                        background: "var(--bg-base)",
                        color: wizardData.district_key ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      <option value="">اختر القضاء</option>
                      {getDistrictOptions(wizardData.province_key).map((d) => (
                        <option key={d.key} value={d.key}>{d.num} — {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <InputField
                    label="الحي"
                    value={wizardData.neighborhood}
                    onChange={(v) => setWizardData((d) => ({ ...d, neighborhood: v }))}
                    placeholder="اسم الحي"
                    required={false}
                  />
                  <InputField
                    label="الزقاق"
                    value={wizardData.alley}
                    onChange={(v) => setWizardData((d) => ({ ...d, alley: v }))}
                    placeholder="اسم أو رقم الزقاق"
                    required={false}
                  />
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      الباقة
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(dbPlans.length > 0 ? dbPlans : [
                        { key: "starter", name_ar: "Starter ⚡", color: "#374151", price_monthly_iqd: 0 },
                        { key: "pro", name_ar: "Pro 🚀", color: "#1B4FD8", price_monthly_iqd: 20000 },
                        { key: "business", name_ar: "Business 👑", color: "#D97706", price_monthly_iqd: 30000 },
                        { key: "corporate", name_ar: "Corporate 🏢", color: "#0F766E", price_monthly_iqd: 50000 },
                        { key: "fleet", name_ar: "أسطول", color: "#7C3AED", price_monthly_iqd: 75000 },
                      ]).map((p) => {
                        const isSelected = wizardData.plan === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handlePlanChange(p.key as PlanType)
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            style={{
                              background: isSelected ? p.color : `${p.color}15`,
                              color: isSelected ? "#fff" : p.color,
                              border: isSelected ? `2px solid ${p.color}` : "2px solid transparent",
                            }}
                          >
                            {p.name_ar}
                            {p.price_monthly_iqd === 0 && <span className="mr-1 text-[10px]">مجاني</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Modules */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    الوحدات
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map((mod) => {
                      const checked = wizardData.modules.includes(mod.key);
                      const isDefault =
                        wizardData.plan !== "custom" &&
                        PLAN_DEFAULT_MODULES[wizardData.plan].includes(
                          mod.key
                        );
                      return (
                        <label
                          key={mod.key}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                          style={{
                            background: checked
                              ? "var(--blue-soft)"
                              : "var(--bg-muted)",
                            opacity: isDefault ? 0.7 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isDefault}
                            onChange={() => toggleModule(mod.key)}
                            className="accent-[var(--blue-primary)]"
                          />
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: checked
                                ? "var(--blue-primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {mod.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Limits */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    الحدود
                  </p>
                  <InputField
                    label="الحد الاقصى للمولدات"
                    value={
                      wizardData.max_generators != null
                        ? String(wizardData.max_generators)
                        : ""
                    }
                    onChange={(v) =>
                      setWizardData((d) => ({
                        ...d,
                        max_generators: v ? Number(v) : null,
                      }))
                    }
                    placeholder={
                      wizardData.plan === "custom"
                        ? "ادخل الحد"
                        : "حسب الباقة"
                    }
                    type="number"
                    dir="ltr"
                  />
                  <InputField
                    label="الحد الاقصى للمشتركين"
                    value={
                      wizardData.max_subscribers != null
                        ? String(wizardData.max_subscribers)
                        : ""
                    }
                    onChange={(v) =>
                      setWizardData((d) => ({
                        ...d,
                        max_subscribers: v ? Number(v) : null,
                      }))
                    }
                    placeholder={
                      wizardData.plan === "custom"
                        ? "ادخل الحد"
                        : "حسب الباقة"
                    }
                    type="number"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    مراجعة وتأكيد
                  </p>
                  <div
                    className="rounded-xl p-4 space-y-2 text-sm"
                    style={{
                      background: "var(--bg-muted)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <ReviewRow label="اسم المشروع" value={wizardData.name} />
                    <ReviewRow
                      label="اسم المالك"
                      value={wizardData.owner_name}
                    />
                    <ReviewRow label="الهاتف" value={wizardData.phone} />
                    <ReviewRow
                      label="البريد"
                      value={wizardData.email || "-"}
                    />
                    <ReviewRow
                      label="المحافظة"
                      value={wizardData.governorate || "-"}
                    />
                    {wizardData.district_key && (
                      <ReviewRow
                        label="القضاء"
                        value={getDistrictOptions(wizardData.province_key).find(d => d.key === wizardData.district_key)?.name || "-"}
                      />
                    )}
                    {wizardData.neighborhood && (
                      <ReviewRow label="الحي" value={wizardData.neighborhood} />
                    )}
                    {wizardData.alley && (
                      <ReviewRow label="الزقاق" value={wizardData.alley} />
                    )}
                    <ReviewRow label="الباقة" value={wizardData.plan} />
                    <ReviewRow
                      label="الوحدات"
                      value={`${wizardData.modules.length} وحدة`}
                    />
                    {wizardData.max_generators != null && (
                      <ReviewRow
                        label="حد المولدات"
                        value={String(wizardData.max_generators)}
                      />
                    )}
                    {wizardData.max_subscribers != null && (
                      <ReviewRow
                        label="حد المشتركين"
                        value={String(wizardData.max_subscribers)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6">
                {wizardStep > 1 ? (
                  <button
                    onClick={() => setWizardStep((s) => s - 1)}
                    className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                    style={{
                      background: "var(--bg-muted)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    رجوع
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 4 ? (
                  <button
                    onClick={async () => {
                      // Validate phone uniqueness on step 1 before advancing
                      if (wizardStep === 1 && wizardData.phone.trim()) {
                        try {
                          const res = await fetch(`/api/clients/check-phone?phone=${encodeURIComponent(wizardData.phone.trim())}`)
                          const data = await res.json()
                          if (data.exists) {
                            if (data.is_inactive) {
                              if (confirm('هذا الرقم مسجل لعميل معطّل. هل تريد إعادة تفعيله؟')) {
                                window.location.href = `/clients/${data.tenant_id}`
                              }
                              return
                            }
                            toast.error('رقم الهاتف أو البريد الإلكتروني مستخدم مسبقاً')
                            return
                          }
                        } catch { /* proceed if check fails */ }
                      }
                      setWizardStep((s) => s + 1)
                    }}
                    disabled={!canGoNext()}
                    className="px-5 py-2 rounded-xl text-sm font-medium text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--blue-primary)",
                    }}
                  >
                    التالي
                  </button>
                ) : (
                  <button
                    onClick={submitWizard}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                    }}
                  >
                    {submitting && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    تأكيد الاضافة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--danger)" }}> *</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "var(--border-hover)")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = "var(--border)")
        }
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function TrialManagementView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeId, setUpgradeId] = useState<string | null>(null);
  const [upgradePlan, setUpgradePlan] = useState("pro");
  const [upgrading, setUpgrading] = useState(false);
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("7");
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    fetch("/api/clients/trials")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    if (!upgradeId) return;
    setUpgrading(true);
    try {
      // Use canonical /plan endpoint — writes audit log + billing cycle.
      const res = await fetch(`/api/clients/${upgradeId}/plan`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradePlan, notes: "ترقية من قائمة العملاء التجريبيون" }),
      });
      if (res.ok) { toast.success("تم الترقية"); setUpgradeId(null); setData(null); setLoading(true);
        fetch("/api/clients/trials").then(r => r.json()).then(d => { setData(d); setLoading(false); });
      } else { const err = await res.json().catch(() => null); toast.error(err?.error || "فشل الترقية"); }
    } catch { toast.error("خطأ"); }
    setUpgrading(false);
  };

  const handleExtend = async () => {
    if (!extendId) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/clients/${extendId}/extend-trial`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(extendDays) }),
      });
      if (res.ok) { toast.success("تم التمديد"); setExtendId(null);
        fetch("/api/clients/trials").then(r => r.json()).then(d => setData(d));
      }
    } catch { toast.error("خطأ"); }
    setExtending(false);
  };

  const sendWhatsApp = (t: any) => {
    const days = t.days_remaining > 0 ? t.days_remaining : 0;
    const msg = encodeURIComponent(
      `مرحباً ${t.owner_name} 👋\nنتمنى أن تكون تجربتك مع أمبير ممتازة!\n` +
      (days > 0 ? `باقي ${days} يوم على انتهاء فترتك التجريبية.\n` : `انتهت فترتك التجريبية.\n`) +
      `اشترك الآن واستمر بلا انقطاع 🚀\nللاشتراك: تواصل معنا`
    );
    window.open(`https://wa.me/${t.phone || ""}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--blue-primary)" }} /></div>;
  if (!data) return <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>فشل تحميل البيانات</p>;

  const { stats, trials } = data;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "نشط", value: stats.active_count, color: "#059669", bg: "#F0FDF4" },
          { label: "ينتهي خلال 48 ساعة", value: stats.expiring_48h, color: "#DC2626", bg: "#FEF2F2" },
          { label: "منتهي لم يحوّل", value: stats.expired_not_converted, color: "var(--text-muted)", bg: "var(--bg-muted)" },
          { label: "معدل التحويل", value: `${stats.conversion_rate}%`, color: "var(--blue-primary)", bg: "var(--blue-soft)" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: s.bg }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: s.color }}>{s.label}</p>
            <p className="font-num text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Trials table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["العميل", "المشتركون", "بدأ في", "ينتهي في", "باقي", "إجراءات"].map(h => (
                <th key={h} className="px-3 py-2.5 text-right text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trials.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>لا يوجد عملاء تجريبيون</td></tr>
            ) : trials.map((t: any) => {
              const d = t.days_remaining;
              const rowBg = d > 3 ? "transparent" : d > 0 ? "#FFF7ED08" : "#FEF2F208";
              const badgeColor = d > 3 ? "#059669" : d > 0 ? "#D97706" : "#DC2626";
              const badgeBg = d > 3 ? "#F0FDF4" : d > 0 ? "#FFF7ED" : "#FEF2F2";
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: rowBg }}>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.owner_name} · {t.governorate || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 font-num text-xs">{t.subscribers_count}</td>
                  <td className="px-3 py-2.5 font-num text-xs" style={{ color: "var(--text-muted)" }}>{new Date(t.created_at).toLocaleDateString("en")}</td>
                  <td className="px-3 py-2.5 font-num text-xs" style={{ color: "var(--text-muted)" }}>{t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString("en") : "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: badgeBg, color: badgeColor }}>
                      {d > 0 ? `${d} يوم` : "منتهي"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => sendWhatsApp(t)} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "#ECFDF5", color: "#059669" }}>📱</button>
                      <button onClick={() => { setUpgradeId(t.id); setUpgradePlan("pro"); }} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "var(--blue-soft)", color: "var(--blue-primary)" }}>⬆️</button>
                      <button onClick={() => { setExtendId(t.id); setExtendDays("7"); }} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "#FFF7ED", color: "#D97706" }}>⏰</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upgrade modal */}
      {upgradeId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-bold">ترقية العميل</h3>
            <div className="flex gap-2">
              {[{k:"pro",l:"Pro",c:"var(--blue-primary)"},{k:"business",l:"Business",c:"#D97706"},{k:"corporate",l:"Corporate",c:"#0F766E"},{k:"fleet",l:"Fleet",c:"#7C3AED"}].map(p => (
                <button key={p.k} onClick={() => setUpgradePlan(p.k)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: upgradePlan === p.k ? p.c : "var(--bg-muted)", color: upgradePlan === p.k ? "#fff" : "var(--text-muted)" }}>{p.l}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setUpgradeId(null)} className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>إلغاء</button>
              <button onClick={handleUpgrade} disabled={upgrading} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--blue-primary)" }}>
                {upgrading ? "جاري..." : "تأكيد الترقية"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend modal */}
      {extendId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-bold">تمديد الفترة التجريبية</h3>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>عدد الأيام</label>
              <input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)} dir="ltr"
                className="w-full h-10 px-3 rounded-xl text-sm font-num text-center" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExtendId(null)} className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>إلغاء</button>
              <button onClick={handleExtend} disabled={extending} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: "#D97706" }}>
                {extending ? "جاري..." : "تمديد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
