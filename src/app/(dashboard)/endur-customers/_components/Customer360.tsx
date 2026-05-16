"use client";

/**
 * Customer360 — P-CO-1.3 (2026-05-16).
 *
 * Full-view 360° screen for one Endur customer, rendered by the
 * عملاء اندر page when `?id=<id>` is present. Single-page +
 * scroll-spy, mirroring the canonical product-hub side-nav spec.
 *
 * Per the Product Isolation Rule, every owned-product card links
 * INTO that product's hub pre-filtered to this customer (P-CO-1.4
 * adds the reverse links from the hubs back here). The cross-sell
 * section is an honest placeholder until P-CO-1.5 wires ذكاء اندر.
 */
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Package,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { useScrollSpy } from "./useScrollSpy";

type ProductKey = "AMPER" | "RESTOIQ" | "BARQ";

interface ProductCustomer {
  id: string;
  external_ref: string;
  billing_type: "RECURRING" | "ENGAGEMENT";
  plan_name: string | null;
  monthly_amount: number | null;
  status: string;
  started_at: string;
  ends_at: string | null;
  product: {
    key: ProductKey;
    name_ar: string;
    name_en: string | null;
    color: string;
  };
}
interface InvoiceLine {
  description: string;
  total: number;
  product: { key: ProductKey; name_ar: string };
}
interface Invoice {
  id: string;
  invoice_number: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_items: InvoiceLine[];
}
interface Metrics {
  mrr: number;
  ltv: number;
  tenureDays: number;
  productCount: number;
  activeProductCount: number;
  overdueCount: number;
  riskBand: "low" | "medium" | "high";
  riskReasons: string[];
}
interface TimelineItem {
  at: string;
  kind: "product" | "invoice" | "subscription";
  title: string;
  meta?: string;
}
interface Payload {
  customer: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string;
    email: string | null;
    governorate: string | null;
    address: string | null;
    notes: string | null;
    amper_tenant_id: string | null;
    created_at: string;
    products: ProductCustomer[];
    invoices: Invoice[];
  };
  metrics: Metrics;
  timeline: TimelineItem[];
}

// Mirrors PRODUCT_ROUTE in endur-invoices/page.tsx (P-RULE). The
// product badge deep-links into the product's hub, pre-filtered to
// this customer via ?customer=<external_ref>.
const PRODUCT_ROUTE: Record<ProductKey, { base: string; anchor: string }> = {
  AMPER: { base: "/products/amper", anchor: "clients" },
  RESTOIQ: { base: "/products/restoiq", anchor: "customers" },
  BARQ: { base: "/products/barq", anchor: "" },
};
function productHref(key: ProductKey, externalRef: string): string {
  const r = PRODUCT_ROUTE[key];
  const qs = `?customer=${encodeURIComponent(externalRef)}`;
  return r.anchor ? `${r.base}${qs}#${r.anchor}` : `${r.base}${qs}`;
}

const RISK_TONE: Record<
  Metrics["riskBand"],
  { bg: string; fg: string; label: string }
> = {
  low: { bg: "#DCFCE7", fg: "#15803D", label: "مخاطر منخفضة" },
  medium: { bg: "#FEF3C7", fg: "#B45309", label: "مخاطر متوسّطة" },
  high: { bg: "#FEE2E2", fg: "#B91C1C", label: "مخاطر مرتفعة" },
};
const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  trial: "تجريبي",
  paused: "متوقّف",
  cancelled: "ملغى",
};
const INV_TONE: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "#DCFCE7", fg: "#15803D" },
  SENT: { bg: "var(--blue-soft)", fg: "var(--blue-primary)" },
  DRAFT: { bg: "var(--bg-muted)", fg: "var(--text-muted)" },
  OVERDUE: { bg: "#FEE2E2", fg: "#B91C1C" },
  CANCELLED: { bg: "var(--bg-muted)", fg: "var(--text-muted)" },
};

const SECTIONS = [
  { id: "summary", label: "الملخّص" },
  { id: "products", label: "المنتجات المملوكة" },
  { id: "invoices", label: "الفواتير والمدفوعات" },
  { id: "timeline", label: "الخطّ الزمني" },
  { id: "crosssell", label: "فرص البيع المتقاطع" },
];

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}
function dateAr(d: string): string {
  return new Date(d).toLocaleDateString("ar-IQ");
}
function daysOverdue(inv: Invoice): number | null {
  if (inv.status === "PAID" || inv.status === "CANCELLED") return null;
  if (!inv.due_at) return null;
  const diff = Date.now() - new Date(inv.due_at).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : null;
}

