"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Banknote,
  Users,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Bell,
  TrendingUp,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface FinanceStats {
  monthly_revenue: number;
  active_tenants: number;
  overdue_tenants: number;
  expiring_soon: number;
  total_clients: number;
}

interface Tenant {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  plan: string;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  locked_at: string | null;
  created_at: string;
  _count?: { subscribers: number };
}

interface Invoice {
  id: string;
  tenant_id: string;
  amount: string;
  discount_amount: string;
  final_amount: string;
  plan: string;
  period_start: string;
  period_end: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  tenant: {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
  };
}

interface AlertItem {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  plan: string;
  type: "overdue" | "expiring" | "trial_ending" | "recently_paid";
  date: string;
  amount?: number;
  method?: string;
  tenant_id?: string;
}

interface AlertsData {
  overdue: AlertItem[];
  expiring: AlertItem[];
  trial_ending: AlertItem[];
  recently_paid: AlertItem[];
}

interface PlanOption {
  key: string;
  name_ar: string;
  price_monthly_iqd: number;
  price_annual_iqd: number | null;
  max_generators: number;
  max_subscribers: number;
  modules: string[];
}

type TabKey = "summary" | "clients" | "invoices" | "alerts";

// ─── Constants ───────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  corporate: "Corporate",
  fleet: "Fleet",
  custom: "مخصص",
  basic: "أساسي",
  gold: "ذهبي",
  trial: "تجريبي",
};

