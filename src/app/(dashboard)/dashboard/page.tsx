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
  Percent,
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
  new_clients_by_month: { month: string; count: number }[];
  plan_distribution: { plan: string; count: number }[];
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
  // New plans
  starter: "#374151",
  pro: "#1B4FD8",
  business: "#D97706",
  corporate: "#0F766E",
  fleet: "#7C3AED",
  custom: "#64748B",
  // Legacy
  basic: "#1B4FD8",
  gold: "#D97706",
};

const PLAN_LABELS: Record<string, string> = {
  // New plans
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  corporate: "Corporate",
  fleet: "Fleet",
  custom: "مخصص",
  // Legacy
  basic: "أساسي",
  gold: "ذهبي",
};

const PLAN_BADGE_STYLES: Record<string, React.CSSProperties> = {
  // New plans
  starter: { background: "#F3F4F6", color: "#374151" },
  pro: { background: "var(--blue-soft)", color: "var(--blue-primary)" },
  business: { background: "var(--gold-soft)", color: "var(--gold)" },
  corporate: { background: "#F0FDFA", color: "#0F766E" },
  fleet: { background: "var(--violet-soft)", color: "var(--violet)" },
  custom: { background: "#F1F5F9", color: "#64748B" },
  // Legacy
  basic: { background: "var(--blue-soft)", color: "var(--blue-primary)" },
  gold: { background: "var(--gold-soft)", color: "var(--gold)" },
};

