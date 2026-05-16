"use client";

/**
 * RiskSection — P-CO-5.2 (2026-05-16).
 *
 * RestoIQ hub section. «ذكاء ريستو» at-risk lens (operator view —
 * does NOT duplicate RestoIQ's in-product AI). Deterministic,
 * explainable; rows deep-link to the unified 360° profile.
 */
import { Sparkles, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useRestoEconomics } from "./useRestoEconomics";

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}

const BAND: Record<string, { bg: string; fg: string; label: string }> = {
  high: { bg: "#FEE2E2", fg: "#B91C1C", label: "مرتفع" },
  medium: { bg: "#FEF3C7", fg: "#B45309", label: "متوسّط" },
};

export default function RiskSection() {
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
  if (data.empty) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 800,
            color: "var(--text-primary)",
          }}
        >
          <Sparkles size={16} color="var(--violet)" />
          ذكاء ريستو — المطاعم المعرّضة للخطر
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
            }}
          >
            الكل {data.atRisk.total}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#FEE2E2",
              color: "#B91C1C",
            }}
          >
            مرتفع {data.atRisk.high}
          </span>
        </span>
      </div>

      {data.atRisk.list.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          لا مطاعم معرّضة للخطر حاليّاً 🎉
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.atRisk.list.map((r) => {
            const b = BAND[r.band];
            return (
              <a
                key={r.customerId}
                href={`/endur-customers?id=${encodeURIComponent(r.customerId)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--bg-muted)",
                  textDecoration: "none",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {r.reasonsAr.join(" · ")}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {r.monthly > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: "var(--font-rajdhani)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {iqd(r.monthly)}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: b.bg,
                      color: b.fg,
                    }}
                  >
                    {b.label}
                  </span>
                  <ExternalLink size={12} color="var(--text-muted)" />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
