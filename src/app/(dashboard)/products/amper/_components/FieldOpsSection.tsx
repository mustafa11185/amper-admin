"use client";

/**
 * FieldOpsSection — P-CO-4.2 (2026-05-16).
 *
 * Amper hub section (product-scoped per the Product Isolation Rule).
 * Generator fleet status + «ذكاء امبير» predictive maintenance +
 * unresolved voltage/overload events.
 */
import { Sparkles } from "lucide-react";
import { useFieldOps } from "./useFieldOps";
import { FOLoader, FOError, FOKpi, FOCard, FOEmpty, dt } from "./fieldOpsUi";

const BAND: Record<string, { bg: string; fg: string; label: string }> = {
  overdue: { bg: "#FEE2E2", fg: "#B91C1C", label: "متجاوز" },
  soon: { bg: "#FEF3C7", fg: "#B45309", label: "يقترب" },
};

export default function FieldOpsSection() {
  const { data, error } = useFieldOps();
  if (error) return <FOError message={error} />;
  if (!data) return <FOLoader />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FOKpi
          label="مولّدات"
          value={data.generators.total}
          tone="var(--blue-primary)"
        />
        <FOKpi
          label="تعمل الآن"
          value={data.generators.running}
          tone="var(--success)"
        />
        <FOKpi
          label="وقود منخفض"
          value={data.generators.lowFuel}
          tone={
            data.generators.lowFuel > 0
              ? "var(--danger)"
              : "var(--text-muted)"
          }
        />
        <FOKpi
          label="صيانة مطلوبة"
          value={data.maintenance.flagged}
          tone={
            data.maintenance.overdue > 0
              ? "var(--danger)"
              : data.maintenance.flagged > 0
                ? "var(--warning)"
                : "var(--success)"
          }
        />
      </div>

      {/* ذكاء امبير — predictive maintenance */}
      <FOCard>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          <Sparkles size={16} color="#B45309" />
          ذكاء امبير — الصيانة التنبّؤيّة
        </span>
        {data.maintenance.list.length === 0 ? (
          <FOEmpty text="كل المحرّكات ضمن جدول الصيانة 🎉" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.maintenance.list.map((m) => {
              const b = BAND[m.band];
              return (
                <div
                  key={m.engineId}
                  className="rounded-lg p-3"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.generator} · {m.engine}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: b.bg,
                        color: b.fg,
                      }}
                    >
                      {b.label} · {m.ratioPct}%
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    {m.reasonAr}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </FOCard>

      {/* unresolved events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FOCard>
          <p
            className="text-xs font-bold mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            أحداث جهد غير محلولة ({data.events.voltageOpen})
          </p>
          {data.events.voltage.length === 0 ? (
            <FOEmpty text="لا أحداث جهد مفتوحة" />
          ) : (
            data.events.voltage.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 12,
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--danger)" }}>
                  {v.type}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {v.voltage}V / حدّ {v.threshold}V · {dt(v.detected_at)}
                </span>
              </div>
            ))
          )}
        </FOCard>
        <FOCard>
          <p
            className="text-xs font-bold mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            أحداث تحميل زائد غير محلولة ({data.events.overloadOpen})
          </p>
          {data.events.overload.length === 0 ? (
            <FOEmpty text="لا أحداث تحميل مفتوحة" />
          ) : (
            data.events.overload.map((o, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 12,
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--danger)" }}>
                  +{Math.round(o.excess_pct)}% زيادة
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {Math.round(o.measured_amps)}A · {o.active_subs_count}{" "}
                  مشترك · {dt(o.detected_at)}
                </span>
              </div>
            ))
          )}
        </FOCard>
      </div>
    </div>
  );
}
