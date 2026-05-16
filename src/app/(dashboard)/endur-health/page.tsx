"use client";
export const dynamic = "force-dynamic";

/**
 * 🩺 صحّة المنصّة — P-CO-3.2 / P-CO-3.3 (2026-05-16).
 *
 * Ops/SRE health umbrella. Cross-product company surface →
 * top-level per the Product Isolation Rule. Single-page +
 * scroll-spy. Sections: الحالة العامّة · تكامل المنتجات · سجلّ
 * الأحداث · المزامنة · التذاكر + فرز ذكاء اندر. Complements (links
 * to) /sync-conflicts + /tickets — does not replace them.
 */

import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useScrollSpy } from "./_components/useScrollSpy";

interface ProductHealth {
  key: string;
  name_ar: string;
  status: string;
  apiConfigured: boolean;
  lastEventAt: string | null;
  events24h: number;
  backlog: number;
  failed: number;
}
interface HealthData {
  generatedAt: string;
  db: { ok: boolean; latencyMs: number };
  score: number;
  band: "healthy" | "attention" | "critical";
  products: ProductHealth[];
  recentEvents: {
    product_key: string;
    event_type: string;
    external_ref: string | null;
    state: "failed" | "pending" | "processed";
    created_at: string;
  }[];
  sync: { byStatus: Record<string, number>; problems: number };
  tickets: {
    open: number;
    byPriority: Record<string, number>;
    unassigned: number;
    agedOpen: number;
    oldestOpenAgeH: number;
  };
  signals: {
    totalBacklog: number;
    totalFailed: number;
    syncProblems: number;
    misconfigured: number;
    agedOpen: number;
  };
}
interface TriageTicket {
  id: string;
  title: string;
  customerName: string | null;
  ageHours: number;
  assigned: boolean;
  awaitingFirstReply: boolean;
  severity: "critical" | "high" | "normal";
  product: string;
  slaRisk: "breached" | "at_risk" | "ok";
  suggestedReply: string;
}

const SECTIONS = [
  { id: "overall", label: "الحالة العامّة" },
  { id: "products", label: "تكامل المنتجات" },
  { id: "events", label: "سجلّ الأحداث" },
  { id: "sync", label: "المزامنة" },
  { id: "tickets", label: "التذاكر" },
];

const BAND: Record<
  HealthData["band"],
  { bg: string; fg: string; label: string }
> = {
  healthy: { bg: "#DCFCE7", fg: "#15803D", label: "سليمة" },
  attention: { bg: "#FEF3C7", fg: "#B45309", label: "تحتاج انتباه" },
  critical: { bg: "#FEE2E2", fg: "#B91C1C", label: "حرجة" },
};
const STATE_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  processed: { bg: "#DCFCE7", fg: "#15803D", label: "مُعالَج" },
  pending: { bg: "#FEF3C7", fg: "#B45309", label: "منتظِر" },
  failed: { bg: "#FEE2E2", fg: "#B91C1C", label: "فشل" },
};
const SEV_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  critical: { bg: "#FEE2E2", fg: "#B91C1C", label: "حرِج" },
  high: { bg: "#FEF3C7", fg: "#B45309", label: "مرتفع" },
  normal: { bg: "var(--bg-muted)", fg: "var(--text-muted)", label: "عادي" },
};
const SLA_TONE: Record<string, { fg: string; label: string }> = {
  breached: { fg: "#B91C1C", label: "تجاوز SLA" },
  at_risk: { fg: "#B45309", label: "قريب من SLA" },
  ok: { fg: "#15803D", label: "ضمن SLA" },
};

