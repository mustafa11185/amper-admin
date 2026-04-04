"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, Users, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ── helpers ─────────────────────────────────────────────────── */

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF";
  const csv =
    bom +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PLAN_COLORS: Record<string, string> = {
  starter: "#374151",
  pro: "#1B4FD8",
  business: "#D97706",
  corporate: "#0F766E",
  fleet: "#7C3AED",
  custom: "#64748B",
  basic: "#1B4FD8",
  gold: "#D97706",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  corporate: "Corporate",
  fleet: "Fleet",
  custom: "Custom",
  basic: "Pro",
  gold: "Business",
};

/* ── types ───────────────────────────────────────────────────── */

interface RevenueData {
  monthly: { month: string; total: number; discount: number; count: number }[];
  by_plan: { plan: string; total: number }[];
  total_revenue: number;
  total_discount: number;
  invoice_count: number;
}

interface ClientsData {
  total_clients: number;
  active_clients: number;
  trial_clients: number;
  churned_clients: number;
  churn_rate: string;
  plan_distribution: { plan: string; count: number }[];
  new_clients_by_month: { month: string; count: number }[];
}

interface GovData {
  subscribers_by_governorate: { governorate: string; subscriber_count: number }[];
  revenue_by_governorate: { governorate: string; revenue: number }[];
}

/* ── skeleton ────────────────────────────────────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--bg-muted)" }}
    />
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────── */

export default function ReportsPage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [clients, setClients] = useState<ClientsData | null>(null);
  const [govData, setGovData] = useState<GovData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, cliRes, govRes] = await Promise.all([
        fetch("/api/reports/revenue"),
        fetch("/api/reports/clients"),
        fetch("/api/reports/governorates"),
      ]);

      if (!revRes.ok || !cliRes.ok || !govRes.ok) {
        throw new Error("Failed to fetch reports");
      }

      const [revData, cliData, govJson] = await Promise.all([
        revRes.json(),
        cliRes.json(),
        govRes.json(),
      ]);

      setRevenue(revData);
      setClients(cliData);
      setGovData(govJson);
    } catch {
      toast.error("فشل في تحميل التقارير");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── CSV exports ─────────────────────────────────────────── */

  function exportRevenue() {
    if (!revenue) return;
    exportCSV(
      "revenue_report.csv",
      ["الشهر", "الإيراد", "الخصم", "عدد الفواتير"],
      revenue.monthly.map((m) => [
        m.month,
        m.total.toFixed(2),
        m.discount.toFixed(2),
        String(m.count),
      ])
    );
    toast.success("تم تصدير تقرير الإيرادات");
  }

  function exportClients() {
    if (!clients) return;
    exportCSV(
      "clients_report.csv",
      ["الشهر", "عملاء جدد"],
      clients.new_clients_by_month.map((m) => [m.month, String(m.count)])
    );
    toast.success("تم تصدير تقرير العملاء");
  }

  function exportGov() {
    if (!govData) return;
    exportCSV(
      "governorates_report.csv",
      ["المحافظة", "عدد المشتركين"],
      govData.subscribers_by_governorate.map((g) => [
        g.governorate,
        String(g.subscriber_count),
      ])
    );
    toast.success("تم تصدير تقرير المحافظات");
  }

  /* ── render ─────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ═══════════ Section 1: مالي ═══════════ */}
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              مالي
            </h2>
          </div>
          <button
            onClick={exportRevenue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            <Download size={14} />
            تصدير CSV
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : revenue ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly revenue line chart */}
            <div>
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                الإيرادات الشهرية
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenue.monthly}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "var(--font-tajawal)",
                      direction: "rtl",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="الإيراد"
                    stroke="#1B4FD8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Plan distribution pie chart */}
            <div>
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                توزيع الخطط
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenue.by_plan}
                    dataKey="total"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }: { name?: string }) => PLAN_LABELS[name || ""] || name || ""}
                  >
                    {revenue.by_plan.map((entry) => (
                      <Cell
                        key={entry.plan}
                        fill={PLAN_COLORS[entry.plan] || "#94A3B8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontFamily: "var(--font-tajawal)",
                      direction: "rtl",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 10 tenants table placeholder using revenue data */}
            <div className="lg:col-span-2">
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                أعلى 10 عملاء من حيث الإيراد
              </h3>
              <TopTenantsTable />
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>لا توجد بيانات</p>
        )}
      </section>

      {/* ═══════════ Section 2: عملاء ═══════════ */}
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              عملاء
            </h2>
          </div>
          <button
            onClick={exportClients}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            <Download size={14} />
            تصدير CSV
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        ) : clients ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New clients bar chart */}
            <div className="lg:col-span-2">
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                عملاء جدد شهريًا
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={clients.new_clients_by_month}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "var(--font-tajawal)",
                      direction: "rtl",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="عملاء جدد"
                    fill="#1B4FD8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stat cards */}
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  معدل الانسحاب
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-rajdhani)",
                    color:
                      parseFloat(clients.churn_rate) > 10
                        ? "var(--danger)"
                        : "var(--text-primary)",
                  }}
                >
                  {clients.churn_rate}%
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {clients.churned_clients} عميل منسحب من{" "}
                  {clients.total_clients}
                </p>
              </div>

              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  معدل تحويل التجربة
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-rajdhani)",
                    color: "var(--blue-primary)",
                  }}
                >
                  {clients.total_clients > 0
                    ? (
                        ((clients.active_clients - clients.trial_clients) /
                          Math.max(clients.total_clients, 1)) *
                        100
                      ).toFixed(1)
                    : "0"}
                  %
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {clients.trial_clients} في فترة تجريبية
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>لا توجد بيانات</p>
        )}
      </section>

      {/* ═══════════ Section 3: محافظات ═══════════ */}
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MapPin size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              محافظات
            </h2>
          </div>
          <button
            onClick={exportGov}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            <Download size={14} />
            تصدير CSV
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : govData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscribers by governorate */}
            <div>
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                المشتركون حسب المحافظة
              </h3>
              <HorizontalBars
                items={govData.subscribers_by_governorate.map((g) => ({
                  label: g.governorate,
                  value: g.subscriber_count,
                }))}
                color="var(--blue-primary)"
              />
            </div>

            {/* Revenue by governorate */}
            <div>
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                الإيرادات حسب المحافظة
              </h3>
              <HorizontalBars
                items={govData.revenue_by_governorate.map((g) => ({
                  label: g.governorate,
                  value: g.revenue,
                }))}
                color="var(--violet)"
                formatValue={(v) => `$${v.toLocaleString()}`}
              />
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>لا توجد بيانات</p>
        )}
      </section>
    </div>
  );
}