const PLAN_BADGE: Record<string, { bg: string; color: string }> = {
  starter: { bg: "#F3F4F6", color: "#374151" },
  pro: { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
  business: { bg: "var(--gold-soft)", color: "var(--gold)" },
  corporate: { bg: "#F0FDFA", color: "#0F766E" },
  fleet: { bg: "var(--violet-soft)", color: "var(--violet)" },
  custom: { bg: "#F1F5F9", color: "#64748B" },
  basic: { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
  gold: { bg: "var(--gold-soft)", color: "var(--gold)" },
  trial: { bg: "#F3F4F6", color: "#374151" },
};

const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "ذي قار", "بابل",
  "ديالى", "الأنبار", "كركوك", "صلاح الدين", "واسط", "المثنى", "ميسان",
  "القادسية", "دهوك", "السليمانية",
];

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────

function formatNumber(n: number | string): string {
  return Number(n).toLocaleString("en-US");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusInfo(t: Tenant): { label: string; bg: string; color: string } {
  if (t.locked_at) return { label: "منتهي", bg: "#F3F4F6", color: "#6B7280" };
  if (t.is_trial) return { label: "تجربة", bg: "var(--blue-soft)", color: "var(--blue-primary)" };
  if (t.subscription_ends_at && new Date(t.subscription_ends_at) < new Date()) {
    return { label: "متأخر", bg: "#FEE2E2", color: "#DC2626" };
  }
  if (t.is_active) return { label: "مدفوع", bg: "#D1FAE5", color: "#059669" };
  return { label: "منتهي", bg: "#F3F4F6", color: "#6B7280" };
}

function Skeleton({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: "linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-elevated) 50%, var(--bg-muted) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

// ─── Welcome Message Builder ─────────────────────────────────

function buildWelcomeMessage(data: {
  name: string;
  owner_name: string;
  plan: string;
  planLabel: string;
  price: number;
  duration: string;
  durationLabel: string;
  expiryDate: string;
  features: string[];
  nextPlan?: { name: string; price: number };
}): string {
  const lines = [
    `مرحباً ${data.owner_name} 👋`,
    ``,
    `تم إنشاء حسابك في أمبير بنجاح! 🎉`,
    ``,
    `📋 تفاصيل الحساب:`,
    `• اسم المولدة: ${data.name}`,
    `• الباقة: ${data.planLabel}`,
    `• السعر: ${formatNumber(data.price)} د.ع/${data.durationLabel}`,
    `• تاريخ الانتهاء: ${data.expiryDate}`,
    ``,
    `✅ مميزات باقتك:`,
    ...data.features.map(f => `• ${f}`),
  ];

  if (data.nextPlan) {
    lines.push(
      ``,
      `⬆️ ترقية للباقة الأعلى (${data.nextPlan.name}):`,
      `فقط ${formatNumber(data.nextPlan.price)} د.ع/شهرياً`,
    );
  }

  lines.push(
    ``,
    `📞 الدعم الفني:`,
    `واتساب: 07801234567`,
    ``,
    `شكراً لاختياركم أمبير! ⚡`,
  );

  return lines.join("\n");
}

// ─── Main Component ──────────────────────────────────────────

export default function FinancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  // Stats
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Clients tab
  const [clients, setClients] = useState<Tenant[]>([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPlanFilter, setClientPlanFilter] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("");

  // Invoices tab
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPages, setInvoicesPages] = useState(1);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");

  // Alerts tab
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Create client modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    password: "",
    governorate: "",
    plan: "pro",
    duration: "monthly" as "monthly" | "quarterly" | "annual",
    send_welcome: true,
    auto_invoice: true,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [dbPlans, setDbPlans] = useState<PlanOption[]>([]);

  // ─── Fetch Plans ─────────────────────────────────────────

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        const plans = (d.plans || []).filter((p: any) => p.key !== "custom");
        const seen = new Set<string>();
        setDbPlans(
          plans.filter((p: any) => {
            if (seen.has(p.key)) return false;
            seen.add(p.key);
            return true;
          })
        );
      })
      .catch(() => {});
  }, []);

  // ─── Fetch Stats ─────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/finance/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      console.error("Failed to fetch finance stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Fetch Clients ───────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(clientsPage),
        limit: String(PAGE_SIZE),
      });
      if (clientSearch) params.set("search", clientSearch);
      if (clientPlanFilter) params.set("plan", clientPlanFilter);
      if (clientStatusFilter) params.set("status", clientStatusFilter);

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.tenants || data.data || []);
        setClientsTotal(data.total);
      }
    } catch {
      console.error("Failed to fetch clients");
    } finally {
      setClientsLoading(false);
    }
  }, [clientsPage, clientSearch, clientPlanFilter, clientStatusFilter]);

  useEffect(() => {
    if (activeTab === "clients") fetchClients();
  }, [activeTab, fetchClients]);

  useEffect(() => {
    setClientsPage(1);
  }, [clientSearch, clientPlanFilter, clientStatusFilter]);

  // ─── Fetch Invoices ──────────────────────────────────────

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(invoicesPage),
        limit: "20",
      });
      if (invoiceStatusFilter === "paid") params.set("is_paid", "true");
      if (invoiceStatusFilter === "pending") params.set("is_paid", "false");

      const res = await fetch(`/api/billing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setInvoicesTotal(data.total || 0);
        setInvoicesPages(data.pages || 1);
      }
    } catch {
      console.error("Failed to fetch invoices");
    } finally {
      setInvoicesLoading(false);
    }
  }, [invoicesPage, invoiceStatusFilter]);

  useEffect(() => {
    if (activeTab === "invoices") fetchInvoices();
  }, [activeTab, fetchInvoices]);

  // ─── Fetch Alerts ────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/finance/alerts");
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch {
      console.error("Failed to fetch alerts");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "alerts") fetchAlerts();
  }, [activeTab, fetchAlerts]);

  // ─── Create Client Handler ───────────────────────────────

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.owner_name || !createForm.phone || !createForm.password) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setCreateLoading(true);
    try {
      const selectedPlan = dbPlans.find((p) => p.key === createForm.plan);
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          owner_name: createForm.owner_name,
          phone: createForm.phone,
          password: createForm.password,
          governorate: createForm.governorate || undefined,
          plan: createForm.plan,
          modules: selectedPlan?.modules || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "فشل في إنشاء العميل");
      }

      toast.success("تم إنشاء العميل بنجاح");

      // Send welcome WhatsApp if checked
      if (createForm.send_welcome && createForm.phone) {
        const plan = dbPlans.find((p) => p.key === createForm.plan);
        let price = plan?.price_monthly_iqd || 0;
        let durationLabel = "شهر";
        if (createForm.duration === "quarterly") {
          price = Math.round(price * 3 * 0.9);
          durationLabel = "3 أشهر";
        } else if (createForm.duration === "annual") {
          price = Math.round(price * 12 * 0.8);
          durationLabel = "سنة";
        }

        const expiryDate = new Date();
        if (createForm.duration === "monthly") expiryDate.setMonth(expiryDate.getMonth() + 1);
        else if (createForm.duration === "quarterly") expiryDate.setMonth(expiryDate.getMonth() + 3);
        else expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const MODULE_LABELS: Record<string, string> = {
          subscriber_management: "إدارة المشتركين",
          basic_invoicing: "الفوترة الأساسية",
          pos: "نقاط البيع",
          reports: "التقارير",
          wallet: "المحفظة",
          whatsapp: "واتساب",
          engine_tracking: "تتبع المحركات",
          daily_brief: "التقرير اليومي",
          subscriber_app: "تطبيق المشترك",
          ai_reports: "تقارير AI",
          multi_branch: "الفروع المتعددة",
          gps: "GPS",
          iot_monitoring: "مراقبة IoT",
          fuel_sensor: "حساس الوقود",
          temperature_sensor: "حساس الحرارة",
          operator_app: "تطبيق المشغل",
        };

        const features = (plan?.modules || []).map(
          (m: string) => MODULE_LABELS[m] || m
        );

        // Find next plan for upsell
        const planOrder = ["starter", "pro", "business", "corporate", "fleet"];
        const currentIdx = planOrder.indexOf(createForm.plan);
        const nextPlanKey = currentIdx >= 0 && currentIdx < planOrder.length - 1 ? planOrder[currentIdx + 1] : null;
        const nextPlan = nextPlanKey ? dbPlans.find((p) => p.key === nextPlanKey) : null;

        const message = buildWelcomeMessage({
          name: createForm.name,
          owner_name: createForm.owner_name,
          plan: createForm.plan,
          planLabel: PLAN_LABELS[createForm.plan] || createForm.plan,
          price,
          duration: createForm.duration,
          durationLabel,
          expiryDate: expiryDate.toLocaleDateString("ar-IQ"),
          features,
          nextPlan: nextPlan
            ? { name: PLAN_LABELS[nextPlan.key] || nextPlan.key, price: nextPlan.price_monthly_iqd }
            : undefined,
        });

        const phone = createForm.phone.replace(/^0/, "964");
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        owner_name: "",
        phone: "",
        password: "",
        governorate: "",
        plan: "pro",
        duration: "monthly",
        send_welcome: true,
        auto_invoice: true,
      });
      fetchClients();
      fetchStats();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Tab Definitions ─────────────────────────────────────

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "summary", label: "الملخص المالي", icon: <TrendingUp size={16} /> },
    { key: "clients", label: "العملاء والاشتراكات", icon: <Users size={16} /> },
    { key: "invoices", label: "الفواتير", icon: <FileText size={16} /> },
    { key: "alerts", label: "التنبيهات", icon: <Bell size={16} /> },
  ];

  const clientsTotalPages = Math.ceil(clientsTotal / PAGE_SIZE);

  // ─── Summary Cards ───────────────────────────────────────

  const summaryCards = [
    {
      label: "إيرادات هذا الشهر",
      value: stats ? formatNumber(stats.monthly_revenue) : "0",
      suffix: "د.ع",
      icon: <Banknote size={22} />,
      iconBg: "var(--gold-soft)",
      iconColor: "var(--gold)",
    },
    {
      label: "عملاء نشطون",
      value: stats?.active_tenants ?? 0,
      icon: <Users size={22} />,
      iconBg: "#D1FAE5",
      iconColor: "var(--success)",
    },
    {
      label: "مدفوعات متأخرة",
      value: stats?.overdue_tenants ?? 0,
      icon: <AlertTriangle size={22} />,
      iconBg: "#FEE2E2",
      iconColor: "var(--danger)",
    },
    {
      label: "ينتهي قريباً",
      value: stats?.expiring_soon ?? 0,
      icon: <Clock size={22} />,
      iconBg: "var(--gold-soft)",
      iconColor: "var(--warning)",
    },
  ];

  // ─── Render ──────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              fontFamily: "var(--font-tajawal)",
            }}
          >
            الإدارة المالية
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "6px 0 0" }}>
            إدارة العملاء والاشتراكات والفواتير
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-elevated)",
          borderRadius: 14,
          padding: 4,
          width: "fit-content",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: activeTab === tab.key ? "var(--bg-surface)" : "transparent",
              color: activeTab === tab.key ? "var(--blue-primary)" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontFamily: "var(--font-tajawal)",
              cursor: "pointer",
              boxShadow: activeTab === tab.key ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB 1: SUMMARY ════════════════ */}
      {activeTab === "summary" && (
        <>
          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {summaryCards.map((card, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: card.iconBg,
                    color: card.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, marginBottom: 4 }}>
                    {card.label}
                  </p>
                  {statsLoading ? (
                    <Skeleton width="80px" height="28px" />
                  ) : (
                    <p
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        fontFamily: "var(--font-rajdhani)",
                        color: "var(--text-primary)",
                        margin: 0,
                        direction: "ltr",
                        textAlign: "right",
                      }}
                    >
                      {card.value}
                      {card.suffix && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginInlineStart: 4 }}>
                          {card.suffix}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <button
              onClick={() => setActiveTab("clients")}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "right",
                transition: "all 0.2s",
              }}
            >
              <Users size={24} style={{ color: "var(--blue-primary)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>
                إدارة العملاء
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                عرض وإدارة جميع العملاء والاشتراكات
              </p>
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "right",
                transition: "all 0.2s",
              }}
            >
              <FileText size={24} style={{ color: "var(--gold)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>
                الفواتير
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                عرض وإدارة جميع الفواتير
              </p>
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "right",
                transition: "all 0.2s",
              }}
            >
              <Bell size={24} style={{ color: "var(--danger)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>
                التنبيهات
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                {stats ? `${stats.overdue_tenants} متأخر · ${stats.expiring_soon} ينتهي قريباً` : "تحميل..."}
              </p>
            </button>
          </div>
        </>
      )}

      {/* ════════════════ TAB 2: CLIENTS ════════════════ */}
      {activeTab === "clients" && (
        <>
          {/* Filters Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 360 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  paddingRight: 36,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontFamily: "var(--font-tajawal)",
                  outline: "none",
                }}
              />
            </div>

            {/* Plan filter */}
            <select
              value={clientPlanFilter}
              onChange={(e) => setClientPlanFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-tajawal)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">جميع الباقات</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="corporate">Corporate</option>
              <option value="fleet">Fleet</option>
              <option value="custom">مخصص</option>
            </select>

            {/* Status filter */}
            <select
              value={clientStatusFilter}
              onChange={(e) => setClientStatusFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-tajawal)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="trial">تجربة</option>
              <option value="locked">موقوف</option>
            </select>

            <div style={{ flex: 1 }} />

            {/* Create Client Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-tajawal)",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(27,79,216,0.3)",
              }}
            >
              <Plus size={16} />
              إنشاء عميل جديد
            </button>
          </div>

          {/* Clients Table */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    {["العميل", "الباقة", "الحالة", "المشتركين", "تاريخ الانتهاء", "تاريخ الإنضمام"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: "14px 16px" }}>
                            <Skeleton width="80px" height="16px" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : clients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}
                      >
                        لا يوجد عملاء
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => {
                      const status = getStatusInfo(client);
                      const badge = PLAN_BADGE[client.plan] || PLAN_BADGE.custom;
                      return (
                        <tr
                          key={client.id}
                          onClick={() => router.push(`/clients/${client.id}`)}
                          style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                {client.name}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                                {client.owner_name} · {client.phone}
                              </p>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {PLAN_LABELS[client.plan] || client.plan}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: status.bg,
                                color: status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              fontFamily: "var(--font-rajdhani)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {client._count?.subscribers ?? "—"}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {client.subscription_ends_at ? formatDate(client.subscription_ends_at) : client.trial_ends_at ? formatDate(client.trial_ends_at) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(client.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {clientsTotalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  disabled={clientsPage <= 1}
                  onClick={() => setClientsPage((p) => Math.max(1, p - 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: clientsPage <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: clientsPage <= 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={16} />
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    padding: "0 8px",
                    fontFamily: "var(--font-rajdhani)",
                  }}
                >
                  {clientsPage} / {clientsTotalPages}
                </span>
                <button
                  disabled={clientsPage >= clientsTotalPages}
                  onClick={() => setClientsPage((p) => Math.min(clientsTotalPages, p + 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: clientsPage >= clientsTotalPages ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: clientsPage >= clientsTotalPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════ TAB 3: INVOICES ════════════════ */}
      {activeTab === "invoices" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => {
                setInvoiceStatusFilter(e.target.value);
                setInvoicesPage(1);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-tajawal)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">جميع الحالات</option>
              <option value="paid">مدفوعة</option>
              <option value="pending">معلقة</option>
            </select>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              إجمالي: {invoicesTotal} فاتورة
            </span>
          </div>

          {/* Invoices Table */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    {["العميل", "الباقة", "المبلغ", "الخصم", "الصافي", "الحالة", "تاريخ الإصدار"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: "14px 16px" }}>
                            <Skeleton width="80px" height="16px" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}
                      >
                        لا توجد فواتير
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const badge = PLAN_BADGE[inv.plan] || PLAN_BADGE.custom;
                      return (
                        <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                {inv.tenant?.name || "—"}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                                {inv.tenant?.owner_name}
                              </p>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {PLAN_LABELS[inv.plan] || inv.plan}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              fontFamily: "var(--font-rajdhani)",
                              color: "var(--text-primary)",
                              direction: "ltr",
                              textAlign: "right",
                            }}
                          >
                            {formatNumber(inv.amount)}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              fontFamily: "var(--font-rajdhani)",
                              color: Number(inv.discount_amount) > 0 ? "var(--danger)" : "var(--text-muted)",
                              direction: "ltr",
                              textAlign: "right",
                            }}
                          >
                            {Number(inv.discount_amount) > 0 ? `-${formatNumber(inv.discount_amount)}` : "0"}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 14,
                              fontWeight: 700,
                              fontFamily: "var(--font-rajdhani)",
                              color: "var(--text-primary)",
                              direction: "ltr",
                              textAlign: "right",
                            }}
                          >
                            {formatNumber(inv.final_amount)}{" "}
                            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>د.ع</span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: inv.is_paid ? "#D1FAE5" : "var(--gold-soft)",
                                color: inv.is_paid ? "var(--success)" : "var(--warning)",
                              }}
                            >
                              {inv.is_paid ? "مدفوعة" : "معلقة"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              fontSize: 13,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(inv.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoicesPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  disabled={invoicesPage <= 1}
                  onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: invoicesPage <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: invoicesPage <= 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={16} />
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    padding: "0 8px",
                    fontFamily: "var(--font-rajdhani)",
                  }}
                >
                  {invoicesPage} / {invoicesPages}
                </span>
                <button
                  disabled={invoicesPage >= invoicesPages}
                  onClick={() => setInvoicesPage((p) => Math.min(invoicesPages, p + 1))}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: invoicesPage >= invoicesPages ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: invoicesPage >= invoicesPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════ TAB 4: ALERTS ════════════════ */}
      {activeTab === "alerts" && (
        <>
          {alertsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-surface)",
                    borderRadius: 16,
                    padding: 20,
                    border: "1px solid var(--border)",
                  }}
                >
                  <Skeleton width="200px" height="20px" />
                  <div style={{ marginTop: 16 }}>
                    <Skeleton width="100%" height="48px" />
                  </div>
                </div>
              ))}
            </div>
          ) : !alerts ? (
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              فشل في تحميل التنبيهات
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Overdue */}
              <AlertSection
                title="متأخرات الدفع"
                icon={<AlertCircle size={18} />}
                iconColor="var(--danger)"
                iconBg="#FEE2E2"
                items={alerts.overdue}
                emptyText="لا توجد متأخرات"
                badgeColor="#DC2626"
                badgeBg="#FEE2E2"
                badgeLabel="متأخر"
                onItemClick={(id) => router.push(`/clients/${id}`)}
              />

              {/* Expiring */}
              <AlertSection
                title="ينتهي خلال 7 أيام"
                icon={<Clock size={18} />}
                iconColor="var(--warning)"
                iconBg="var(--gold-soft)"
                items={alerts.expiring}
                emptyText="لا توجد اشتراكات تنتهي قريباً"
                badgeColor="#D97706"
                badgeBg="var(--gold-soft)"
                badgeLabel="ينتهي قريباً"
                onItemClick={(id) => router.push(`/clients/${id}`)}
              />

              {/* Trial Ending */}
              <AlertSection
                title="تجارب تنتهي قريباً"
                icon={<Info size={18} />}
                iconColor="var(--blue-primary)"
                iconBg="var(--blue-soft)"
                items={alerts.trial_ending}
                emptyText="لا توجد تجارب تنتهي قريباً"
                badgeColor="var(--blue-primary)"
                badgeBg="var(--blue-soft)"
                badgeLabel="تجربة"
                onItemClick={(id) => router.push(`/clients/${id}`)}
              />

              {/* Recently Paid */}
              <AlertSection
                title="مدفوعات حديثة (آخر 3 أيام)"
                icon={<CheckCircle2 size={18} />}
                iconColor="var(--success)"
                iconBg="#D1FAE5"
                items={alerts.recently_paid}
                emptyText="لا توجد مدفوعات حديثة"
                badgeColor="#059669"
                badgeBg="#D1FAE5"
                badgeLabel="مدفوع"
                onItemClick={(id) => router.push(`/clients/${id}`)}
                showAmount
              />
            </div>
          )}
        </>
      )}

      {/* ════════════════ CREATE CLIENT MODAL ════════════════ */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                إنشاء عميل جديد
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--bg-muted)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name */}
              <FormField label="اسم المولدة *">
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: مولدة الأمل"
                  style={inputStyle}
                />
              </FormField>

              {/* Owner */}
              <FormField label="اسم المالك *">
                <input
                  type="text"
                  required
                  value={createForm.owner_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, owner_name: e.target.value }))}
                  placeholder="مثال: أحمد محمد"
                  style={inputStyle}
                />
              </FormField>

              {/* Phone */}
              <FormField label="رقم الهاتف *">
                <input
                  type="tel"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: "left" }}
                />
              </FormField>

              {/* Governorate */}
              <FormField label="المحافظة">
                <select
                  value={createForm.governorate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, governorate: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">اختر المحافظة</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </FormField>

              {/* Password */}
              <FormField label="كلمة المرور *">
                <input
                  type="text"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="كلمة مرور الحساب"
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: "left", fontFamily: "var(--font-rajdhani)" }}
                />
              </FormField>

              {/* Plan Selection */}
              <FormField label="الباقة *">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dbPlans.length > 0 ? (
                    dbPlans.map((plan) => {
                      const isSelected = createForm.plan === plan.key;
                      return (
                        <label
                          key={plan.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: `2px solid ${isSelected ? "var(--blue-primary)" : "var(--border)"}`,
                            background: isSelected ? "var(--blue-soft)" : "transparent",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio"
                            name="plan"
                            value={plan.key}
                            checked={isSelected}
                            onChange={() => setCreateForm((f) => ({ ...f, plan: plan.key }))}
                            style={{ accentColor: "var(--blue-primary)" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                {plan.name_ar || PLAN_LABELS[plan.key] || plan.key}
                              </span>
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  fontFamily: "var(--font-rajdhani)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {plan.price_monthly_iqd > 0
                                  ? `${formatNumber(plan.price_monthly_iqd)} د.ع/شهر`
                                  : "حسب الطلب"}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                              {plan.max_generators} مولدة · {plan.max_subscribers} مشترك
                            </p>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    // Fallback static plans
                    ["starter", "pro", "business", "corporate", "fleet"].map((key) => {
                      const isSelected = createForm.plan === key;
                      return (
                        <label
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: `2px solid ${isSelected ? "var(--blue-primary)" : "var(--border)"}`,
                            background: isSelected ? "var(--blue-soft)" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="plan"
                            value={key}
                            checked={isSelected}
                            onChange={() => setCreateForm((f) => ({ ...f, plan: key }))}
                            style={{ accentColor: "var(--blue-primary)" }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {PLAN_LABELS[key] || key}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </FormField>

              {/* Duration */}
              <FormField label="مدة الاشتراك">
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "monthly" as const, label: "شهري" },
                    { key: "quarterly" as const, label: "3 أشهر (-10%)" },
                    { key: "annual" as const, label: "سنوي (-20%)" },
                  ].map((d) => {
                    const isSelected = createForm.duration === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, duration: d.key }))}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: `2px solid ${isSelected ? "var(--blue-primary)" : "var(--border)"}`,
                          background: isSelected ? "var(--blue-soft)" : "transparent",
                          color: isSelected ? "var(--blue-primary)" : "var(--text-secondary)",
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          fontFamily: "var(--font-tajawal)",
                          cursor: "pointer",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              {/* Checkboxes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createForm.send_welcome}
                    onChange={(e) => setCreateForm((f) => ({ ...f, send_welcome: e.target.checked }))}
                    style={{ accentColor: "var(--blue-primary)", width: 16, height: 16 }}
                  />
                  <Send size={14} />
                  إرسال بكج ترحيبي عبر واتساب
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createForm.auto_invoice}
                    onChange={(e) => setCreateForm((f) => ({ ...f, auto_invoice: e.target.checked }))}
                    style={{ accentColor: "var(--blue-primary)", width: 16, height: 16 }}
                  />
                  <FileText size={14} />
                  إنشاء فاتورة تلقائياً
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={createLoading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "var(--font-tajawal)",
                  cursor: createLoading ? "not-allowed" : "pointer",
                  opacity: createLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {createLoading && <Loader2 size={16} className="animate-spin" />}
                {createLoading ? "جاري الإنشاء..." : "إنشاء العميل"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Components ─────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  fontSize: 14,
  fontFamily: "var(--font-tajawal)",
  outline: "none",
  boxSizing: "border-box",
};

function AlertSection({
  title,
  icon,
  iconColor,
  iconBg,
  items,
  emptyText,
  badgeColor,
  badgeBg,
  badgeLabel,
  onItemClick,
  showAmount,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  items: AlertItem[];
  emptyText: string;
  badgeColor: string;
  badgeBg: string;
  badgeLabel: string;
  onItemClick: (id: string) => void;
  showAmount?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderBottom: items.length > 0 ? "1px solid var(--border)" : "none",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {title}
        </span>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-rajdhani)",
            background: iconBg,
            color: iconColor,
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          {emptyText}
        </div>
      ) : (
        <div>
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onItemClick(item.tenant_id || item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {item.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  {item.owner_name} · {item.phone}
                </p>
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: PLAN_BADGE[item.plan]?.bg || "#F3F4F6",
                  color: PLAN_BADGE[item.plan]?.color || "#64748B",
                }}
              >
                {PLAN_LABELS[item.plan] || item.plan}
              </span>
              {showAmount && item.amount != null && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-rajdhani)",
                    color: "var(--text-primary)",
                    direction: "ltr",
                  }}
                >
                  {formatNumber(item.amount)}{" "}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>د.ع</span>
                </span>
              )}
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  background: badgeBg,
                  color: badgeColor,
                }}
              >
                {badgeLabel}
              </span>
              {item.date && (
                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(item.date)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
