"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, Loader2, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  key: string;
  name_ar: string;
  color: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
}
interface DraftLine {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { product_id: "", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  // Customer creation modal
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/endur-customers").then((r) => r.json()),
    ]).then(([p, c]) => {
      setProducts(p.products ?? []);
      setCustomers(c.customers ?? []);
    });
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [lines]
  );
  const total = subtotal + taxAmount;

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [
      ...ls,
      { product_id: "", description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function removeLine(idx: number) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, i) => i !== idx)));
  }

  async function createCustomer() {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("الاسم ورقم الهاتف مطلوبين");
      return;
    }
    const res = await fetch("/api/endur-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    const d = await res.json();
    if (d.error) {
      toast.error(d.error);
      return;
    }
    setCustomers((cs) => [d.customer, ...cs]);
    setCustomerId(d.customer.id);
    setShowNewCustomer(false);
    setNewCustomer({ name: "", phone: "", email: "" });
    toast.success("أُضيف العميل");
  }

  async function submit() {
    if (!customerId) {
      toast.error("اختر العميل");
      return;
    }
    if (lines.some((l) => !l.product_id || !l.description || l.unit_price <= 0)) {
      toast.error("اكمل بيانات كل البنود");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/endur-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          due_at: dueAt || undefined,
          tax_amount: taxAmount,
          notes: notes || undefined,
          line_items: lines,
        }),
      });
      const d = await res.json();
      if (d.error) {
        toast.error(d.error);
      } else {
        toast.success(`تم إنشاء الفاتورة ${d.invoice.invoice_number}`);
        router.push(`/endur-invoices/${d.invoice.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        فاتورة جديدة
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        تُصدر باسم شركة اندر للحلول التقنية — رقمها يولد تلقائياً
      </p>

      {/* Customer + Dates */}
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 14,
          }}
        >
          <Field label="العميل">
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={selectStyle}
              >
                <option value="">— اختر العميل —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewCustomer(true)}
                title="عميل جديد"
                style={{
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  cursor: "pointer",
                  color: "var(--brand-teal)",
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </Field>
          <Field label="تاريخ الاستحقاق">
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="ضريبة (د.ع)">
            <input
              type="number"
              min={0}
              value={taxAmount}
              onChange={(e) => setTaxAmount(Number(e.target.value) || 0)}
              style={{ ...inputStyle, fontFamily: "var(--font-jetbrains-mono)" }}
            />
          </Field>
        </div>
      </Card>

      {/* Line items */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2 style={sectionTitle}>بنود الفاتورة</h2>
          <button
            onClick={addLine}
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--brand-teal)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={14} /> بند
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 2.4fr 0.7fr 1fr 1fr 36px",
                gap: 8,
                alignItems: "center",
                padding: 10,
                background: "var(--bg-muted)",
                borderRadius: 10,
              }}
            >
              <select
                value={line.product_id}
                onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                style={selectStyle}
              >
                <option value="">— المنتج —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar}
                  </option>
                ))}
              </select>
              <input
                value={line.description}
                onChange={(e) =>
                  updateLine(idx, { description: e.target.value })
                }
                placeholder="مثلاً: أمبير - باقة Gold (شهر مايو)"
                style={inputStyle}
              />
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) =>
                  updateLine(idx, { quantity: Number(e.target.value) || 1 })
                }
                style={{ ...inputStyle, fontFamily: "var(--font-jetbrains-mono)" }}
              />
              <input
                type="number"
                min={0}
                value={line.unit_price}
                onChange={(e) =>
                  updateLine(idx, { unit_price: Number(e.target.value) || 0 })
                }
                placeholder="السعر"
                style={{ ...inputStyle, fontFamily: "var(--font-jetbrains-mono)" }}
              />
              <div
                style={{
                  textAlign: "right",
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontSize: 13,
                }}
              >
                {formatIQD(line.quantity * line.unit_price)}
              </div>
              <button
                onClick={() => removeLine(idx)}
                disabled={lines.length === 1}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--danger)",
                  cursor: lines.length === 1 ? "not-allowed" : "pointer",
                  opacity: lines.length === 1 ? 0.3 : 1,
                }}
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Notes + Totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <Field label="ملاحظات (اختيارية)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="ملاحظات تظهر على الفاتورة..."
            />
          </Field>
        </Card>
        <Card>
          <Row label="المجموع الفرعي" value={formatIQD(subtotal)} />
          <Row label="الضريبة" value={formatIQD(taxAmount)} />
          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 8,
              paddingTop: 12,
            }}
          >
            <Row label="الإجمالي" value={formatIQD(total)} large />
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 24,
        }}
      >
        <button
          onClick={() => router.push("/endur-invoices")}
          style={cancelBtn}
        >
          إلغاء
        </button>
        <button onClick={submit} disabled={saving} style={primaryBtn}>
          {saving ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Save size={16} />
          )}
          إنشاء الفاتورة
          <ArrowRight size={14} />
        </button>
      </div>

      {/* New customer modal */}
      {showNewCustomer && (
        <Modal onClose={() => setShowNewCustomer(false)}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            عميل جديد
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="اسم العميل / الشركة">
              <input
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, name: e.target.value }))
                }
                style={inputStyle}
              />
            </Field>
            <Field label="رقم الهاتف">
              <input
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, phone: e.target.value }))
                }
                style={{ ...inputStyle, fontFamily: "var(--font-jetbrains-mono)" }}
                dir="ltr"
              />
            </Field>
            <Field label="البريد (اختياري)">
              <input
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, email: e.target.value }))
                }
                style={{ ...inputStyle, fontFamily: "var(--font-jetbrains-mono)" }}
                dir="ltr"
              />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button
                onClick={() => setShowNewCustomer(false)}
                style={cancelBtn}
              >
                إلغاء
              </button>
              <button onClick={createCustomer} style={primaryBtn}>
                إضافة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  fontSize: 14,
  fontFamily: "var(--font-cairo), var(--font-tajawal)",
  outline: "none",
  boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--text-primary)",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 22px",
  borderRadius: 12,
  border: "none",
  background: "var(--brand-teal)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-cairo), var(--font-tajawal)",
};
const cancelBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-surface)",
  color: "var(--text-secondary)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-cairo), var(--font-tajawal)",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
      }}
    >
      <span
        style={{
          fontSize: large ? 15 : 13,
          color: large ? "var(--text-primary)" : "var(--text-muted)",
          fontWeight: large ? 700 : 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: large ? 18 : 14,
          fontWeight: 700,
          color: large ? "var(--brand-teal)" : "var(--text-primary)",
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,27,42,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 420,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
