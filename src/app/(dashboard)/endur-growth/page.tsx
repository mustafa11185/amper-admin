"use client";
export const dynamic = "force-dynamic";

/**
 * 📈 النموّ والإيرادات — P-CO-2.2 / P-CO-2.3 (2026-05-16).
 *
 * Forward-looking financial command. Cross-product company surface
 * → top-level per the Product Isolation Rule. Single-page +
 * scroll-spy (canonical side-nav). Sections: النبض · الإيرادات ·
 * الاشتراكات · أعمار الذمم · الموجز التنفيذي (ذكاء اندر).
 */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { useScrollSpy } from "./_components/useScrollSpy";

interface SeriesPoint {
  month: string;
  label: string;
  invoiced: number;
  collected: number;
  newSubs: number;
  churnedSubs: number;
  newMrr: number;
  churnedMrr: number;
  netMrr: number;
  newCustomers: number;
}
interface GrowthData {
  months: number;
  mrr: number;
  arr: number;
  activeSubs: number;
  mrrByProduct: Record<string, number>;
  activeByProduct: Record<string, number>;
  revByProduct: Record<string, number>;
  aging: Record<string, { count: number; total: number }>;
  topOverdue: {
    customerId: string;
    name: string;
    amount: number;
    maxDays: number;
  }[];
  series: SeriesPoint[];
  headline: {
    mrrMoM: number;
    lastNetMrr: number;
    lastNewCustomers: number;
    logoChurnRate: number;
    arOverdueTotal: number;
  };
}
interface Brief {
  generatedAt: string;
  bullets: string[];
  topOpportunity: { customerId: string; name: string } | null;
}

// P-AI-1 / P-AI-2 (2026-05-16) — added مساعد التسعير + كاشف الشذوذ
// (ذكاء اندر). Index-based labels below were renumbered to match.
const SECTIONS = [
  { id: "pulse", label: "النبض" },
  { id: "revenue", label: "الإيرادات" },
  { id: "pricing", label: "مساعد التسعير" },
  { id: "subs", label: "الاشتراكات" },
  { id: "aging", label: "أعمار الذمم" },
  { id: "anomalies", label: "كاشف الشذوذ" },
  { id: "brief", label: "الموجز التنفيذي" },
];

const AGING_LABEL: Record<string, string> = {
  not_due: "غير مستحقّة",
  d1_30: "متأخّر ١–٣٠ يوم",
  d31_60: "متأخّر ٣١–٦٠ يوم",
  d61_plus: "متأخّر ٦٠+ يوم",
};

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}