function dateAr(d: string): string {
  return new Date(d).toLocaleString("ar-IQ", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function EndurHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch("/api/endur-health")
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
        setData(p as HealthData);
      })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, [nonce]);

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
            ENDUR OPS
          </span>
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}
          >
            عابر للمنتجات · تشغيل واستقرار
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
          🩺 صحّة المنصّة
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          تكامل المنتجات وطابور المزامنة وصحّة التذاكر عبر امبير وريستو وبراق،
          مع فرز تذاكر من «ذكاء اندر».
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
              تعذّر تحميل صحّة المنصّة — {error}
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
              {/* ── الحالة العامّة ── */}
              <Section id="overall" label={SECTIONS[0].label}>
                <div className="flex justify-end mb-3">
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
                <div
                  className="rounded-xl p-5 mb-4 flex items-center justify-between"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      مؤشّر الصحّة العام
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-rajdhani)",
                        fontSize: 40,
                        fontWeight: 800,
                        lineHeight: 1,
                        color: BAND[data.band].fg,
                      }}
                    >
                      {data.score}
                      <span
                        style={{ fontSize: 16, color: "var(--text-muted)" }}
                      >
                        /100
                      </span>
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: BAND[data.band].bg,
                      color: BAND[data.band].fg,
                    }}
                  >
                    {BAND[data.band].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Kpi
                    label="قاعدة البيانات"
                    value={
                      data.db.ok ? `${data.db.latencyMs}ms` : "غير متّصلة"
                    }
                    tone={data.db.ok ? "var(--success)" : "var(--danger)"}
                  />
                  <Kpi
                    label="أحداث متراكمة"
                    value={String(data.signals.totalBacklog)}
                    tone={
                      data.signals.totalBacklog > 0
                        ? "var(--warning)"
                        : "var(--success)"
                    }
                  />
                  <Kpi
                    label="أحداث فاشلة"
                    value={String(data.signals.totalFailed)}
                    tone={
                      data.signals.totalFailed > 0
                        ? "var(--danger)"
                        : "var(--success)"
                    }
                  />
                  <Kpi
                    label="مشاكل مزامنة"
                    value={String(data.signals.syncProblems)}
                    tone={
                      data.signals.syncProblems > 0
                        ? "var(--danger)"
                        : "var(--success)"
                    }
                  />
                </div>
              </Section>

              {/* ── تكامل المنتجات ── */}
              <Section id="products" label={SECTIONS[1].label}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.products.map((p) => (
                    <div
                      key={p.key}
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderTop:
                          p.failed > 0
                            ? "3px solid var(--danger)"
                            : p.backlog > 0
                              ? "3px solid var(--warning)"
                              : "3px solid var(--success)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "var(--text-primary)",
                          }}
                        >
                          {p.name_ar}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--bg-muted)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                      <Row
                        k="ربط الـ API"
                        v={p.apiConfigured ? "مهيّأ" : "غير مهيّأ"}
                        bad={!p.apiConfigured && p.status === "ACTIVE"}
                      />
                      <Row
                        k="آخر حدث"
                        v={p.lastEventAt ? dateAr(p.lastEventAt) : "لا يوجد"}
                      />
                      <Row k="أحداث ٢٤ساعة" v={String(p.events24h)} />
                      <Row
                        k="متراكمة"
                        v={String(p.backlog)}
                        bad={p.backlog > 0}
                      />
                      <Row
                        k="فاشلة"
                        v={String(p.failed)}
                        bad={p.failed > 0}
                      />
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── سجلّ الأحداث ── */}
              <Section id="events" label={SECTIONS[2].label}>
                {data.recentEvents.length === 0 ? (
                  <Empty text="لا أحداث مسجّلة" />
                ) : (
                  <div
                    className="rounded-xl overflow-x-auto"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead style={{ background: "var(--bg-muted)" }}>
                        <tr>
                          <Th>المنتج</Th>
                          <Th>الحدث</Th>
                          <Th>المرجع</Th>
                          <Th>الحالة</Th>
                          <Th>الوقت</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentEvents.map((e, i) => {
                          const tn =
                            STATE_TONE[e.state] ?? STATE_TONE.pending;
                          return (
                            <tr
                              key={i}
                              style={{
                                borderTop: "1px solid var(--border)",
                              }}
                            >
                              <Td>
                                <b style={{ fontSize: 12 }}>
                                  {e.product_key}
                                </b>
                              </Td>
                              <Td>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontFamily:
                                      "var(--font-jetbrains-mono)",
                                  }}
                                >
                                  {e.event_type}
                                </span>
                              </Td>
                              <Td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {e.external_ref ?? "—"}
                                </span>
                              </Td>
                              <Td>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    background: tn.bg,
                                    color: tn.fg,
                                  }}
                                >
                                  {tn.label}
                                </span>
                              </Td>
                              <Td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {dateAr(e.created_at)}
                                </span>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* ── المزامنة ── */}
              <Section id="sync" label={SECTIONS[3].label}>
                <div className="flex flex-wrap gap-3 mb-3">
                  {Object.entries(data.sync.byStatus).length === 0 ? (
                    <Empty text="طابور المزامنة فارغ" />
                  ) : (
                    Object.entries(data.sync.byStatus).map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xl p-4"
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          minWidth: 140,
                        }}
                      >
                        <p
                          className="text-xs mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {k}
                        </p>
                        <p
                          style={{
                            fontFamily: "var(--font-rajdhani)",
                            fontSize: 22,
                            fontWeight: 800,
                            color:
                              k === "conflict" || k === "error"
                                ? "var(--danger)"
                                : "var(--text-primary)",
                          }}
                        >
                          {v}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <a
                  href="/sync-conflicts"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--blue-primary)",
                    textDecoration: "none",
                  }}
                >
                  فتح شاشة تعارضات المزامنة
                  <ExternalLink size={12} />
                </a>
              </Section>

              {/* ── التذاكر + فرز ذكاء اندر ── */}
              <Section id="tickets" label={SECTIONS[4].label} last>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Kpi
                    label="مفتوحة"
                    value={String(data.tickets.open)}
                    tone="var(--blue-primary)"
                  />
                  <Kpi
                    label="غير مُسنَدة"
                    value={String(data.tickets.unassigned)}
                    tone={
                      data.tickets.unassigned > 0
                        ? "var(--warning)"
                        : "var(--success)"
                    }
                  />
                  <Kpi
                    label="متقادمة (٧٢ساعة+)"
                    value={String(data.tickets.agedOpen)}
                    tone={
                      data.tickets.agedOpen > 0
                        ? "var(--danger)"
                        : "var(--success)"
                    }
                  />
                  <Kpi
                    label="أقدم تذكرة"
                    value={`${data.tickets.oldestOpenAgeH}س`}
                    tone="var(--text-primary)"
                  />
                </div>
                <TicketTriage />
                <a
                  href="/tickets"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--blue-primary)",
                    textDecoration: "none",
                  }}
                >
                  فتح شاشة التذاكر الكاملة
                  <ExternalLink size={12} />
                </a>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ticket triage (ذكاء اندر) ────────────────────────────────── */

