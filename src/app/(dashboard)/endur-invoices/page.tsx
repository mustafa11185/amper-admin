"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  FileText,
  Calendar,
  Hash,
  Filter,
} from "lucide-react";

interface InvoiceLine {
  id: string;
  description: string;
  total: number;
  product: { name_ar: string; key: string; color: string };
}
interface Invoice {
  id: string;
  invoice_number: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  total: number;
  customer: { id: string; name: string; phone: string };
  line_items: InvoiceLine[];
}

const STATUS_INFO: Record<
  Invoice["status"],
  { label: string; bg: string; color: string }
> = {
  DRAFT: { label: "مسودة", bg: "rgba(100,116,139,0.12)", color: "#475569" },
  SENT: { label: "مُرسلة", bg: "rgba(27,79,216,0.12)", color: "#1B4FD8" },
  PAID: { label: "مدفوعة", bg: "rgba(5,150,105,0.12)", color: "#059669" },
  OVERDUE: { label: "متأخرة", bg: "rgba(220,38,38,0.12)", color: "#DC2626" },
  CANCELLED: { label: "ملغاة", bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
};

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// P-RULE-1 (2026-05-16) — product key → its hub tab + the section
// anchor that lists customers. Clicking a product badge on an
// invoice row deep-links into that product's tab, carrying the
// customer id so the product side can pre-filter.
const PRODUCT_ROUTE: Record<string, { path: string; anchor: string; label: string }> = {
  AMPER:   { path: "/products/amper",   anchor: "clients",   label: "امبير" },
  RESTOIQ: { path: "/products/restoiq", anchor: "customers", label: "ريستو" },
  BARQ:    { path: "/products/barq",    anchor: "overview",  label: "براق" },
};

function productHref(key: string, customerId: string): string {
  const r = PRODUCT_ROUTE[key];
  if (!r) return "/products";
  return `${r.path}?customer=${encodeURIComponent(customerId)}#${r.anchor}`;
}

export default function EndurInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  // P-RULE-1 — context arriving from a product tab: a customer to
  // pre-filter on + which product launched us (for the banner copy).
  // Read from window (client-only page) to avoid a Suspense wrapper.
  const [ctx, setCtx] = useState<{ customerId: string; product: string | null }>({
    customerId: "",
    product: null,
  });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cid = sp.get("customer_id") ?? "";
    const prod = sp.get("product");
    if (cid) setCtx({ customerId: cid, product: prod });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (ctx.customerId) params.set("customer_id", ctx.customerId);
    const qs = params.toString();
    fetch(`/api/endur-invoices${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []));
  }, [statusFilter, ctx.customerId]);

  if (!invoices) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const totals = invoices.reduce(
    (acc, inv) => ({
      count: acc.count + 1,
      sum: acc.sum + inv.total,
      paid: acc.paid + (inv.status === "PAID" ? inv.total : 0),
      overdue: acc.overdue + (inv.status === "OVERDUE" ? inv.total : 0),
    }),
    { count: 0, sum: 0, paid: 0, overdue: 0 }
  );

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            فواتير اندر
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            فواتير شركة اندر للحلول التقنية — موحدة لكل المنتجات
          </p>
        </div>

        <Link
          href="/endur-invoices/new"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 12,
            background: "var(--brand-teal)",
            color: "#fff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-cairo), var(--font-tajawal)",
          }}
        >
          <Plus size={16} />
          فاتورة جديدة
        </Link>
      </div>

      {/* P-RULE-1 — context banner when we arrived from a product tab.
          Tells the operator the list is scoped to one customer and
          offers a one-click way back to the full company view. */}
      {ctx.customerId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 18px",
            marginBottom: 18,
            borderRadius: 12,
            background: "var(--brand-cyan-soft, rgba(20,184,166,0.10))",
            border: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            🔗 معروض فواتير عميل واحد
            {ctx.product && PRODUCT_ROUTE[ctx.product]
              ? ` — قادم من تبويبة ${PRODUCT_ROUTE[ctx.product].label}`
              : ""}
            {invoices ? ` · ${invoices.length} فاتورة` : ""}
          </span>
          <button
            onClick={() => {
              setCtx({ customerId: "", product: null });
              window.history.replaceState(null, "", "/endur-invoices");
            }}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--brand-teal)",
              cursor: "pointer",
              fontFamily: "var(--font-cairo), var(--font-tajawal)",
            }}
          >
            عرض كل الفواتير ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Stat label="إجمالي الفواتير" value={String(totals.count)} />
        <Stat label="إجمالي المبلغ" value={formatIQD(totals.sum)} />
        <Stat label="مدفوع" value={formatIQD(totals.paid)} positive />
        <Stat label="متأخر" value={formatIQD(totals.overdue)} negative />
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <Filter size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>الحالة:</span>
        {[
          { v: "", l: "الكل" },
          { v: "DRAFT", l: "مسودة" },
          { v: "SENT", l: "مرسلة" },
          { v: "PAID", l: "مدفوعة" },
          { v: "OVERDUE", l: "متأخرة" },
        ].map((opt) => {
          const active = statusFilter === opt.v;
          return (
            <button
              key={opt.v || "all"}
              onClick={() => setStatusFilter(opt.v)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border)",
                background: active ? "var(--brand-cyan-soft)" : "transparent",
                color: active ? "var(--brand-teal)" : "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "var(--font-cairo), var(--font-tajawal)",
              }}
            >
              {opt.l}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Th>رقم الفاتورة</Th>
                <Th>العميل</Th>
                <Th>المنتجات</Th>
                <Th>التاريخ</Th>
                <Th>الاستحقاق</Th>
                <Th>المبلغ</Th>
                <Th>الحالة</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <Td>
                    <Link
                      href={`/endur-invoices/${inv.id}`}
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--brand-teal)",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {inv.invoice_number}
                    </Link>
                  </Td>
                  <Td>
                    <div style={{ fontWeight: 600 }}>{inv.customer.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {inv.customer.phone}
                    </div>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Array.from(
                        new Map(
                          inv.line_items.map((l) => [l.product.key, l.product])
                        ).values()
                      ).map((p) => (
                        // P-RULE-1 — clickable product badge: jumps
                        // into the product's tab, carrying this
                        // invoice's customer for pre-filtering.
                        <Link
                          key={p.key}
                          href={productHref(p.key, inv.customer.id)}
                          title={`افتح ${p.name_ar} لهذا العميل`}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `${p.color}1A`,
                            color: p.color,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {p.name_ar}
                          <span style={{ fontSize: 9, opacity: 0.7 }}>↗</span>
                        </Link>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(inv.issued_at)}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(inv.due_at)}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {formatIQD(inv.total)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={inv.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive
    ? "var(--success)"
    : negative
      ? "var(--danger)"
      : "var(--text-primary)";
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          color,
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const info = STATUS_INFO[status];
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: info.bg,
        color: info.color,
      }}
    >
      {info.label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "right",
        padding: "12px 16px",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "12px 16px", fontSize: 13 }}>{children}</td>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px dashed var(--border)",
        borderRadius: 16,
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <FileText
        size={40}
        color="var(--text-muted)"
        style={{ margin: "0 auto 12px" }}
      />
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        لا توجد فواتير بعد
      </p>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        أنشئ أول فاتورة باسم اندر لعميلك
      </p>
    </div>
  );
}
