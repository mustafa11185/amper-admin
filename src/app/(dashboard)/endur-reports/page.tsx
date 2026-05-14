"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Receipt,
  Download,
  Loader2,
  Printer,
  Wallet,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface KPIs {
  total_revenue: number;
  amper_revenue: number;
  endur_revenue: number;
  mrr: number;
  amper_mrr: number;
  total_customers: number;
  active_amper_tenants: number;
  endur_customers: number;
  paid_invoices_count: number;
  pending_invoices_count: number;
  pending_invoices_value: number;
}
interface MonthlyPoint {
  month: string;
  amper: number;
  endur: number;
  total: number;
}
interface ProductSlice {
  key: string;
  name_ar: string;
  color: string;
  revenue: number;
  count: number;
}
interface TopCustomer {
  source: "AMPER" | "ENDUR";
  name: string;
  phone: string;
  plan: string | null;
  revenue: number;
}
interface RecentInvoice {
  id: string;
  invoice_number: string;
  paid_at: string | null;
  total: number;
  customer_name: string;
  products: { name_ar: string; color: string; key: string }[];
}
interface Overview {
  period: string;
  kpis: KPIs;
  monthly_series: MonthlyPoint[];
  product_breakdown: ProductSlice[];
  top_customers: TopCustomer[];
  recent_invoices: RecentInvoice[];
}