function TicketTriage() {
  const [data, setData] = useState<{
    summary: {
      total: number;
      critical: number;
      breached: number;
      awaitingFirstReply: number;
    };
    tickets: TriageTicket[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/endur-ai/ticket-triage")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, []);

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
        ذكاء اندر — فرز التذاكر
      </span>

      {err ? (
        <p style={{ fontSize: 13, color: "var(--danger)" }}>{err}</p>
      ) : !data ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Loader2
            size={22}
            color="var(--blue-primary)"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      ) : data.tickets.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          لا تذاكر مفتوحة بحاجة فرز 🎉
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge label={`الكل ${data.summary.total}`} />
            <Badge
              label={`حرِجة ${data.summary.critical}`}
              tone="#B91C1C"
            />
            <Badge
              label={`تجاوز SLA ${data.summary.breached}`}
              tone="#B45309"
            />
            <Badge
              label={`بانتظار أوّل ردّ ${data.summary.awaitingFirstReply}`}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.tickets.slice(0, 12).map((t) => {
              const sv = SEV_TONE[t.severity];
              const sla = SLA_TONE[t.slaRisk];
              return (
                <div
                  key={t.id}
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
                      {t.title}
                    </span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: sv.bg,
                          color: sv.fg,
                        }}
                      >
                        {sv.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: sla.fg,
                        }}
                      >
                        {sla.label}
                      </span>
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    {t.product} · {t.customerName ?? "بدون عميل"} ·{" "}
                    {t.ageHours}س
                    {t.awaitingFirstReply ? " · بانتظار أوّل ردّ" : ""}
                    {!t.assigned ? " · غير مُسنَدة" : ""}
                  </p>
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    {t.suggestedReply}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
          fontSize: 20,
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

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{k}</span>
      <span
        style={{
          fontWeight: 700,
          color: bad ? "var(--danger)" : "var(--text-primary)",
        }}
      >
        {v}
      </span>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 999,
        background: "var(--bg-muted)",
        color: tone ?? "var(--text-secondary)",
      }}
    >
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
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
      {text}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "right",
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children?: React.ReactNode }) {
  return (
    <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}
