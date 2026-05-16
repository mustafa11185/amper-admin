"use client";

/**
 * CollectionsSection — P-CO-4.2 (2026-05-16).
 *
 * Amper hub section. Cash-in-transit exposure (collector wallet
 * balances = money held but not yet delivered), unconfirmed
 * deliveries, and the latest partner profit distributions.
 */
import { useFieldOps } from "./useFieldOps";
import { FOLoader, FOError, FOKpi, FOCard, FOEmpty, iqd, dt } from "./fieldOpsUi";

export default function CollectionsSection() {
  const { data, error } = useFieldOps();
  if (error) return <FOError message={error} />;
  if (!data) return <FOLoader />;

  const c = data.cash;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <FOKpi
          label="نقد لدى الجباة (تعرّض)"
          value={iqd(c.walletExposure)}
          tone={
            c.walletExposure > 0 ? "var(--danger)" : "var(--success)"
          }
        />
        <FOKpi
          label="تسليمات غير مؤكّدة"
          value={c.unconfirmedCount}
          tone={
            c.unconfirmedCount > 0 ? "var(--warning)" : "var(--success)"
          }
        />
        <FOKpi label="قيمتها" value={iqd(c.unconfirmedAmount)} />
      </div>

      <FOCard>
        <p
          className="text-xs font-bold mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          أعلى المحافظ رصيداً (أولويّة تحصيل/تسليم)
        </p>
        {c.topWallets.length === 0 ? (
          <FOEmpty text="لا محافظ جباية" />
        ) : (
          c.topWallets.map((w, i) => (
            <div
              key={w.staffId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {w.staffId.slice(0, 8)}
              </span>
              <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                >
                  حُصّل {iqd(w.collected)} · سُلّم {iqd(w.delivered)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "var(--font-rajdhani)",
                    color:
                      w.balance > 0
                        ? "var(--danger)"
                        : "var(--text-primary)",
                  }}
                >
                  {iqd(w.balance)}
                </span>
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
          آخر توزيعات الأرباح
        </p>
        {c.distributions.length === 0 ? (
          <FOEmpty text="لا توزيعات أرباح مسجّلة" />
        ) : (
          c.distributions.map((d, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                fontSize: 12,
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {d.period_month}/{d.period_year} · {d.scope_type}
                {d.is_finalized ? "" : " (غير نهائي)"}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                إيراد {iqd(d.total_revenue)} · صافي{" "}
                <b
                  style={{
                    color:
                      d.net_profit >= 0
                        ? "var(--success)"
                        : "var(--danger)",
                  }}
                >
                  {iqd(d.net_profit)}
                </b>
              </span>
            </div>
          ))
        )}
      </FOCard>
    </div>
  );
}
