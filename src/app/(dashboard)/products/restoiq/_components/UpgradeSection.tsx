"use client";

/**
 * UpgradeSection — P-AI-3 (2026-05-16).
 *
 * RestoIQ hub section. «ذكاء ريستو» plan-upgrade recommender
 * (operator lens; does NOT duplicate RestoIQ's in-product AI).
 * Deterministic; rows deep-link to the unified 360° profile and
 * carry a WhatsApp-ready script.
 */
import { useEffect, useState } from "react";
import { Sparkles, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface Rec {
  customerId: string;
  name: string;
  phone: string | null;
  currentPlan: string;
  recommendedPlan: string;
  confidence: number;
  reasonAr: string;
  scriptAr: string;
}

function waHref(phone: string | null, text: string): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^0-9]/g, "");
  const intl = d.startsWith("0") ? "964" + d.slice(1) : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export default function UpgradeSection() {
  const [data, setData] = useState<{
    empty?: boolean;
    summary?: { total: number; strong: number };
    recommendations: Rec[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products/restoiq/ai/upgrade")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

  if (err)
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
        {err}
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
          ذكاء ريستو — توصيات الترقية
        </span>
        {data.summary && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "var(--violet-soft)",
              color: "var(--violet)",
            }}
          >
            {data.summary.strong}/{data.summary.total} قويّة
          </span>
        )}
      </div>

      {!data.recommendations || data.recommendations.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          لا توصيات ترقية حاليّاً — المطاعم على باقات مناسبة
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.recommendations.map((r) => {
            const pct = Math.round(r.confidence * 100);
            const wa = waHref(r.phone, r.scriptAr);
            return (
              <div
                key={r.customerId}
                className="rounded-lg p-3"
                style={{ background: "var(--bg-muted)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <a
                    href={`/endur-customers?id=${encodeURIComponent(r.customerId)}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {r.name}
                    <ExternalLink size={11} color="var(--text-muted)" />
                  </a>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: "var(--font-rajdhani)",
                      color:
                        pct >= 70 ? "var(--success)" : "var(--warning)",
                    }}
                  >
                    ثقة {pct}%
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    marginBottom: 8,
                  }}
                >
                  {r.currentPlan} → <b>{r.recommendedPlan}</b> — {r.reasonAr}
                </p>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "#ECFDF5",
                      color: "#059669",
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    📱 إرسال عبر واتساب
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
