/**
 * Printable Endur invoice template — branded with ENDURTECH wordmark + hex E•
 * mark, legal company info from snapshot, line items grouped by product.
 *
 * Designed for both screen viewing and print/PDF export. Uses print:* media
 * queries via inline styles where needed; key rule is `print-hide` class
 * (defined via globals.css convention) on action buttons.
 */
import { EndurIcon } from "./EndurLogo";
import { COMPANY_NAME_AR } from "./EndurLogo";

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
  website?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_iban?: string | null;
  invoice_footer_ar?: string | null;
}
interface Customer {
  name: string;
  phone: string;
  email: string | null;
  governorate: string | null;
  address: string | null;
}
interface Line {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product: { name_ar: string; color: string };
}
interface Invoice {
  invoice_number: string;
  status: string;
  issued_at: string;
  due_at: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  company_snapshot: CompanySnapshot | null;
  customer: Customer;
  line_items: Line[];
}

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EndurInvoiceTemplate({ invoice }: { invoice: Invoice }) {
  const c = invoice.company_snapshot ?? {};
  const companyName = c.name_ar || COMPANY_NAME_AR;
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div
      className="invoice-sheet"
      style={{
        background: "#fff",
        color: "#0D1B2A",
        borderRadius: 16,
        boxShadow: "var(--shadow-md)",
        padding: "40px 44px",
        fontFamily: "var(--font-cairo), var(--font-tajawal), sans-serif",
        position: "relative",
        overflow: "hidden",
        direction: "rtl",
      }}
    >
      {/* Top brand bar */}
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg, #00B4A6 0%, #4DD8CC 100%)",
          margin: "-40px -44px 28px",
        }}
      />

      {/* Watermark for cancelled/paid */}
      {(isPaid || isCancelled) && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "50%",
            transform: "translate(50%, -50%) rotate(-18deg)",
            fontSize: 120,
            fontWeight: 900,
            fontFamily: "var(--font-outfit), sans-serif",
            color: isPaid ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)",
            pointerEvents: "none",
            letterSpacing: "-0.05em",
          }}
        >
          {isPaid ? "PAID" : "CANCELLED"}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        {/* Right side: company */}
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 4,
              color: "#0D1B2A",
            }}
          >
            {companyName}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 11,
              color: "#00B4A6",
              fontWeight: 600,
              letterSpacing: "0.18em",
              marginBottom: 14,
            }}
          >
            ENDUR<span style={{ color: "#00B4A6" }}>TECH</span> · SOLUTIONS · IRAQ
          </p>
          <CompanyInfoLine label="رقم التسجيل" value={c.registration_no} mono />
          <CompanyInfoLine label="الرقم الضريبي" value={c.tax_id} mono />
          <CompanyInfoLine
            label="العنوان"
            value={
              c.address_ar
                ? `${c.address_ar}${c.city ? "، " + c.city : ""}`
                : c.city ?? null
            }
          />
          <CompanyInfoLine label="هاتف" value={c.phone} mono />
          <CompanyInfoLine label="بريد" value={c.email} mono />
        </div>

        {/* Left side: ENDURTECH mark + invoice meta */}
        <div style={{ textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <EndurIcon size={64} variant="light" />
          </div>
          <p
            style={{
              fontSize: 10,
              color: "#64748B",
              letterSpacing: "0.18em",
              fontFamily: "var(--font-outfit), sans-serif",
              marginBottom: 4,
            }}
          >
            INVOICE / فاتورة
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#00B4A6",
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "-0.5px",
              marginBottom: 12,
            }}
          >
            {invoice.invoice_number}
          </p>
          <MetaLine label="تاريخ الإصدار" value={formatDate(invoice.issued_at)} />
          <MetaLine label="تاريخ الاستحقاق" value={formatDate(invoice.due_at)} />
        </div>
      </div>

      {/* Billed to */}
      <div
        style={{
          background: "#F8FAFF",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
          borderRight: "3px solid #00B4A6",
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: "#64748B",
            letterSpacing: "0.18em",
            marginBottom: 6,
            fontFamily: "var(--font-outfit), sans-serif",
          }}
        >
          BILLED TO / فاتورة إلى
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0D1B2A", marginBottom: 4 }}>
          {invoice.customer.name}
        </h3>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
          {invoice.customer.phone && (
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              📞 {invoice.customer.phone}
            </span>
          )}
          {invoice.customer.email && (
            <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
              ✉️ {invoice.customer.email}
            </span>
          )}
          {invoice.customer.governorate && <span>📍 {invoice.customer.governorate}</span>}
        </div>
      </div>

      {/* Line items */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 18,
        }}
      >
        <thead>
          <tr style={{ background: "#0D1B2A", color: "#F0F4F8" }}>
            <Th width="38%">البند</Th>
            <Th width="18%">المنتج</Th>
            <Th width="10%" align="center">الكمية</Th>
            <Th width="17%" align="right">سعر الوحدة</Th>
            <Th width="17%" align="right">الإجمالي</Th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((line) => (
            <tr
              key={line.id}
              style={{ borderBottom: "1px solid #E5E9F0" }}
            >
              <Td>{line.description}</Td>
              <Td>
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: `${line.product.color}1A`,
                    color: line.product.color,
                    fontWeight: 700,
                  }}
                >
                  {line.product.name_ar}
                </span>
              </Td>
              <Td align="center">
                <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  {line.quantity}
                </span>
              </Td>
              <Td align="right" mono>{formatIQD(line.unit_price)}</Td>
              <Td align="right" mono bold>{formatIQD(line.total)}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ minWidth: 280 }}>
          <TotalRow label="المجموع الفرعي" value={formatIQD(invoice.subtotal)} />
          {invoice.tax_amount > 0 && (
            <TotalRow label="الضريبة" value={formatIQD(invoice.tax_amount)} />
          )}
          <div
            style={{
              borderTop: "2px solid #0D1B2A",
              borderBottom: "2px solid #0D1B2A",
              padding: "10px 0",
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0D1B2A" }}>
              الإجمالي
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#00B4A6",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              {formatIQD(invoice.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes + Bank */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: invoice.notes ? "1fr 1fr" : "1fr",
          gap: 18,
          marginBottom: 22,
        }}
      >
        {invoice.notes && (
          <InfoBox title="ملاحظات">
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {invoice.notes}
            </p>
          </InfoBox>
        )}
        {(c.bank_name || c.bank_account_no || c.bank_iban) && (
          <InfoBox title="معلومات الدفع البنكي">
            {c.bank_name && (
              <p style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                <strong style={{ color: "#0D1B2A" }}>البنك:</strong> {c.bank_name}
              </p>
            )}
            {c.bank_account_no && (
              <p
                style={{
                  fontSize: 12,
                  color: "#475569",
                  marginBottom: 4,
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                <strong style={{ color: "#0D1B2A" }}>الحساب:</strong> {c.bank_account_no}
              </p>
            )}
            {c.bank_iban && (
              <p
                style={{
                  fontSize: 12,
                  color: "#475569",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                <strong style={{ color: "#0D1B2A" }}>IBAN:</strong> {c.bank_iban}
              </p>
            )}
          </InfoBox>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #E5E9F0",
          paddingTop: 16,
          textAlign: "center",
        }}
      >
        {c.invoice_footer_ar && (
          <p
            style={{
              fontSize: 11,
              color: "#64748B",
              marginBottom: 8,
              lineHeight: 1.6,
            }}
          >
            {c.invoice_footer_ar}
          </p>
        )}
        <p
          style={{
            fontSize: 9,
            color: "#94A3B8",
            fontFamily: "var(--font-outfit), sans-serif",
            letterSpacing: "0.18em",
          }}
        >
          BUILD TO LAST · تحمّل · تطوّر · استمر
        </p>
      </div>

      {/* Print rules */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .print-hide { display: none !important; }
          aside { display: none !important; }
          .invoice-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 30px 35px !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Helper components ─────────────────────────────────

function CompanyInfoLine({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <p style={{ fontSize: 11, color: "#475569", marginBottom: 3, lineHeight: 1.6 }}>
      <span style={{ color: "#94A3B8" }}>{label}: </span>
      <span style={mono ? { fontFamily: "var(--font-jetbrains-mono)" } : undefined}>
        {value}
      </span>
    </p>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontSize: 11, color: "#64748B", marginBottom: 3 }}>
      <span style={{ color: "#94A3B8" }}>{label}: </span>
      <span style={{ color: "#0D1B2A", fontWeight: 600 }}>{value}</span>
    </p>
  );
}

function Th({
  children,
  width,
  align = "right",
}: {
  children: React.ReactNode;
  width?: string;
  align?: "right" | "left" | "center";
}) {
  return (
    <th
      style={{
        padding: "10px 14px",
        fontSize: 11,
        fontWeight: 700,
        textAlign: align,
        width,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "right",
  mono,
  bold,
}: {
  children: React.ReactNode;
  align?: "right" | "left" | "center";
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <td
      style={{
        padding: "12px 14px",
        fontSize: 12,
        color: "#0D1B2A",
        textAlign: align,
        fontFamily: mono ? "var(--font-jetbrains-mono)" : undefined,
        fontWeight: bold ? 700 : 400,
      }}
    >
      {children}
    </td>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        fontSize: 12,
        color: "#475569",
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#F8FAFF",
        borderRadius: 10,
        padding: "12px 16px",
        border: "1px solid #E5E9F0",
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: "#64748B",
          letterSpacing: "0.18em",
          marginBottom: 8,
          fontFamily: "var(--font-outfit), sans-serif",
        }}
      >
        {title.toUpperCase()}
      </p>
      {children}
    </div>
  );
}