const PERIODS = [
  { v: "this_month", l: "هذا الشهر" },
  { v: "last_month", l: "الشهر السابق" },
  { v: "last_3m", l: "آخر 3 أشهر" },
  { v: "last_12m", l: "آخر 12 شهر" },
  { v: "this_year", l: "هذه السنة" },
  { v: "all", l: "الكل" },
] as const;

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}
function formatIQDshort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}
function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${y.slice(2)}`;
}

export default function EndurReportsPage() {
  const [period, setPeriod] = useState<string>("this_month");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/endur-reports/overview?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [period]);

  function downloadCsv(type: "invoices" | "customers") {
    window.location.href = `/api/endur-reports/export?type=${type}&period=${period}`;
  }

  if (loading || !data) {
    return (
      <div style={{ padding: 64, display: "flex", justifyContent: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const k = data.kpis;
  const periodLabel = PERIODS.find((p) => p.v === period)?.l ?? period;

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        className="print-hide"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 22,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            تقارير اندر
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            تقارير موحدة عبر كل منتجات شركة اندر للحلول التقنية · {periodLabel}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={btnGhost}
            title="طباعة"
          >
            <Printer size={14} />
            طباعة
          </button>
          <button
            onClick={() => downloadCsv("invoices")}
            style={btnGhost}
          >
            <Download size={14} />
            CSV الفواتير
          </button>
          <button
            onClick={() => downloadCsv("customers")}
            style={btnGhost}
          >
            <Download size={14} />
            CSV العملاء
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div
        className="print-hide"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        {PERIODS.map((p) => {
          const active = period === p.v;
          return (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border)",
                background: active ? "var(--brand-cyan-soft)" : "var(--bg-surface)",
                color: active ? "var(--brand-teal)" : "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "var(--font-cairo), var(--font-tajawal)",
              }}
            >
              {p.l}
            </button>
          );
        })}
      </div>

      {/* KPI grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="إجمالي الإيرادات"
          value={formatIQD(k.total_revenue)}
          sub={`أمبير ${formatIQDshort(k.amper_revenue)} + اندر ${formatIQDshort(k.endur_revenue)}`}
          color="var(--brand-teal)"
        />
        <KpiCard
          icon={<Wallet size={20} />}
          label="MRR — الإيراد الشهري المتكرر"
          value={formatIQD(k.mrr)}
          sub={`${k.active_amper_tenants} اشتراك نشط`}
          color="var(--success)"
        />
        <KpiCard
          icon={<Users size={20} />}
          label="إجمالي العملاء"
          value={k.total_customers.toLocaleString("ar-IQ")}
          sub={`${k.active_amper_tenants} نشط في أمبير + ${k.endur_customers} في اندر`}
          color="var(--blue-primary)"
        />
        <KpiCard
          icon={<Receipt size={20} />}
          label="فواتير مدفوعة"
          value={k.paid_invoices_count.toLocaleString("ar-IQ")}
          sub={periodLabel}
          color="var(--violet)"
        />
        {k.pending_invoices_count > 0 && (
          <KpiCard
            icon={<AlertCircle size={20} />}
            label="فواتير معلقة (اندر)"
            value={`${k.pending_invoices_count}`}
            sub={`بقيمة ${formatIQD(k.pending_invoices_value)}`}
            color="var(--warning)"
          />
        )}
      </div>

      {/* Revenue trend + Product mix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <ChartCard title="الإيرادات الشهرية — آخر 12 شهر">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthly_series}>
              <defs>
                <linearGradient id="colAmper" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colEndur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4A6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#00B4A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={formatIQDshort}
              />
              <Tooltip
                formatter={(v) => formatIQD(Number(v))}
                labelFormatter={(l) => formatMonthLabel(String(l))}
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontFamily: "var(--font-cairo), var(--font-tajawal)",
                }}
              />
              <Area
                type="monotone"
                dataKey="amper"
                name="أمبير"
                stroke="#1B4FD8"
                fill="url(#colAmper)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="endur"
                name="اندر مباشر"
                stroke="#00B4A6"
                fill="url(#colEndur)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="الإيرادات حسب المنتج">
          {data.product_breakdown.length === 0 ? (
            <EmptyChart text="لا توجد إيرادات في هذه الفترة" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.product_breakdown}
                  dataKey="revenue"
                  nameKey="name_ar"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {data.product_breakdown.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatIQD(Number(v))}
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontFamily: "var(--font-cairo), var(--font-tajawal)",
                  }}
                />
                <Legend
                  iconType="circle"
                  formatter={(v) => (
                    <span style={{ fontFamily: "var(--font-cairo)", fontSize: 12 }}>
                      {v}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top customers + Recent invoices */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <ChartCard title="أفضل 10 عملاء — حسب الإيراد">
          {data.top_customers.length === 0 ? (
            <EmptyChart text="لا توجد بيانات في هذه الفترة" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.top_customers.map((c, i) => (
                <CustomerRow key={i} rank={i + 1} customer={c} />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="آخر فواتير اندر المدفوعة">
          {data.recent_invoices.length === 0 ? (
            <EmptyChart text="لا توجد فواتير مدفوعة بعد" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.recent_invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Components ────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
          {label}
        </span>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${color}1A`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "var(--font-jetbrains-mono)",
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 14,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div
      style={{
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function CustomerRow({ rank, customer }: { rank: number; customer: TopCustomer }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 4px",
        borderBottom: rank < 10 ? "1px solid var(--border)" : "none",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: rank <= 3 ? "var(--brand-cyan-soft)" : "var(--bg-muted)",
          color: rank <= 3 ? "var(--brand-teal)" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {customer.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {customer.phone}
          {customer.plan && ` · ${customer.plan}`}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4,
          background: customer.source === "AMPER" ? "rgba(27,79,216,0.1)" : "rgba(0,180,166,0.1)",
          color: customer.source === "AMPER" ? "#1B4FD8" : "#00B4A6",
          fontWeight: 600,
        }}
      >
        {customer.source}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {formatIQD(customer.revenue)}
      </span>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: RecentInvoice }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-jetbrains-mono)",
              color: "var(--brand-teal)",
              fontWeight: 700,
            }}
          >
            {invoice.invoice_number}
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            {invoice.products.map((p) => (
              <span
                key={p.key}
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: `${p.color}1A`,
                  color: p.color,
                  fontWeight: 600,
                }}
              >
                {p.name_ar}
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {invoice.customer_name}
        </div>
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--success)",
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {formatIQD(invoice.total)}
      </span>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-surface)",
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-cairo), var(--font-tajawal)",
};