export default function EndurGrowthPage() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<GrowthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/api/endur-growth?months=${months}`)
      .then(async (r) => {
        const t = await r.text();
        let p: unknown = null;
        if (t) {
          try {
            p = JSON.parse(t);
          } catch {
            setError(`ردّ غير صالح (HTTP ${r.status})`);
            return;
          }
        }
        if (!r.ok) {
          setError((p as { error?: string })?.error ?? `HTTP ${r.status}`);
          return;
        }
        setData(p as GrowthData);
      })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, [months]);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: "MRR", value: iqd(data.mrr), tone: "var(--success)" },
      { label: "ARR تقديري", value: iqd(data.arr), tone: "var(--blue-primary)" },
      {
        label: "اشتراكات نشطة",
        value: String(data.activeSubs),
        tone: "var(--violet)",
      },
      {
        label: "صافي MRR (آخر شهر)",
        value: iqd(data.headline.lastNetMrr),
        tone:
          data.headline.lastNetMrr >= 0
            ? "var(--success)"
            : "var(--danger)",
      },
      {
        label: "عملاء جدد (آخر شهر)",
        value: String(data.headline.lastNewCustomers),
        tone: "var(--blue-primary)",
      },
      {
        label: "معدّل churn",
        value: `${data.headline.logoChurnRate}%`,
        tone:
          data.headline.logoChurnRate > 5
            ? "var(--danger)"
            : "var(--text-primary)",
      },
    ];
  }, [data]);

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 4,
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            ENDUR GROWTH
          </span>
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}
          >
            عابر للمنتجات · مالية واستباقيّة
          </span>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          📈 النموّ والإيرادات
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          الإيراد المتكرّر وحركة الاشتراكات وأعمار الذمم عبر امبير وريستو وبراق،
          مع موجز تنفيذي من «ذكاء اندر».
        </p>
      </header>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <SideNav />

        <div style={{ flex: 1, minWidth: 0 }}>
          {error ? (
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
              <AlertCircle
                size={28}
                style={{ display: "block", margin: "0 auto 8px" }}
              />
              تعذّر تحميل بيانات النموّ — {error}
            </div>
          ) : !data ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 80 }}
            >
              <Loader2
                size={32}
                color="var(--blue-primary)"
                style={{ animation: "spin 1s linear infinite" }}
              />
            </div>
          ) : (
            <>
              {/* ── النبض ── */}
              <Section id="pulse" label={SECTIONS[0].label}>
                <div className="flex justify-end mb-3">
                  <select
                    value={months}
                    onChange={(e) => setMonths(parseInt(e.target.value, 10))}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value={3}>آخر ٣ أشهر</option>
                    <option value={6}>آخر ٦ أشهر</option>
                    <option value={12}>آخر ١٢ شهر</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {k.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-rajdhani)",
                          fontSize: 22,
                          fontWeight: 800,
                          color: k.tone,
                          lineHeight: 1,
                        }}
                      >
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>
                <ProductChips
                  title="MRR حسب المنتج"
                  map={data.mrrByProduct}
                  fmt={iqd}
                />
              </Section>

              {/* ── الإيرادات ── */}
              <Section id="revenue" label={SECTIONS[1].label}>
                <ChartCard>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.series}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        reversed
                      />
                      <YAxis tick={{ fontSize: 11 }} width={70} />
                      <Tooltip
                        formatter={(v) => iqd(Number(v))}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="invoiced"
                        name="مفوتر"
                        fill="var(--blue-primary)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="collected"
                        name="محصّل"
                        fill="var(--success)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <div style={{ marginTop: 12 }}>
                  <ProductChips
                    title="الإيراد ضمن الفترة حسب المنتج"
                    map={data.revByProduct}
                    fmt={iqd}
                  />
                </div>
              </Section>

              {/* ── مساعد التسعير (ذكاء اندر) ── */}
              <Section id="pricing" label={SECTIONS[2].label}>
                <PricingPanel />
              </Section>

              {/* ── الاشتراكات ── */}
              <Section id="subs" label={SECTIONS[3].label}>
                <ChartCard>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.series}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        reversed
                      />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="newSubs"
                        name="اشتراكات جديدة"
                        fill="var(--success)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="churnedSubs"
                        name="منسحبة"
                        fill="var(--danger)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <div
                  className="grid grid-cols-3 gap-3"
                  style={{ marginTop: 12 }}
                >
                  {data.series.slice(-3).map((s) => (
                    <div
                      key={s.month}
                      className="rounded-xl p-3"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        صافي MRR · {s.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-rajdhani)",
                          fontSize: 18,
                          fontWeight: 800,
                          color:
                            s.netMrr >= 0
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {s.netMrr >= 0 ? "+" : ""}
                        {iqd(s.netMrr)}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── أعمار الذمم ── */}
              <Section id="aging" label={SECTIONS[4].label}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {Object.entries(data.aging).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderTop:
                          k === "d61_plus"
                            ? "3px solid var(--danger)"
                            : k === "d31_60"
                              ? "3px solid var(--warning)"
                              : "3px solid var(--border)",
                      }}
                    >
                      <p
                        className="text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {AGING_LABEL[k] ?? k} · {v.count}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-rajdhani)",
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {iqd(v.total)}
                      </p>
                    </div>
                  ))}
                </div>
                {data.topOverdue.length === 0 ? (
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    لا فواتير متأخّرة 🎉
                  </p>
                ) : (
                  <div
                    className="rounded-xl"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {data.topOverdue.map((o) => (
                      <a
                        key={o.customerId}
                        href={`/endur-customers?id=${encodeURIComponent(o.customerId)}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderTop: "1px solid var(--border)",
                          textDecoration: "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {o.name}
                        </span>
                        <span
                          style={{ display: "flex", gap: 12, alignItems: "center" }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--danger)",
                              fontWeight: 700,
                            }}
                          >
                            {o.maxDays} يوم
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              fontFamily: "var(--font-rajdhani)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {iqd(o.amount)}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── كاشف الشذوذ المالي (ذكاء اندر) ── */}
              <Section id="anomalies" label={SECTIONS[5].label}>
                <AnomaliesPanel />
              </Section>

              {/* ── الموجز التنفيذي ── */}
              <Section id="brief" label={SECTIONS[6].label} last>
                <ExecBrief />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── exec brief (ذكاء اندر) ───────────────────────────────────── */

function ExecBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setBrief(null);
    setErr(null);
    fetch("/api/endur-ai/exec-brief")
      .then((r) => r.json())
      .then((d: Brief & { error?: string }) => {
        if (d.error) setErr(d.error);
        else setBrief(d);
      })
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, [nonce]);

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
          ذكاء اندر — الموجز التنفيذي
        </span>
        <button
          onClick={() => setNonce((n) => n + 1)}
          className="cursor-pointer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--bg-muted)",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {err ? (
        <p style={{ fontSize: 13, color: "var(--danger)" }}>{err}</p>
      ) : !brief ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Loader2
            size={22}
            color="var(--blue-primary)"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {brief.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
              }}
            >
              <span style={{ color: "var(--violet)" }}>◆</span>
              <span>{b}</span>
            </li>
          ))}
          {brief.topOpportunity && (
            <a
              href={`/endur-customers?id=${encodeURIComponent(brief.topOpportunity.customerId)}#crosssell`}
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--blue-primary)",
                textDecoration: "none",
              }}
            >
              ← افتح فرصة «{brief.topOpportunity.name}» في ملف 360°
            </a>
          )}
        </ul>
      )}
    </div>
  );
}