// ─── Skeleton components ─────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          className="animate-pulse"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--bg-muted)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="animate-pulse"
            style={{
              width: 80,
              height: 14,
              borderRadius: 6,
              background: "var(--bg-muted)",
              marginBottom: 8,
            }}
          />
          <div
            className="animate-pulse"
            style={{
              width: 60,
              height: 28,
              borderRadius: 6,
              background: "var(--bg-muted)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ ...styles.card, minHeight: 340 }}>
      <div
        className="animate-pulse"
        style={{
          width: 140,
          height: 18,
          borderRadius: 6,
          background: "var(--bg-muted)",
          marginBottom: 24,
        }}
      />
      <div
        className="animate-pulse"
        style={{
          width: "100%",
          height: 260,
          borderRadius: 12,
          background: "var(--bg-muted)",
        }}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={styles.card}>
      <div
        className="animate-pulse"
        style={{
          width: 120,
          height: 18,
          borderRadius: 6,
          background: "var(--bg-muted)",
          marginBottom: 20,
        }}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            width: "100%",
            height: 48,
            borderRadius: 8,
            background: "var(--bg-muted)",
            marginBottom: 8,
          }}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={22} color={iconColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 4,
              fontFamily: "var(--font-tajawal)",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "var(--font-rajdhani)",
              color: "var(--text-primary)",
              lineHeight: 1,
              direction: "ltr",
              textAlign: "right",
            }}
          >
            {value}
            {suffix && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  marginInlineStart: 4,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-tajawal)",
                }}
              >
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <div
          style={{
            ...styles.card,
            textAlign: "center",
            padding: 40,
            color: "var(--danger)",
          }}
        >
          حدث خطأ في تحميل البيانات
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.statsGrid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div style={styles.chartsGrid}>
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div style={styles.bottomGrid}>
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  const revenue =
    typeof data.monthly_revenue === "string"
      ? parseFloat(data.monthly_revenue)
      : data.monthly_revenue;

  const formattedRevenue = new Intl.NumberFormat("ar-IQ").format(revenue);

  // Take last 6 months for the bar chart
  const barData = data.new_clients_by_month.slice(-6);

  // Governorate max for percentage bar width
  const maxGovCount =
    data.top_governorates.length > 0
      ? Math.max(...data.top_governorates.map((g) => g.count))
      : 1;

  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            fontFamily: "var(--font-tajawal)",
          }}
        >
          لوحة التحكم
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            margin: "6px 0 0",
          }}
        >
          نظرة عامة على أداء المنصة
        </p>
      </div>

      {/* Top stats row */}
      <div style={styles.statsGrid}>
        <StatCard
          label="إجمالي العملاء"
          value={data.total_tenants}
          icon={Users}
          iconBg="var(--blue-soft)"
          iconColor="var(--blue-primary)"
        />
        <StatCard
          label="عملاء نشطون اليوم"
          value={data.active_tenants}
          icon={UserCheck}
          iconBg="#D1FAE5"
          iconColor="var(--success)"
        />
        <StatCard
          label="إيرادات هذا الشهر"
          value={formattedRevenue}
          suffix="د.ع"
          icon={Banknote}
          iconBg="var(--gold-soft)"
          iconColor="var(--gold)"
        />
        <StatCard
          label="عمولات هذا الشهر"
          value={new Intl.NumberFormat("ar-IQ").format(data.total_commissions)}
          suffix="د.ع"
          icon={Percent}
          iconBg="#EDE9FE"
          iconColor="var(--violet)"
        />
        <StatCard
          label="تذاكر مفتوحة"
          value={data.open_tickets}
          icon={Ticket}
          iconBg="#FEE2E2"
          iconColor="var(--danger)"
        />
      </div>

      {/* Charts row */}
      <div style={styles.chartsGrid}>
        {/* Bar Chart - New clients */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <TrendingUp size={18} color="var(--blue-primary)" />
            <span>عملاء جدد آخر 6 أشهر</span>
          </div>
          <div style={{ width: "100%", height: 280, direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    fontFamily: "var(--font-tajawal)",
                  }}
                  formatter={(value) => [value as number, "عملاء"]}
                />
                <Bar
                  dataKey="count"
                  fill="#1B4FD8"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Plan distribution */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Activity size={18} color="var(--violet)" />
            <span>توزيع الباقات</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              direction: "ltr",
            }}
          >
            {data.plan_distribution.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                لا توجد بيانات
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.plan_distribution}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {data.plan_distribution.map((entry) => (
                      <Cell
                        key={entry.plan}
                        fill={PLAN_COLORS[entry.plan] ?? "#94A3B8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-md)",
                      fontSize: 13,
                      fontFamily: "var(--font-tajawal)",
                    }}
                    formatter={(value, name) => [
                      value as number,
                      PLAN_LABELS[name as string] ?? name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            {data.plan_distribution.map((entry) => (
              <div
                key={entry.plan}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: PLAN_COLORS[entry.plan] ?? "#94A3B8",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {PLAN_LABELS[entry.plan] ?? entry.plan} ({entry.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section: Governorates + Recent clients + Activity */}
      <div style={styles.bottomGrid}>
        {/* Governorates card */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <MapPin size={18} color="var(--success)" />
            <span>أبرز المحافظات</span>
          </div>
          {data.top_governorates.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              لا توجد بيانات
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {data.top_governorates.slice(0, 5).map((gov) => {
                const pct =
                  maxGovCount > 0
                    ? Math.round((gov.count / maxGovCount) * 100)
                    : 0;
                return (
                  <div key={gov.governorate ?? "unknown"}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{gov.governorate ?? "غير محدد"}</span>
                      <span
                        style={{
                          fontFamily: "var(--font-rajdhani)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {gov.count}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 4,
                        background: "var(--bg-muted)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 4,
                          background:
                            "linear-gradient(90deg, var(--blue-primary), var(--violet))",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent clients table */}
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
                  <th style={styles.th}>تاريخ الانضمام</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_clients.slice(0, 5).map((client) => (
                  <tr key={client.id} style={styles.tr}>
                    <td style={styles.td}>
                      <Link
                        href={`/clients/${client.id}`}
                        style={{
                          color: "var(--blue-primary)",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...PLAN_BADGE_STYLES[client.plan],
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          display: "inline-block",
                        }}
                      >
                        {PLAN_LABELS[client.plan] ?? client.plan}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: client.is_active
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: client.is_active
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        />
                        {client.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-jetbrains-mono)",
                          direction: "ltr",
                          display: "inline-block",
                        }}
                      >
                        {new Date(client.created_at).toLocaleDateString(
                          "ar-IQ"
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recent_clients.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      لا يوجد عملاء بعد
                    </td>
                  </tr>
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
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              لا توجد نشاطات
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 0 }}
            >
              {data.activity_feed.slice(0, 10).map((activity, idx) => (
                <div
                  key={activity.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      idx < Math.min(data.activity_feed.length, 10) - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--blue-primary)",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {activity.action}
                      </span>
                      {activity.entity_type && (
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}
                          — {activity.entity_type}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
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

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "28px 32px",
    maxWidth: 1360,
    margin: "0 auto",
    width: "100%",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 20,
    marginBottom: 24,
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
    marginBottom: 24,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    gap: 20,
    marginBottom: 32,
  },
  card: {
    background: "var(--bg-surface)",
    borderRadius: 16,
    boxShadow: "var(--shadow-md)",
    padding: 20,
    border: "1px solid var(--border)",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 20,
    fontFamily: "var(--font-tajawal)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "right",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  tr: {
    transition: "background 0.15s",
    cursor: "pointer",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
  },
};