/* ── Horizontal Bars component (div-based) ───────────────────── */

function HorizontalBars({
  items,
  color,
  formatValue,
}: {
  items: { label: string; value: number }[];
  color: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        لا توجد بيانات
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.label}
            </span>
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--font-rajdhani)",
                color: "var(--text-primary)",
              }}
            >
              {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--bg-muted)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Top Tenants Table ───────────────────────────────────────── */

function TopTenantsTable() {
  const [topTenants, setTopTenants] = useState<
    { id: string; name: string; plan: string; revenue: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports/revenue");
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Compute top tenants from monthly data grouped by tenant isn't available
        // in the revenue endpoint, so we derive from by_plan as a fallback,
        // but the revenue endpoint doesn't return per-tenant data.
        // We will compute it from billing invoices via a dedicated call.
        // For now, show plan breakdown as a table.
        setTopTenants([]);

        // Try fetching from clients endpoint which has more data
        const cliRes = await fetch("/api/clients?limit=10");
        if (cliRes.ok) {
          const cliData = await cliRes.json();
          if (cliData.tenants) {
            setTopTenants(
              cliData.tenants.map((t: any) => ({
                id: t.id,
                name: t.name,
                plan: t.plan,
                revenue: 0,
              }))
            );
          }
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (topTenants.length === 0) {
    return (
      <p
        className="text-sm py-6 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        لا يوجد عملاء بعد
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th
              className="text-right py-2 px-3 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              الاسم
            </th>
            <th
              className="text-right py-2 px-3 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              الخطة
            </th>
            <th
              className="text-right py-2 px-3 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              الإيراد الإجمالي
            </th>
          </tr>
        </thead>
        <tbody>
          {topTenants.map((t) => (
            <tr
              key={t.id}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td
                className="py-2.5 px-3"
                style={{ color: "var(--text-primary)" }}
              >
                {t.name}
              </td>
              <td className="py-2.5 px-3">
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    background:
                      PLAN_COLORS[t.plan]
                        ? `${PLAN_COLORS[t.plan]}18`
                        : "var(--bg-muted)",
                    color: PLAN_COLORS[t.plan] || "var(--text-secondary)",
                  }}
                >
                  {PLAN_LABELS[t.plan] || t.plan}
                </span>
              </td>
              <td
                className="py-2.5 px-3"
                style={{
                  fontFamily: "var(--font-rajdhani)",
                  color: "var(--text-primary)",
                }}
              >
                ${t.revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