/* ── مساعد التسعير (ذكاء اندر) ─────────────────────────────────── */

interface AmperPlanRow {
  planId: string;
  name: string;
  listPrice: number;
  subscribers: number;
  mrr: number;
  avgRealized: number;
  discountPct: number;
  downgradeRate: number;
  upgradesIn: number;
  churn: number;
  recommendations: string[];
}

function PricingPanel() {
  const [data, setData] = useState<{
    amperPlans: AmperPlanRow[];
    restoMix: Record<string, { count: number; mrr: number }>;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/endur-ai/pricing")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

  if (err)
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: "#FEF2F2", color: "#B91C1C", fontWeight: 700 }}
      >
        {err}
      </div>
    );
  if (!data)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Loader2
          size={22}
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
        <Sparkles size={16} color="var(--violet)" />
        ذكاء اندر — مساعد التسعير (باقات امبير)
      </span>

      {data.amperPlans.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          لا باقات امبير مسجّلة
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.amperPlans.map((p) => (
            <div
              key={p.planId}
              className="rounded-lg p-3"
              style={{ background: "var(--bg-muted)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-rajdhani)",
                  }}
                >
                  قائمة {iqd(p.listPrice)} · فعليّ {iqd(p.avgRealized)} ·{" "}
                  {p.subscribers} مشترك
                </span>
              </div>
              <div
                className="flex flex-wrap gap-2 mb-2"
                style={{ fontSize: 10, color: "var(--text-muted)" }}
              >
                <Tag txt={`خصم فعليّ ${p.discountPct}%`} />
                <Tag txt={`تنزيل ${p.downgradeRate}%`} />
                <Tag txt={`ترقيات إليها ${p.upgradesIn}`} />
                <Tag txt={`إلغاء ${p.churn}`} />
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {p.recommendations.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: "var(--violet)" }}>◆</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {Object.keys(data.restoMix).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p
            className="text-xs font-bold mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            مزيج باقات ريستو (لا سعر قائمة مرجعيّ — لقطة فقط)
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.restoMix).map(([k, v]) => (
              <span
                key={k}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--bg-muted)",
                  color: "var(--text-secondary)",
                }}
              >
                {k} · {v.count} · {iqd(v.mrr)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ txt }: { txt: string }) {
  return (
    <span
      style={{
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--bg-surface)",
        color: "var(--text-secondary)",
      }}
    >
      {txt}
    </span>
  );
}

/* ── كاشف الشذوذ المالي (ذكاء اندر) ───────────────────────────── */

interface AnomalyRow {
  type: string;
  label: string;
  ref: string;
  value: number;
  expectedMax: number;
  severity: "high" | "medium";
  explanationAr: string;
}

function AnomaliesPanel() {
  const [data, setData] = useState<{
    summary: { total: number; high: number; byType: Record<string, number> };
    anomalies: AnomalyRow[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/endur-ai/anomalies")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

  if (err)
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: "#FEF2F2", color: "#B91C1C", fontWeight: 700 }}
      >
        {err}
      </div>
    );
  if (!data)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Loader2
          size={22}
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
          ذكاء اندر — كاشف الشذوذ المالي
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
            الكل {data.summary.total}
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
            مرتفع {data.summary.high}
          </span>
        </span>
      </div>

      {data.anomalies.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          لا شذوذ ماليّ مرصود — المؤشّرات ضمن النطاق الإحصائي 🎉
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.anomalies.map((a, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{
                background: "var(--bg-muted)",
                borderRight: `3px solid ${a.severity === "high" ? "#B91C1C" : "#B45309"}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {a.label} · {a.ref}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background:
                      a.severity === "high" ? "#FEE2E2" : "#FEF3C7",
                    color: a.severity === "high" ? "#B91C1C" : "#B45309",
                  }}
                >
                  {a.severity === "high" ? "مرتفع" : "متوسّط"}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                {a.explanationAr}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── shared bits ──────────────────────────────────────────────── */

function SideNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    SECTIONS.map((s) => s.id),
  );
  return (
    <aside
      className="hidden lg:flex flex-col shrink-0"
      style={{
        position: "sticky",
        top: 80,
        width: 140,
        alignSelf: "flex-start",
        paddingTop: 8,
      }}
    >
      <nav className="flex flex-col">
        {SECTIONS.map((s) => {
          const isActive = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => scrollToSection(e, s.id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: 36,
                paddingInline: 12,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive
                  ? "var(--blue-primary)"
                  : "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: "999px 0 0 999px",
                    background: "var(--blue-primary)",
                  }}
                />
              )}
              <span style={{ flex: 1, whiteSpace: "nowrap" }}>{s.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function Section({
  id,
  label,
  last,
  children,
}: {
  id: string;
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{ scrollMarginTop: 80, marginBottom: last ? 0 : 40 }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: 12,
        }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

function ProductChips({
  title,
  map,
  fmt,
}: {
  title: string;
  map: Record<string, number>;
  fmt: (n: number) => string;
}) {
  const entries = Object.entries(map);
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          لا بيانات
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {entries.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-muted)" }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-rajdhani)",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                {fmt(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
