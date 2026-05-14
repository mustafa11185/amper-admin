"use client";

/**
 * /products/restoiq/ai — P-MERGE-3 wired (2026-05-14).
 *
 * Lists every AI subscription pool from the RestoIQ backend via the
 * HMAC-signed proxy at /api/restoiq/ai-subscriptions. Falls back to
 * a friendly "configure first" screen when the RESTOIQ Product row
 * is missing api_base_url or webhook_secret.
 */
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Wrench,
  CheckCircle2,
  Pause,
  XCircle,
  Clock,
} from "lucide-react";

interface AiPool {
  id: string;
  name: string;
  tier: string;
  poolLimit: number;
  poolUsed: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  ownerCustomerId: string;
  ownerCustomer?: { id: string; name: string; email: string | null };
  _count?: { allocations: number };
  notes?: string | null;
}

interface PoolsResponse {
  success?: boolean;
  items: AiPool[];
  total: number;
}

interface ErrorPayload {
  error: string;
  code?: string;
  status?: number;
  configured?: boolean;
  upstream?: unknown;
}

const STATUS_TONE: Record<
  string,
  { bg: string; fg: string; label: string; Icon: typeof CheckCircle2 }
> = {
  ACTIVE:    { bg: "#DCFCE7", fg: "#15803D", label: "نشط",     Icon: CheckCircle2 },
  SUSPENDED: { bg: "#FEF3C7", fg: "#B45309", label: "موقّت",   Icon: Pause },
  EXPIRED:   { bg: "#F1F5F9", fg: "#475569", label: "منتهي",   Icon: Clock },
  CANCELLED: { bg: "#FEE2E2", fg: "#B91C1C", label: "ملغى",    Icon: XCircle },
};

const TIER_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  FREE:    { bg: "#F1F5F9", fg: "#475569", label: "مجانيّة" },
  PREMIUM: { bg: "#F3E8FF", fg: "#7C3AED", label: "بريميوم" },
  PRO:     { bg: "#FEF3C7", fg: "#B45309", label: "برو" },
};

export default function RestoIqAiPage() {
  const [data, setData] = useState<PoolsResponse | null>(null);
  const [err, setErr] = useState<ErrorPayload | null>(null);

  useEffect(() => {
    fetch("/api/restoiq/ai-subscriptions")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) setErr(body);
        else setData(body as PoolsResponse);
      })
      .catch((e) => setErr({ error: String(e) }));
  }, []);

  const totals = useMemo(() => {
    if (!data?.items) return null;
    const totalLimit = data.items.reduce((s, p) => s + p.poolLimit, 0);
    const totalUsed = data.items.reduce((s, p) => s + p.poolUsed, 0);
    const active = data.items.filter((p) => p.status === "ACTIVE").length;
    const totalAllocs = data.items.reduce(
      (s, p) => s + (p._count?.allocations ?? 0),
      0,
    );
    return { totalLimit, totalUsed, active, totalAllocs };
  }, [data]);

  if (err) {
    return err.configured === false ? <NotConfiguredPanel /> : <ErrorPanel err={err} />;
  }
  if (!data) return <LoadingPanel />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <HeroBanner />

      {/* KPI strip */}
      {totals && data.items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <Kpi label="عدد الـ pools" value={String(data.total)} hint={`${totals.active} نشط`} />
          <Kpi
            label="إجمالي الحدّ الشهري"
            value={totals.totalLimit.toLocaleString("ar-IQ")}
            hint="رصيد ذكاء RestoIQ"
          />
          <Kpi
            label="المستهلك"
            value={totals.totalUsed.toLocaleString("ar-IQ")}
            hint={`${Math.round((totals.totalUsed / Math.max(totals.totalLimit, 1)) * 100)}% من الإجمالي`}
          />
          <Kpi
            label="إجمالي البرندات"
            value={String(totals.totalAllocs)}
            hint="موزّعة على الـ pools"
          />
        </div>
      )}

      {/* Pools table */}
      {data.items.length === 0 ? (
        <EmptyPools />
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-muted)" }}>
              <tr>
                <Th>الـ Pool</Th>
                <Th>العميل</Th>
                <Th>الباقة</Th>
                <Th>الحالة</Th>
                <Th>الاستهلاك</Th>
                <Th>تنتهي</Th>
                <Th>البرندات</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const tone = STATUS_TONE[p.status] ?? STATUS_TONE.CANCELLED;
                const tierTone = TIER_TONE[p.tier] ?? {
                  bg: "var(--bg-muted)",
                  fg: "var(--text-secondary)",
                  label: p.tier,
                };
                const usedPct = p.poolLimit > 0 ? (p.poolUsed / p.poolLimit) * 100 : 0;
                const StatusIcon = tone.Icon;
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name}
                        </span>
                        {p.notes && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            {p.notes}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {p.ownerCustomer?.name ?? p.ownerCustomerId.slice(0, 8)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: tierTone.bg,
                          color: tierTone.fg,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {tierTone.label}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: tone.bg,
                          color: tone.fg,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <StatusIcon size={12} />
                        {tone.label}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ minWidth: 140 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            marginBottom: 4,
                            fontFamily: "var(--font-rajdhani)",
                          }}
                        >
                          <span>{p.poolUsed.toLocaleString("ar-IQ")}</span>
                          <span>{p.poolLimit.toLocaleString("ar-IQ")}</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "var(--bg-muted)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(usedPct, 2))}%`,
                              height: "100%",
                              background:
                                usedPct >= 90
                                  ? "var(--danger)"
                                  : usedPct >= 70
                                    ? "#D97706"
                                    : "var(--blue-primary)",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(p.periodEnd).toLocaleDateString("ar-IQ")}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "var(--font-rajdhani)",
                        }}
                      >
                        {p._count?.allocations ?? 0}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        ⚡ مباشر — يتحدّث من RestoIQ backend عبر HMAC موقّع
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function HeroBanner() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
        border: "1px solid #FCD34D",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <Sparkles size={28} color="#B45309" />
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#92400E",
            marginBottom: 6,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          RESTOIQ AI · POOLS
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#78350F", marginBottom: 4 }}>
          إدارة pools ذكاء RestoIQ
        </h2>
        <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
          كل pool يضمّ حدّاً شهرياً موزَّعاً على برندات العميل. البيانات
          تأتي مباشرةً من backend الـ RestoIQ.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 18px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "var(--font-rajdhani)",
          marginBottom: 2,
        }}
      >
        {value}
      </p>
      {hint && <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "right",
        padding: "12px 16px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>{children}</td>;
}

