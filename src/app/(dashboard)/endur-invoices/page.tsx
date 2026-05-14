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

export default function EndurInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const url = statusFilter
      ? `/api/endur-invoices?status=${statusFilter}`
      : "/api/endur-invoices";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []));
  }, [statusFilter]);

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
                        <span
                          key={p.key}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `${p.color}1A`,
                            color: p.color,
                            fontWeight: 600,
                          }}
                        >
                          {p.name_ar}
                        </span>
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
