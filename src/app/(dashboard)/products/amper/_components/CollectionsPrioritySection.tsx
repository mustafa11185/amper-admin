"use client";

/**
 * CollectionsPrioritySection — P-AI-4 (2026-05-16).
 *
 * Amper hub section. «ذكاء امبير» — deterministic collection
 * prioritisation of indebted active subscribers (debt percentile +
 * needs-attention flag → band + action). Not geo-routing.
 */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { FOLoader, FOError, FOKpi, FOCard, FOEmpty, iqd } from "./fieldOpsUi";

interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
  flagged: boolean;
  branch: string;
  band: "high" | "medium";
  action: string;
}

const BAND: Record<string, { bg: string; fg: string; label: string }> = {
  high: { bg: "#FEE2E2", fg: "#B91C1C", label: "عاجل" },
  medium: { bg: "#FEF3C7", fg: "#B45309", label: "متوسّط" },
};

function wa(phone: string | null, name: string): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^0-9]/g, "");
  const intl = d.startsWith("0") ? "964" + d.slice(1) : d;
  const txt = `مرحباً ${name} 👋 تذكير ودّي بخصوص المستحقّات على اشتراك المولّد. نقدر نرتّب الدفع بالطريقة المناسبة لكم — شكراً لتعاونكم.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(txt)}`;
}

export default function CollectionsPrioritySection() {
  const [data, setData] = useState<{
    summary: {
      debtors: number;
      totalOutstanding: number;
      flagged: number;
      high: number;
    };
    topBranches: { branch: string; count: number; debt: number }[];
    list: Debtor[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products/amper/ai/collections")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

  if (err) return <FOError message={err} />;
  if (!data) return <FOLoader />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FOKpi
          label="مدينون نشطون"
          value={data.summary.debtors}
          tone="var(--blue-primary)"
        />
        <FOKpi
          label="إجمالي المستحقّات"
          value={iqd(data.summary.totalOutstanding)}
          tone="var(--danger)"
        />
        <FOKpi
          label="معلَّمون للانتباه"
          value={data.summary.flagged}
          tone={
            data.summary.flagged > 0 ? "var(--warning)" : "var(--success)"
          }
        />
        <FOKpi
          label="أولويّة عاجلة"
          value={data.summary.high}
          tone={
            data.summary.high > 0 ? "var(--danger)" : "var(--success)"
          }
        />
      </div>

      <FOCard>
        <p
          className="text-xs font-bold mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          أعلى الفروع مستحقّات
        </p>
        {data.topBranches.length === 0 ? (
          <FOEmpty text="لا مستحقّات" />
        ) : (
          data.topBranches.map((b, i) => (
            <div
              key={b.branch}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                fontSize: 12,
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 700 }}>{b.branch}</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {b.count} مدين ·{" "}
                <b style={{ color: "var(--danger)" }}>{iqd(b.debt)}</b>
              </span>
            </div>
          ))
        )}
      </FOCard>

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
          ذكاء امبير — قائمة الجباية ذات الأولويّة
        </span>
        {data.list.length === 0 ? (
          <FOEmpty text="لا مدينين بأولويّة 🎉" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.list.map((d) => {
              const b = BAND[d.band];
              const link = wa(d.phone, d.name);
              return (
                <div
                  key={d.id}
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
                      {d.name}{" "}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        · {d.branch}
                      </span>
                    </span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          fontFamily: "var(--font-rajdhani)",
                          color: "var(--danger)",
                        }}
                      >
                        {iqd(d.debt)}
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
                        {b.label}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {d.action}
                    </span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#059669",
                          textDecoration: "none",
                        }}
                      >
                        📱 تذكير واتساب
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FOCard>
    </div>
  );
}
