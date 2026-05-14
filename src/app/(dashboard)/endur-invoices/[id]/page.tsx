"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Printer,
  CheckCircle2,
  Send,
  XCircle,
  Loader2,
} from "lucide-react";
import EndurInvoiceTemplate from "@/components/EndurInvoiceTemplate";

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product: { id: string; key: string; name_ar: string; name_en: string; color: string };
}
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  governorate: string | null;
  address: string | null;
}
interface CompanySnapshot {
  name_ar?: string;
  name_en?: string;
  registration_no?: string | null;
  tax_id?: string | null;
  address_ar?: string | null;
  city?: string;
  country?: string;
  phone?: string | null;
  email?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_iban?: string | null;
  invoice_footer_ar?: string | null;
}
interface Invoice {
  id: string;
  invoice_number: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  company_snapshot: CompanySnapshot | null;
  customer: Customer;
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

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/endur-invoices/${id}`)
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice ?? null));
  }

  useEffect(load, [id]);

  async function action(action: "mark_paid" | "mark_sent" | "cancel") {
    setBusy(true);
    try {
      const res = await fetch(`/api/endur-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.error) toast.error(d.error);
      else {
        toast.success("تم");
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const status = STATUS_INFO[invoice.status];

  return (
    <div style={{ padding: "24px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Action bar (hidden on print) */}
      <div
        className="print-hide"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 12,
        }}
      >
        <button
          onClick={() => router.push("/endur-invoices")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-cairo), var(--font-tajawal)",
          }}
        >
          <ArrowRight size={14} />
          القائمة
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: status.bg,
              color: status.color,
            }}
          >
            {status.label}
          </span>

          {invoice.status === "DRAFT" && (
            <button
              onClick={() => action("mark_sent")}
              disabled={busy}
              style={actionBtn("var(--blue-primary)")}
            >
              <Send size={14} /> تحديد كمُرسلة
            </button>
          )}
          {(invoice.status === "DRAFT" || invoice.status === "SENT" ||
            invoice.status === "OVERDUE") && (
            <button
              onClick={() => action("mark_paid")}
              disabled={busy}
              style={actionBtn("var(--success)")}
            >
              <CheckCircle2 size={14} /> تم الدفع
            </button>
          )}
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => action("cancel")}
              disabled={busy}
              style={actionBtn("var(--danger)")}
            >
              <XCircle size={14} /> إلغاء
            </button>
          )}
          <button
            onClick={() => window.print()}
            style={actionBtn("var(--brand-teal)")}
          >
            <Printer size={14} /> طباعة / PDF
          </button>
        </div>
      </div>

      {/* Invoice template (also printable) */}
      <EndurInvoiceTemplate invoice={invoice} />
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 10,
    border: "none",
    background: color,
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: "var(--font-cairo), var(--font-tajawal)",
  };
}
