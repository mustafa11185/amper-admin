"use client";
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Banknote,
  Ticket,
  Activity,
  MapPin,
  TrendingUp,
  TrendingDown,
  Percent,
  Zap,
  UserMinus,
  Sparkles,
  BarChart3,
  Cpu,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  TestTube,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────

interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  monthly_revenue: number | string;
  total_commissions: number;
  open_tickets: number;
  // Growth
  new_this_month: number;
  new_last_month: number;
  churned_this_month: number;
  churn_rate: number;
  growth_rate: number;
  revenue_growth: number;
  trial_clients: number;
  trial_conversion_rate: number;
  // Charts
  new_clients_by_month: { month: string; count: number }[];
  revenue_trend: { month: string; revenue: number }[];
  plan_distribution: { plan: string; count: number }[];
  feature_usage: { module: string; count: number }[];
  best_selling_plans: { plan: string; count: number }[];
  // Platform
  platform_stats: {
    total_subscribers: number;
    total_staff: number;
    total_generators: number;
    total_branches: number;
    avg_subscribers_per_client: number;
    platform_collection_rate: number;
    iot_devices: number;
    iot_online: number;
  };
  // Tables
  top_governorates: { governorate: string | null; count: number }[];
  recent_clients: {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
    plan: string;
    is_active: boolean;
    created_at: string;
  }[];
  activity_feed: {
    id: string;
    action: string;
    entity_type: string | null;
    actor_type: string | null;
    created_at: string;
  }[];
}

// ─── Constants ───────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter: "#374151", pro: "#1B4FD8", business: "#D97706", corporate: "#0F766E",
  fleet: "#7C3AED", custom: "#64748B", basic: "#1B4FD8", gold: "#D97706",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter", pro: "Pro", business: "Business", corporate: "Corporate",
  fleet: "Fleet", custom: "مخصص", basic: "أساسي", gold: "ذهبي",
};

const PLAN_BADGE_STYLES: Record<string, React.CSSProperties> = {
  starter: { background: "#F3F4F6", color: "#374151" },
  pro: { background: "var(--blue-soft)", color: "var(--blue-primary)" },
  business: { background: "var(--gold-soft)", color: "var(--gold)" },
  corporate: { background: "#F0FDFA", color: "#0F766E" },
  fleet: { background: "var(--violet-soft)", color: "var(--violet)" },
  custom: { background: "#F1F5F9", color: "#64748B" },
  basic: { background: "var(--blue-soft)", color: "var(--blue-primary)" },
  gold: { background: "var(--gold-soft)", color: "var(--gold)" },
};

const MODULE_LABELS: Record<string, string> = {
  subscriber_management: "إدارة المشتركين",
  basic_invoicing: "الفوترة",
  pos: "نقاط البيع",
  reports: "التقارير",
  wallet: "المحفظة",
  whatsapp: "واتساب",
  engine_tracking: "تتبع المحركات",
  daily_brief: "الملخص اليومي",
  subscriber_app: "تطبيق المشترك",
  ai_reports: "تقارير AI",
  multi_branch: "فروع متعددة",
  gps: "GPS",
  iot_monitoring: "IoT",
  fuel_sensor: "حساس وقود",
  temperature_sensor: "حساس حرارة",
  operator_app: "تطبيق المشغل",
};