export default function Customer360({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/endur-customers/${encodeURIComponent(id)}`)
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
          const p = parsed as { error?: string } | null;
          setError(p?.error ?? `HTTP ${r.status}`);
          return;
        }
        setData(parsed as Payload);
      })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto" }}>
        <BackLink />
        <div
          style={{
            marginTop: 16,
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
          <p style={{ fontSize: 14 }}>تعذّر تحميل ملف العميل</p>
          <p
            style={{
              fontSize: 12,
              marginTop: 6,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Loader2
          size={32}
          color="var(--blue-primary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  const { customer: c, metrics: m, timeline } = data;
  const tone = RISK_TONE[m.riskBand];

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1400, margin: "0 auto" }}>
      <BackLink />

      <header style={{ margin: "16px 0 24px" }}>
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
            ENDUR 360
          </span>
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
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {c.name}
        </h1>
        <p
          dir="ltr"
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            fontFamily: "var(--font-jetbrains-mono)",
            textAlign: "right",
          }}
        >
          {c.phone}
          {c.email ? ` · ${c.email}` : ""}
        </p>
      </header>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <SideNav />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── الملخّص ── */}
          <Section id="summary" label={SECTIONS[0].label}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Tile label="MRR" value={m.mrr ? iqd(m.mrr) : "—"} tone="var(--success)" />
              <Tile label="LTV" value={m.ltv ? iqd(m.ltv) : "—"} tone="var(--blue-primary)" />
              <Tile
                label="المنتجات"
                value={`${m.activeProductCount}/${m.productCount}`}
                tone="var(--violet)"
              />
              <Tile
                label="الأقدميّة"
                value={`${m.tenureDays} يوم`}
                tone="var(--text-primary)"
              />
            </div>
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="جهة الاتصال" value={c.contact_name} />
                <Field label="المحافظة" value={c.governorate} />
                <Field label="العنوان" value={c.address} />
                <Field
                  label="ربط امبير"
                  value={c.amper_tenant_id ? "مرتبط" : "غير مرتبط"}
                />
                <Field label="ملاحظات" value={c.notes} />
              </div>
              {m.riskReasons.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: tone.bg,
                    color: tone.fg,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⚠ {m.riskReasons.join(" · ")}
                </div>
              )}
            </div>
          </Section>

          {/* ── المنتجات المملوكة ── */}
          <Section id="products" label={SECTIONS[1].label}>
            {c.products.length === 0 ? (
              <EmptyCard icon={<Package size={26} />} text="لا منتجات مملوكة" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {c.products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl p-4"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderTop: `3px solid ${p.product.color}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: p.product.color,
                        }}
                      >
                        {p.product.name_ar}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: "var(--bg-muted)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Field label="الباقة" value={p.plan_name} small />
                      <Field
                        label="الشهري"
                        value={
                          p.monthly_amount ? iqd(p.monthly_amount) : "—"
                        }
                        small
                      />
                      <Field
                        label="نوع الفوترة"
                        value={
                          p.billing_type === "RECURRING"
                            ? "اشتراك شهري"
                            : "حسب الحملة"
                        }
                        small
                      />
                      <Field
                        label="منذ"
                        value={dateAr(p.started_at)}
                        small
                      />
                    </div>
                    <a
                      href={productHref(p.product.key, p.external_ref)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: p.product.color + "1A",
                        color: p.product.color,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      افتح في هَبّة {p.product.name_ar}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── الفواتير والمدفوعات ── */}
          <Section id="invoices" label={SECTIONS[2].label}>
            <div className="flex justify-end mb-3">
              <a
                href={`/endur-invoices?customer_id=${encodeURIComponent(c.id)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <FileText size={14} />
                فاتورة جديدة / كل الفواتير
              </a>
            </div>
            {c.invoices.length === 0 ? (
              <EmptyCard
                icon={<FileText size={26} />}
                text="لا فواتير صادرة"
              />
            ) : (
              <div
                className="rounded-xl overflow-x-auto"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "var(--bg-muted)" }}>
                    <tr>
                      <Th>الفاتورة</Th>
                      <Th>صدرت</Th>
                      <Th>المبلغ</Th>
                      <Th>الحالة</Th>
                      <Th>التأخّر</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.invoices.map((inv) => {
                      const it = INV_TONE[inv.status] ?? INV_TONE.DRAFT;
                      const od = daysOverdue(inv);
                      return (
                        <tr
                          key={inv.id}
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <Td>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: "var(--font-jetbrains-mono)",
                              }}
                            >
                              {inv.invoice_number}
                            </span>
                          </Td>
                          <Td>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              {dateAr(inv.issued_at)}
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
                              {iqd(inv.total)}
                            </span>
                          </Td>
                          <Td>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: it.bg,
                                color: it.fg,
                              }}
                            >
                              {inv.status}
                            </span>
                          </Td>
                          <Td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: od ? "#B91C1C" : "var(--text-muted)",
                              }}
                            >
                              {od ? `${od} يوم` : "—"}
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

          {/* ── الخطّ الزمني ── */}
          <Section id="timeline" label={SECTIONS[3].label}>
            {timeline.length === 0 ? (
              <EmptyCard icon={<Clock size={26} />} text="لا أحداث" />
            ) : (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {timeline.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      paddingBottom: i === timeline.length - 1 ? 0 : 14,
                      marginBottom: i === timeline.length - 1 ? 0 : 14,
                      borderBottom:
                        i === timeline.length - 1
                          ? "none"
                          : "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        lineHeight: "20px",
                      }}
                    >
                      {t.kind === "invoice"
                        ? "🧾"
                        : t.kind === "product"
                          ? "📦"
                          : "🔁"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {t.title}
                      </p>
                      {t.meta && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {t.meta}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-rajdhani)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dateAr(t.at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── فرص البيع المتقاطع — ذكاء اندر (P-CO-1.5) ── */}
          <Section id="crosssell" label={SECTIONS[4].label} last>
            <CrossSell customerId={c.id} phone={c.phone} />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ── sub-components ───────────────────────────────────────────── */

interface Opportunity {
  product: ProductKey;
  productNameAr: string;
  kind: "expand" | "winback";
  confidence: number;
  reasonAr: string;
  scriptAr: string;
}

function waHref(phone: string, text: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const intl = digits.startsWith("0") ? "964" + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

function CrossSell({
  customerId,
  phone,
}: {
  customerId: string;
  phone: string;
}) {
  const [ops, setOps] = useState<Opportunity[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `/api/endur-ai/cross-sell?customer_id=${encodeURIComponent(customerId)}`,
    )
      .then((r) => r.json())
      .then((d: { opportunities?: Opportunity[]; error?: string }) => {
        if (d.error) setErr(d.error);
        else setOps(d.opportunities ?? []);
      })
      .catch((e) => setErr(String(e instanceof Error ? e.message : e)));
  }, [customerId]);

  if (err) {
    return <EmptyCard icon={<Sparkles size={26} />} text={err} />;
  }
  if (!ops) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Loader2
          size={24}
          color="var(--blue-primary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }
  if (ops.length === 0) {
    return (
      <EmptyCard
        icon={<Sparkles size={26} />}
        text="لا فرص بيع متقاطع مقترحة لهذا العميل حاليّاً"
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
        توصيات «ذكاء اندر» — مرتّبة حسب درجة الثقة
      </p>
      {ops.map((o, i) => {
        const pct = Math.round(o.confidence * 100);
        return (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {o.kind === "winback" ? "استرجاع" : "توسعة"} ·{" "}
                {o.productNameAr}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: "var(--font-rajdhani)",
                  color:
                    pct >= 70
                      ? "var(--success)"
                      : pct >= 50
                        ? "var(--warning)"
                        : "var(--text-muted)",
                }}
              >
                ثقة {pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "var(--bg-muted)",
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background:
                    pct >= 70
                      ? "var(--success)"
                      : pct >= 50
                        ? "var(--warning)"
                        : "var(--text-muted)",
                }}
              />
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                marginBottom: 10,
              }}
            >
              {o.reasonAr}
            </p>
            <div
              style={{
                background: "var(--bg-muted)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                marginBottom: 10,
              }}
            >
              {o.scriptAr}
            </div>
            <a
              href={waHref(phone, o.scriptAr)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                background: "#ECFDF5",
                color: "#059669",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              📱 إرسال عبر واتساب
            </a>
          </div>
        );
      })}
    </div>
  );
}

function BackLink() {
  return (
    <a
      href="/endur-customers"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-muted)",
        textDecoration: "none",
      }}
    >
      <ArrowRight size={15} />
      كل العملاء
    </a>
  );
}

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

function Tile({
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

function Field({
  label,
  value,
  small,
}: {
  label: string;
  value: string | null | undefined;
  small?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: small ? 10 : 11,
          color: "var(--text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: small ? 12 : 13,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyCard({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      className="rounded-xl py-10 text-center"
      style={{
        background: "var(--bg-surface)",
        border: "1px dashed var(--border)",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ opacity: 0.5, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
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
