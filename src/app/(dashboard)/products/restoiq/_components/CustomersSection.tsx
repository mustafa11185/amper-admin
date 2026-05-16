"use client";

/**
 * /products/restoiq/customers — P-MERGE-2 (2026-05-14).
 *
 * Lists every RestoIQ subscription from Amper's own DB. P-MERGE-3
 * will add a per-row "open in RestoIQ admin" link + a live
 * branch-count + last-activity tooltip via the API proxy.
 */
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Customer {
  id: string;
  customer_id: string;
  external_ref: string;
  name: string;
  phone: string | null;
  billing_type: "RECURRING" | "ENGAGEMENT";
  plan_name: string | null;
  monthly_amount: number | null;
  status: string;
  started_at: string;
  ends_at: string | null;
}

const STATUS_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  active:    { bg: "#DCFCE7", fg: "#15803D", label: "نشط" },
  trial:     { bg: "#FEF3C7", fg: "#B45309", label: "تجريبي" },
  paused:    { bg: "#F1F5F9", fg: "#475569", label: "متوقّف" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "ملغى" },
};

function formatIQD(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

export default function CustomersSection() {
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // P-FIX-1: tolerate empty / non-JSON responses. The previous
    // .then((r) => r.json()) crashed with "Unexpected end of JSON
    // input" when a server-side handler died mid-stream.
    fetch("/api/restoiq/customers")
      .then(async (r) => {
        const text = await r.text();
        let parsed: unknown = null;
        if (text) {
          try {
            parsed = JSON.parse(text);
          } catch {
            setError(`الخادم أعاد ردّاً غير صالح (HTTP ${r.status})`);
            return;
          }
        }
        if (!r.ok) {
          const p = parsed as { error?: string; detail?: string } | null;
          const msg = p?.error ?? `HTTP ${r.status}`;
          setError(p?.detail ? `${msg} — ${p.detail}` : msg);
          return;
        }
        const p = parsed as { customers?: Customer[] } | null;
        setRows(p?.customers ?? []);
      })
      .catch((e) =>
        setError(String(e instanceof Error ? e.message : e)),
      );
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.phone ?? "").includes(q) ||
        r.external_ref.toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  if (error) return <ErrorPanel message={error} />;
  if (!rows || !filtered) return <LoadingPanel />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter bar */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 220,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--bg-muted)",
            borderRadius: 10,
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="ابحث باسم المطعم، هاتف، أو معرّف…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontFamily: "var(--font-tajawal)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-tajawal)",
          }}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="trial">تجريبي</option>
          <option value="paused">متوقّف</option>
          <option value="cancelled">ملغى</option>
        </select>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {filtered.length} / {rows.length}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState rowsTotal={rows.length} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-muted)" }}>
              <tr>
                <Th>المطعم</Th>
                <Th>الهاتف</Th>
                <Th>الباقة</Th>
                <Th>الفوترة الشهريّة</Th>
                <Th>الحالة</Th>
                <Th>منذ</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const tone = STATUS_TONE[c.status] ?? STATUS_TONE.cancelled;
                return (
                  <tr
                    key={c.id}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <Td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {c.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-jetbrains-mono)",
                            marginTop: 2,
                          }}
                        >
                          ref: {c.external_ref}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 12 }} dir="ltr">
                        {c.phone ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {c.plan_name ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-rajdhani)",
                          fontWeight: 700,
                        }}
                      >
                        {formatIQD(c.monthly_amount)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: tone.bg,
                          color: tone.fg,
                        }}
                      >
                        {tone.label}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(c.started_at).toLocaleDateString("ar-IQ")}
                      </span>
                    </Td>
                    <Td>
                      <button
                        disabled
                        title="سيُفعَّل في P-MERGE-3"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: "var(--bg-muted)",
                          color: "var(--text-muted)",
                          border: "none",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "not-allowed",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ExternalLink size={12} />
                        فتح
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function Th({ children }: { children?: React.ReactNode }) {
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
function Td({ children }: { children?: React.ReactNode }) {
  return <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>{children}</td>;
}

function EmptyState({ rowsTotal }: { rowsTotal: number }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <Users
        size={32}
        style={{ display: "block", margin: "0 auto 10px", opacity: 0.5 }}
      />
      {rowsTotal === 0 ? (
        <>
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            لا يوجد مطاعم مشتركة في RestoIQ بعد
          </p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            عند تسجيل أوّل مطعم في النظام، سيظهر هنا تلقائيّاً.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            لا نتائج تطابق البحث
          </p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            جرّب تغيير الفلاتر أو مسح صندوق البحث.
          </p>
        </>
      )}
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
      <p style={{ fontSize: 14 }}>تعذّر تحميل قائمة المطاعم</p>
      <p style={{ fontSize: 12, marginTop: 6, fontFamily: "var(--font-jetbrains-mono)" }}>
        {message}
      </p>
    </div>
  );
}