// ─── Skeleton ───────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-muted)" }} />
        <div style={{ flex: 1 }}>
          <div className="animate-pulse" style={{ width: 80, height: 14, borderRadius: 6, background: "var(--bg-muted)", marginBottom: 8 }} />
          <div className="animate-pulse" style={{ width: 60, height: 28, borderRadius: 6, background: "var(--bg-muted)" }} />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ ...styles.card, minHeight: 340 }}>
      <div className="animate-pulse" style={{ width: 140, height: 18, borderRadius: 6, background: "var(--bg-muted)", marginBottom: 24 }} />
      <div className="animate-pulse" style={{ width: "100%", height: 260, borderRadius: 12, background: "var(--bg-muted)" }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={styles.card}>
      <div className="animate-pulse" style={{ width: 120, height: 18, borderRadius: 6, background: "var(--bg-muted)", marginBottom: 20 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{ width: "100%", height: 48, borderRadius: 8, background: "var(--bg-muted)", marginBottom: 8 }} />
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  label, value, suffix, icon: Icon, iconBg, iconColor, trend, trendLabel,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={22} color={iconColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color: "var(--text-primary)", lineHeight: 1, direction: "ltr", textAlign: "right" }}>
            {value}
            {suffix && <span style={{ fontSize: 13, fontWeight: 500, marginInlineStart: 4, color: "var(--text-muted)" }}>{suffix}</span>}
          </div>
          {trend !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              {trend >= 0 ? <ArrowUpRight size={12} color="#059669" /> : <ArrowDownRight size={12} color="#DC2626" />}
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-rajdhani)", color: trend >= 0 ? "#059669" : "#DC2626" }}>
                {trend > 0 ? "+" : ""}{trend}%
              </span>
              {trendLabel && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{trendLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Metric ────────────────────────────────────────────

function MiniMetric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 8px", borderRadius: 12, background: "var(--bg-elevated)", flex: 1 }}>
      <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{label}</span>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center", padding: 40, color: "var(--danger)" }}>
          حدث خطأ في تحميل البيانات
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.statsGrid}>{Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
        <div style={styles.chartsGrid}><ChartSkeleton /><ChartSkeleton /></div>
        <div style={styles.bottomGrid}><TableSkeleton /><TableSkeleton /><TableSkeleton /></div>
      </div>
    );
  }

  const revenue = typeof data.monthly_revenue === "string" ? parseFloat(data.monthly_revenue) : data.monthly_revenue;
  const fmtNum = (n: number) => new Intl.NumberFormat("ar-IQ").format(n);
  const barData = data.new_clients_by_month.slice(-6);
  const maxGovCount = data.top_governorates.length > 0 ? Math.max(...data.top_governorates.map(g => g.count)) : 1;
  const featureMax = data.feature_usage.length > 0 ? Math.max(...data.feature_usage.map(f => f.count)) : 1;

  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>لوحة التحكم</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "6px 0 0" }}>تحليلات المنصة ومؤشرات الأداء</p>
      </div>

      {/* ═══════ ROW 1: Core Stats (6 cards) ═══════ */}
      <div style={styles.statsGrid}>
        <StatCard label="إجمالي العملاء" value={data.total_tenants} icon={Users} iconBg="var(--blue-soft)" iconColor="var(--blue-primary)" />
        <StatCard label="عملاء نشطون" value={data.active_tenants} icon={UserCheck} iconBg="#D1FAE5" iconColor="#059669" />
        <StatCard label="إيرادات الشهر" value={fmtNum(revenue)} suffix="د.ع" icon={Banknote} iconBg="var(--gold-soft)" iconColor="var(--gold)" trend={data.revenue_growth} trendLabel="عن الشهر السابق" />
        <StatCard label="عملاء جدد" value={data.new_this_month} icon={TrendingUp} iconBg="#EDE9FE" iconColor="#7C3AED" trend={data.growth_rate} trendLabel="نمو شهري" />
        <StatCard label="معدل المغادرة" value={`${data.churn_rate}%`} icon={UserMinus} iconBg="#FEE2E2" iconColor="#DC2626"
          trend={data.churn_rate > 5 ? -data.churn_rate : undefined}
          trendLabel={data.churned_this_month > 0 ? `${data.churned_this_month} عميل` : undefined}
        />
        <StatCard label="تذاكر مفتوحة" value={data.open_tickets} icon={Ticket} iconBg="#FEF3C7" iconColor="#D97706" />
      </div>

      {/* ═══════ ROW 2: Secondary metrics ═══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...styles.card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Percent size={14} color="var(--violet)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>عمولات الشهر</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color: "var(--text-primary)", direction: "ltr", textAlign: "right" }}>
            {fmtNum(data.total_commissions)} <span style={{ fontSize: 12, color: "var(--text-muted)" }}>د.ع</span>
          </div>
        </div>
        <div style={{ ...styles.card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TestTube size={14} color="#D97706" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>تجريبي → مدفوع</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color: "var(--text-primary)" }}>
            {data.trial_conversion_rate}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{data.trial_clients} عميل تجريبي حالياً</div>
        </div>
        <div style={{ ...styles.card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Target size={14} color="#059669" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>نسبة التحصيل</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color: data.platform_stats.platform_collection_rate >= 70 ? "#059669" : "#D97706" }}>
            {data.platform_stats.platform_collection_rate}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>عبر كل المنصة</div>
        </div>
        <div style={{ ...styles.card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Cpu size={14} color="#0891B2" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>أجهزة IoT</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-rajdhani)", color: "var(--text-primary)" }}>
            {data.platform_stats.iot_devices}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {data.platform_stats.iot_online} متصل · {data.platform_stats.iot_devices - data.platform_stats.iot_online} غير متصل
          </div>
        </div>
      </div>

      {/* ═══════ ROW 3: Platform usage strip ═══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        <MiniMetric label="مشتركين" value={fmtNum(data.platform_stats.total_subscribers)} color="var(--blue-primary)" />
        <MiniMetric label="موظفين" value={fmtNum(data.platform_stats.total_staff)} color="#7C3AED" />
        <MiniMetric label="مولدات" value={data.platform_stats.total_generators} color="#D97706" />
        <MiniMetric label="فروع" value={data.platform_stats.total_branches} color="#0F766E" />
        <MiniMetric label="معدل مشتركين/عميل" value={data.platform_stats.avg_subscribers_per_client} color="var(--blue-primary)" />
        <MiniMetric label="الشهر السابق" value={data.new_last_month} color="var(--text-muted)" />
      </div>

      {/* ═══════ ROW 4: Charts ═══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Revenue Trend */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Banknote size={18} color="var(--gold)" />
            <span>الإيرادات — آخر 6 أشهر</span>
          </div>
          <div style={{ width: "100%", height: 280, direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue_trend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => [`${Number(v).toLocaleString()} د.ع`, 'الإيراد']} />
                <Area type="monotone" dataKey="revenue" stroke="#D97706" fill="url(#revGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Clients */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <TrendingUp size={18} color="var(--blue-primary)" />
            <span>عملاء جدد — آخر 6 أشهر</span>
          </div>
          <div style={{ width: "100%", height: 280, direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => [v as number, "عملاء"]} />
                <Bar dataKey="count" fill="#1B4FD8" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══════ ROW 5: Distribution + Feature Usage ═══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Plan Distribution Pie */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Activity size={18} color="var(--violet)" />
            <span>توزيع الباقات</span>
          </div>
          <div style={{ width: "100%", height: 220, display: "flex", alignItems: "center", justifyContent: "center", direction: "ltr" }}>
            {data.plan_distribution.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.plan_distribution} dataKey="count" nameKey="plan" cx="50%" cy="50%" innerRadius={50} outerRadius={85} strokeWidth={2} stroke="#fff">
                    {data.plan_distribution.map((entry) => (
                      <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} formatter={(v, name) => [v as number, PLAN_LABELS[name as string] ?? name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
            {data.plan_distribution.map((entry) => (
              <div key={entry.plan} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLAN_COLORS[entry.plan] ?? "#94A3B8" }} />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{PLAN_LABELS[entry.plan] ?? entry.plan} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Selling Plans */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Sparkles size={18} color="#D97706" />
            <span>الأكثر مبيعاً (3 أشهر)</span>
          </div>
          {data.best_selling_plans.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>لا توجد اشتراكات جديدة</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.best_selling_plans.map((p, i) => {
                const total = data.best_selling_plans.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                return (
                  <div key={p.plan}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: PLAN_COLORS[p.plan] ?? "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{PLAN_LABELS[p.plan] ?? p.plan}</span>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: "var(--font-rajdhani)", fontWeight: 700, color: PLAN_COLORS[p.plan] ?? "var(--text-primary)" }}>
                        {p.count} <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--bg-muted)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: PLAN_COLORS[p.plan] ?? "#94A3B8", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature Usage */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <BarChart3 size={18} color="var(--blue-primary)" />
            <span>استخدام الميزات</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.feature_usage.slice(0, 10).map((f) => {
              const pct = featureMax > 0 ? Math.round((f.count / featureMax) * 100) : 0;
              return (
                <div key={f.module}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{MODULE_LABELS[f.module] ?? f.module}</span>
                    <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: 600, color: "var(--text-primary)" }}>{f.count}</span>
                  </div>
                  <div style={{ width: "100%", height: 5, borderRadius: 3, background: "var(--bg-muted)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #1B4FD8, #7C3AED)", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ ROW 6: Governorates + Recent + Activity ═══════ */}
      <div style={styles.bottomGrid}>
        {/* Governorates */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <MapPin size={18} color="var(--success)" />
            <span>أبرز المحافظات</span>
          </div>
          {data.top_governorates.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>لا توجد بيانات</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.top_governorates.slice(0, 5).map((gov) => {
                const pct = maxGovCount > 0 ? Math.round((gov.count / maxGovCount) * 100) : 0;
                return (
                  <div key={gov.governorate ?? "unknown"}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                      <span>{gov.governorate ?? "غير محدد"}</span>
                      <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: 600, color: "var(--text-primary)" }}>{gov.count}</span>
                    </div>
                    <div style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--bg-muted)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg, var(--blue-primary), var(--violet))", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent clients */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Users size={18} color="var(--blue-primary)" />
            <span>آخر العملاء</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>الاسم</th>
                  <th style={styles.th}>الباقة</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>تاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_clients.slice(0, 5).map((client) => (
                  <tr key={client.id} style={styles.tr}>
                    <td style={styles.td}>
                      <Link href={`/clients/${client.id}`} style={{ color: "var(--blue-primary)", textDecoration: "none", fontWeight: 500 }}>
                        {client.name}
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...PLAN_BADGE_STYLES[client.plan], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-block" }}>
                        {PLAN_LABELS[client.plan] ?? client.plan}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: client.is_active ? "var(--success)" : "var(--danger)" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: client.is_active ? "var(--success)" : "var(--danger)" }} />
                        {client.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)", direction: "ltr", display: "inline-block" }}>
                        {new Date(client.created_at).toLocaleDateString("ar-IQ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recent_clients.length === 0 && (
                  <tr><td colSpan={4} style={{ ...styles.td, textAlign: "center", color: "var(--text-muted)" }}>لا يوجد عملاء</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Activity size={18} color="var(--gold)" />
            <span>آخر النشاطات</span>
          </div>
          {data.activity_feed.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>لا توجد نشاطات</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.activity_feed.slice(0, 10).map((activity, idx) => (
                <div key={activity.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: idx < Math.min(data.activity_feed.length, 10) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue-primary)", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>{activity.action}</span>
                      {activity.entity_type && <span style={{ color: "var(--text-muted)" }}> — {activity.entity_type}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ar })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 24 },
  chartsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 24 },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 20, marginBottom: 32 },
  card: { background: "var(--bg-surface)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: 20, border: "1px solid var(--border)" },
  cardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { textAlign: "right" as const, padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const },
  tr: { transition: "background 0.15s", cursor: "pointer" },
  td: { padding: "10px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
};
