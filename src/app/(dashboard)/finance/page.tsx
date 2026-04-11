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
  ArrowUpCircle,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  modules?: { module_key: string; is_active: boolean }[];
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

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_WHATSAPP || '9647801234567';

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
    `واتساب: ${SUPPORT_PHONE}`,
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
    duration: "quarterly" as "quarterly" | "biannual" | "annual",
    send_welcome: true,
    auto_invoice: true,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [dbPlans, setDbPlans] = useState<PlanOption[]>([]);

  // Record Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    tenant_id: "",
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentSearchResults, setPaymentSearchResults] = useState<Tenant[]>([]);

  // Upgrade plan modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeClient, setUpgradeClient] = useState<Tenant | null>(null);
  const [upgradePlan, setUpgradePlan] = useState("");
  const [upgradeSendWhatsApp, setUpgradeSendWhatsApp] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Revenue chart
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; count: number }[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

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

  // ─── Fetch Revenue Chart ────────────────────────────────

  const fetchRevenueChart = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const res = await fetch("/api/finance/revenue-chart");
      if (res.ok) {
        const d = await res.json();
        setRevenueData(d.data || []);
      }
    } catch {
      console.error("Failed to fetch revenue chart");
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "summary") fetchRevenueChart();
  }, [activeTab, fetchRevenueChart]);

  // ─── Payment Search ──────────────────────────────────────

  useEffect(() => {
    if (paymentSearch.length < 2) {
      setPaymentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(paymentSearch)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setPaymentSearchResults(data.tenants || []);
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [paymentSearch]);

  // ─── Record Payment Handler ─────────────────────────────

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.tenant_id || !paymentForm.amount || !paymentForm.method) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/finance/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: paymentForm.tenant_id,
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "فشل في تسجيل الدفعة");
      }
      toast.success("تم تسجيل الدفعة بنجاح");
      setShowPaymentModal(false);
      setPaymentForm({ tenant_id: "", amount: "", method: "cash", reference: "", notes: "" });
      setPaymentSearch("");
      fetchStats();
      fetchInvoices();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ─── Upgrade Plan Handler ───────────────────────────────

  const handleUpgradePlan = async () => {
    if (!upgradeClient || !upgradePlan) return;
    setUpgradeLoading(true);
    try {
      const res = await fetch(`/api/clients/${upgradeClient.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradePlan, notes: "ترقية من صفحة الإدارة المالية" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "فشل في ترقية الباقة");
      }
      toast.success("تم ترقية الباقة بنجاح");

      if (upgradeSendWhatsApp && upgradeClient.phone) {
        const planLabel = PLAN_LABELS[upgradePlan] || upgradePlan;
        const message = [
          `مرحباً ${upgradeClient.owner_name}`,
          ``,
          `تم ترقية حسابك في أمبير إلى باقة ${planLabel}`,
          ``,
          `شكراً لثقتكم بأمبير!`,
        ].join("\n");
        let phone = upgradeClient.phone.trim().replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '964' + phone.substring(1);
        else if (!phone.startsWith('964')) phone = '964' + phone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
      }

      setShowUpgradeModal(false);
      setUpgradeClient(null);
      setUpgradePlan("");
      fetchClients();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setUpgradeLoading(false);
    }
  };

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
          duration: createForm.duration,
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
        const baseMonthly = plan?.price_monthly_iqd || 0;
        // Discounts: 3mo=0%, 6mo=5%, 12mo=15% (kept in sync with /api/plans helpers)
        let price = baseMonthly * 3;
        let durationLabel = "3 أشهر";
        if (createForm.duration === "biannual") {
          price = Math.round(baseMonthly * 6 * 0.95);
          durationLabel = "6 أشهر";
        } else if (createForm.duration === "annual") {
          price = Math.round(baseMonthly * 12 * 0.85);
          durationLabel = "سنة";
        }

        const expiryDate = new Date();
        if (createForm.duration === "annual") expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        else if (createForm.duration === "biannual") expiryDate.setMonth(expiryDate.getMonth() + 6);
        else expiryDate.setMonth(expiryDate.getMonth() + 3); // quarterly default

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

        let phone = createForm.phone.trim().replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '964' + phone.substring(1);
        else if (!phone.startsWith('964')) phone = '964' + phone;
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
        duration: "quarterly",
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

          {/* Revenue Chart */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--blue-soft)",
                  color: "var(--blue-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={18} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                الإيرادات الشهرية (آخر 6 أشهر)
              </h3>
            </div>
            {revenueLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : revenueData.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                لا توجد بيانات إيرادات
              </p>
            ) : (
              <div style={{ width: "100%", height: 280, direction: "ltr" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text-primary)",
                        fontSize: 13,
                      }}
                      formatter={(value: any) => [`${formatNumber(value)} د.ع`, "الإيرادات"]}
                      labelFormatter={(label: any) => `شهر ${label}`}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="var(--blue-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
                    {["العميل", "الباقة", "الحالة", "المشتركين", "تاريخ الانتهاء", "تاريخ الإنضمام", ""].map((h) => (
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
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: "14px 16px" }}>
                            <Skeleton width="80px" height="16px" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : clients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                          <td style={{ padding: "14px 16px" }}>
                            {client.plan !== "fleet" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUpgradeClient(client);
                                  // Set default to next plan above current
                                  const planOrder = ["starter", "basic", "pro", "business", "gold", "corporate", "fleet"];
                                  const currentIdx = planOrder.indexOf(client.plan);
                                  const nextPlan = currentIdx >= 0 && currentIdx < planOrder.length - 1 ? planOrder[currentIdx + 1] : "fleet";
                                  setUpgradePlan(nextPlan);
                                  setShowUpgradeModal(true);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "5px 12px",
                                  borderRadius: 8,
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--blue-primary)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: "var(--font-tajawal)",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--blue-soft)";
                                  e.currentTarget.style.borderColor = "var(--blue-primary)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.borderColor = "var(--border)";
                                }}
                              >
                                <ArrowUpCircle size={13} />
                                ترقية
                              </button>
                            )}
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

            <button
              onClick={() => setShowPaymentModal(true)}
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
              <CreditCard size={16} />
              تسجيل دفعة
            </button>
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

              {/* Duration — minimum 3 months, no monthly option */}
              <FormField label="مدة الاشتراك">
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "quarterly" as const, label: "3 أشهر" },
                    { key: "biannual" as const, label: "6 أشهر (-5%)" },
                    { key: "annual" as const, label: "سنوي (-15%)" },
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

      {/* ════════════════ RECORD PAYMENT MODAL ════════════════ */}
      {showPaymentModal && (
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
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                تسجيل دفعة جديدة
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: "var(--bg-muted)", color: "var(--text-muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Tenant search + select */}
              <FormField label="العميل *">
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="ابحث عن العميل..."
                  style={inputStyle}
                />
                {paymentSearch.length >= 2 && paymentSearchResults.length > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      maxHeight: 150,
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "var(--bg-surface)",
                    }}
                  >
                    {paymentSearchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setPaymentForm((f) => ({ ...f, tenant_id: c.id }));
                            setPaymentSearch(`${c.name} — ${c.owner_name}`);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 13,
                            background: paymentForm.tenant_id === c.id ? "var(--blue-soft)" : "transparent",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = paymentForm.tenant_id === c.id ? "var(--blue-soft)" : "transparent")}
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</span>
                          <span style={{ color: "var(--text-muted)", marginInlineStart: 8 }}>{c.owner_name} · {c.phone}</span>
                        </div>
                      ))}
                  </div>
                )}
                {paymentForm.tenant_id && (
                  <p style={{ fontSize: 11, color: "var(--success)", margin: "4px 0 0" }}>
                    تم اختيار العميل
                  </p>
                )}
              </FormField>

              {/* Amount */}
              <FormField label="المبلغ (د.ع) *">
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="مثال: 35000"
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: "left", fontFamily: "var(--font-rajdhani)" }}
                />
              </FormField>

              {/* Method */}
              <FormField label="طريقة الدفع *">
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "cash", label: "نقدي" },
                    { key: "bank_transfer", label: "حوالة مصرفية" },
                    { key: "card", label: "بطاقة" },
                  ].map((m) => {
                    const isSelected = paymentForm.method === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentForm((f) => ({ ...f, method: m.key }))}
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
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              {/* Reference */}
              <FormField label="رقم المرجع (اختياري)">
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="رقم الحوالة أو المرجع"
                  dir="ltr"
                  style={{ ...inputStyle, textAlign: "left" }}
                />
              </FormField>

              {/* Notes */}
              <FormField label="ملاحظات (اختياري)">
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية"
                  style={inputStyle}
                />
              </FormField>

              <button
                type="submit"
                disabled={paymentLoading || !paymentForm.tenant_id}
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
                  cursor: paymentLoading || !paymentForm.tenant_id ? "not-allowed" : "pointer",
                  opacity: paymentLoading || !paymentForm.tenant_id ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {paymentLoading && <Loader2 size={16} className="animate-spin" />}
                {paymentLoading ? "جاري التسجيل..." : "تسجيل الدفعة"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ UPGRADE PLAN MODAL ════════════════ */}
      {showUpgradeModal && upgradeClient && (
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
          onClick={() => { setShowUpgradeModal(false); setUpgradeClient(null); }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                ترقية باقة العميل
              </h2>
              <button
                onClick={() => { setShowUpgradeModal(false); setUpgradeClient(null); }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: "var(--bg-muted)", color: "var(--text-muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Client info */}
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--bg-elevated)",
                marginBottom: 20,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {upgradeClient.name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {upgradeClient.owner_name} · الباقة الحالية:{" "}
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {PLAN_LABELS[upgradeClient.plan] || upgradeClient.plan}
                </span>
              </p>
            </div>

            {/* Plan options */}
            <FormField label="الباقة الجديدة">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const planOrder = ["starter", "basic", "pro", "business", "gold", "corporate", "fleet"];
                  const currentIdx = planOrder.indexOf(upgradeClient.plan);
                  const higherPlans = planOrder.filter((_, i) => i > currentIdx);
                  const plansToShow = dbPlans.length > 0
                    ? dbPlans.filter((p) => higherPlans.includes(p.key))
                    : higherPlans.map((key) => ({ key, name_ar: PLAN_LABELS[key] || key, price_monthly_iqd: 0, price_annual_iqd: null, max_generators: 0, max_subscribers: 0, modules: [] }));

                  return plansToShow.map((plan) => {
                    const isSelected = upgradePlan === plan.key;
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
                          name="upgrade-plan"
                          value={plan.key}
                          checked={isSelected}
                          onChange={() => setUpgradePlan(plan.key)}
                          style={{ accentColor: "var(--blue-primary)" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                              {plan.name_ar || PLAN_LABELS[plan.key] || plan.key}
                            </span>
                            {plan.price_monthly_iqd > 0 && (
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  fontFamily: "var(--font-rajdhani)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {formatNumber(plan.price_monthly_iqd)} د.ع/شهر
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  });
                })()}
              </div>
            </FormField>

            {/* WhatsApp checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "var(--text-secondary)",
                cursor: "pointer",
                marginTop: 16,
              }}
            >
              <input
                type="checkbox"
                checked={upgradeSendWhatsApp}
                onChange={(e) => setUpgradeSendWhatsApp(e.target.checked)}
                style={{ accentColor: "var(--blue-primary)", width: 16, height: 16 }}
              />
              <Send size={14} />
              إرسال إشعار واتساب
            </label>

            {/* Submit */}
            <button
              onClick={handleUpgradePlan}
              disabled={upgradeLoading || !upgradePlan}
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
                cursor: upgradeLoading || !upgradePlan ? "not-allowed" : "pointer",
                opacity: upgradeLoading || !upgradePlan ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 16,
              }}
            >
              {upgradeLoading && <Loader2 size={16} className="animate-spin" />}
              {upgradeLoading ? "جاري الترقية..." : "ترقية الباقة"}
            </button>
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
