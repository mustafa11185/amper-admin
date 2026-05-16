"use client";

/**
 * EconomicsSection — P-CO-5.2 (2026-05-16).
 *
 * RestoIQ hub section (product-scoped per the Product Isolation
 * Rule). Plan mix · MRR by plan · status split · ARPU, derived from
 * the Endur-side RESTOIQ subscriptions.
 */
import { Loader2, AlertCircle } from "lucide-react";
import { useRestoEconomics } from "./useRestoEconomics";

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}

const STATUS_AR: Record<string, string> = {
  active: "نشط",
  trial: "تجريبي",
  paused: "متوقّف",
  cancelled: "ملغى",
};

export default function EconomicsSection() {
  const { data, error } = useRestoEconomics();

  if (error)
    return (
      <div
        style={{
          background: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: 12,
          padding: 20,
          textAlign: "center",
          color: "#B91C1C",
          fontWeight: 700,
        }}
      >
        <AlertCircle
          size={24}
          style={{ display: "block", margin: "0 auto 8px" }}
        />
        {error}
      </div>
    );
  if (!data)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2
          size={26}
          color="var(--blue-primary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  if (data.empty)
    return (
      <div
        className="rounded-xl py-10 text-center"
        style={{
          background: "var(--bg-surface)",
          border: "1px dashed var(--border)",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        منتج RESTOIQ غير مسجَّل بعد
      </div>
    );

  const t = data.totals;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="مطاعم" value={String(t.restaurants)} tone="var(--blue-primary)" />
        <Kpi label="MRR" value={iqd(t.mrr)} tone="var(--success)" />
        <Kpi label="ARPU" value={iqd(t.arpu)} tone="var(--violet)" />
        <Kpi
          label="اشتراكات نشطة"
          value={String(t.activeRecurring)}
          tone="var(--text-primary)"
        />
      </div>

      <Card title="التوزيع حسب الحالة">
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.statusCounts).map(([k, v]) => (
            <Chip key={k} label={STATUS_AR[k] ?? k} value={String(v)} />
          ))}
        </div>
      </Card>

      <Card title="MRR والعدد حسب الباقة">
        {Object.keys(data.planCounts).length === 0 ? (
          <Empty text="لا اشتراكات" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(data.planCounts)
              .sort((a, b) => (data.mrrByPlan[b[0]] ?? 0) - (data.mrrByPlan[a[0]] ?? 0))
              .map(([plan, count]) => (
                <div
                  key={plan}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-muted)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {plan}
                  </span>
                  <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span
                      style={{ fontSize: 12, color: "var(--text-muted)" }}
                    >
                      {count} اشتراك
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "var(--font-rajdhani)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {iqd(data.mrrByPlan[plan] ?? 0)}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-rajdhani)",
          fontSize: 22,
          fontWeight: 800,
          color: tone,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs font-bold mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: "var(--bg-muted)" }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-rajdhani)",
          fontWeight: 700,
          color: "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      {text}
    </p>
  );
}