function EmptyPools() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px dashed var(--border)",
        borderRadius: 14,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <Sparkles
        size={32}
        color="var(--text-muted)"
        style={{ display: "block", margin: "0 auto 10px" }}
      />
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
        لا توجد pools حاليّاً
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
        أنشئ أوّل pool لتفعيل ذكاء RestoIQ لعملائك. (نموذج الإنشاء قيد البناء — استعمل الآن واجهة الـ RestoIQ القديمة عبر الـ deep-link أعلاه.)
      </p>
    </div>
  );
}

function NotConfiguredPanel() {
  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FCD34D",
        borderRadius: 14,
        padding: "28px 32px",
        textAlign: "center",
      }}
    >
      <Wrench size={32} color="#B45309" style={{ display: "block", margin: "0 auto 12px" }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#78350F", marginBottom: 8 }}>
        المنتج غير مُهيَّأ بعد
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#92400E",
          lineHeight: 1.7,
          maxWidth: 560,
          margin: "0 auto 14px",
        }}
      >
        لاستعمال هذا القسم، اضبط <code style={{ padding: "2px 6px", borderRadius: 4, background: "#FEF3C7", fontFamily: "var(--font-jetbrains-mono)", fontSize: 11 }}>api_base_url</code> و <code style={{ padding: "2px 6px", borderRadius: 4, background: "#FEF3C7", fontFamily: "var(--font-jetbrains-mono)", fontSize: 11 }}>webhook_secret</code> على صفّ المنتج <b>RESTOIQ</b> في قاعدة بيانات اندر. شغّل:
      </p>
      <code
        style={{
          display: "block",
          padding: "10px 14px",
          background: "#FEF3C7",
          borderRadius: 8,
          fontSize: 12,
          fontFamily: "var(--font-jetbrains-mono)",
          maxWidth: 460,
          margin: "0 auto",
          color: "#78350F",
        }}
      >
        npx tsx prisma/scripts/seed-restoiq-product.ts
      </code>
    </div>
  );
}

function ErrorPanel({ err }: { err: ErrorPayload }) {
  return (
    <div
      style={{
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 12,
        padding: "24px 28px",
        color: "#B91C1C",
      }}
    >
      <AlertCircle size={28} style={{ display: "block", margin: "0 auto 8px" }} />
      <p style={{ fontSize: 14, fontWeight: 700, textAlign: "center" }}>
        تعذّر التواصل مع RestoIQ backend
      </p>
      <p style={{ fontSize: 12, marginTop: 6, textAlign: "center" }}>{err.error}</p>
      {err.code && (
        <p style={{ fontSize: 11, marginTop: 4, textAlign: "center", fontFamily: "var(--font-jetbrains-mono)" }}>
          code: {err.code} · status: {err.status ?? "—"}
        </p>
      )}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2
        size={32}
        color="var(--blue-primary)"
        style={{ animation: "spin 1s linear infinite" }}
      />
    </div>
  );
}
