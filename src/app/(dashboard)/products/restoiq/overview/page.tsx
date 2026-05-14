"use client";

/**
 * /products/restoiq/overview — P-MERGE-2 (2026-05-14).
 *
 * SaaS-admin overview of the RestoIQ product across all tenants:
 * subscription counts, MRR, growth signal, plan mix. The "live
 * platform health" tiles (orders today, AI calls) are stubbed
 * until P-MERGE-3 wires the API proxy.
 */
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Users,
  Banknote,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  PauseCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Overview {
  product: { id: string; status: string; apiConfigured: boolean };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    paused: number;
    cancelled: number;
  };
  mrr: number;
  newThisMonth: number;
  planDistribution: Array<{ name: string; count: number }>;
  pending: {
    ordersToday: number | null;
    activeRestaurantsToday: number | null;
    aiCallsThisMonth: number | null;
  };
}

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

export default function RestoIqOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/restoiq/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <ErrorPanel message={error} />;
  }
  if (!data) {
    return <LoadingPanel />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top KPI strip — what we own */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <KpiCard
          icon={<Users size={22} color="var(--blue-primary)" />}
          label="إجمالي المطاعم"
          value={data.subscriptions.total.toLocaleString("ar-IQ")}
          hint={`${data.subscriptions.active} نشط · ${data.subscriptions.trial} تجريبي`}
        />
        <KpiCard
          icon={<Banknote size={22} color="var(--success)" />}
          label="الإيراد الشهري (MRR)"
          value={formatIQD(data.mrr)}
          hint="من اشتراكات RestoIQ النشطة"
          tone="success"
        />
        <KpiCard
          icon={<TrendingUp size={22} color="var(--violet)" />}
          label="جديد هذا الشهر"
          value={data.newThisMonth.toLocaleString("ar-IQ")}
          hint="مطاعم اشتركت منذ بداية الشهر"
        />
        <KpiCard
          icon={<Activity size={22} color="var(--danger)" />}
          label="حالة المنتج"
          value={data.product.status === "ACTIVE" ? "🟢 نشط" : data.product.status}
          hint={
            data.product.apiConfigured
              ? "✓ API محضّر"
              : "⚠ لم يُحدَّد api_base_url"
          }
        />
      </div>

      {/* Subscription state breakdown */}
      <Panel title="حالات الاشتراك">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <StateChip
            label="نشط"
            count={data.subscriptions.active}
            color="var(--success)"
            Icon={Activity}
          />
          <StateChip
            label="تجريبي"
            count={data.subscriptions.trial}
            color="#D97706"
            Icon={Clock}
          />
          <StateChip
            label="موقّت (paused)"
            count={data.subscriptions.paused}
            color="var(--text-muted)"
            Icon={PauseCircle}
          />
          <StateChip
            label="ملغى"
            count={data.subscriptions.cancelled}
            color="var(--danger)"
            Icon={XCircle}
          />
        </div>
      </Panel>

      {/* Plan distribution */}
      {data.planDistribution.length > 0 && (
        <Panel title="توزيع الباقات (للنشطين فقط)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.planDistribution
              .sort((a, b) => b.count - a.count)
              .map((p) => {
                const max = Math.max(
                  ...data.planDistribution.map((x) => x.count),
                );
                const pct = max > 0 ? (p.count / max) * 100 : 0;
                return (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        width: 120,
                        fontSize: 13,
                        color: "var(--text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {p.name}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 10,
                        borderRadius: 999,
                        background: "var(--bg-muted)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          height: "100%",
                          background: "var(--blue-primary)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 60,
                        textAlign: "left",
                        fontSize: 12,
                        fontFamily: "var(--font-rajdhani)",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {p.count}
                    </span>
                  </div>
                );
              })}
          </div>
        </Panel>
      )}

      {/* Pending live tiles — wired in P-MERGE-3 */}
      <Panel
        title="مؤشّرات حيّة"
        subtitle="بانتظار ربط API مع backend الـ RestoIQ (P-MERGE-3)"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            opacity: 0.6,
          }}
        >
          <PendingTile label="طلبات اليوم (كل المطاعم)" />
          <PendingTile label="مطاعم نشطة الآن" />
          <PendingTile label="استدعاءات الذكاء هذا الشهر" />
        </div>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success";
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <span
          style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: tone === "success" ? "var(--success)" : "var(--text-primary)",
          fontFamily: "var(--font-rajdhani)",
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      {hint && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function StateChip({
  label,
  count,
  color,
  Icon,
}: {
  label: string;
  count: number;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <div
      style={{
        background: "var(--bg-muted)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Icon size={20} color={color} />
      <div>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-rajdhani)",
          }}
        >
          {count.toLocaleString("ar-IQ")}
        </p>
      </div>
    </div>
  );
}

function PendingTile({ label }: { label: string }) {
  return (
    <div
      style={{
        background: "var(--bg-muted)",
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-muted)",
          fontFamily: "var(--font-rajdhani)",
        }}
      >
        —
      </p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <Loader2
        size={32}
        color="var(--blue-primary)"
        style={{ animation: "spin 1s linear infinite" }}
      />
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 12,
        padding: 24,
        textAlign: "center",
        color: "#B91C1C",
        fontWeight: 700,
      }}
    >
      <AlertCircle size={28} style={{ display: "block", margin: "0 auto 8px" }} />
      <p style={{ fontSize: 14 }}>تعذّر تحميل النظرة العامّة</p>
      <p style={{ fontSize: 12, marginTop: 6, fontFamily: "var(--font-jetbrains-mono)" }}>
        {message}
      </p>
    </div>
  );
}
