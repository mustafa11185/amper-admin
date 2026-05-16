"use client";
export const dynamic = "force-dynamic";

/**
 * 🎯 عملاء اندر — P-CO-1.2 (2026-05-16).
 *
 * Unified cross-product customer hub. Company-level per the Product
 * Isolation Rule (one customer may own Amper + RestoIQ + BARQ), so
 * it is a TOP-LEVEL sidebar entry, not a product-hub section.
 *
 * P-CO-1.2 ships the smart list (KPI strip + filters + table).
 * P-CO-1.3 adds the 360° screen on `?id=<id>`. P-CO-1.5 adds the
 * ذكاء اندر cross-sell opportunities.
 */

import { useEffect, useMemo, useState } from "react";
import { Search, Users, Loader2, AlertCircle, Sparkles } from "lucide-react";
import Customer360 from "./_components/Customer360";

interface ProductRef {
  key: "AMPER" | "RESTOIQ" | "BARQ";
  name_ar: string;
  color: string;
}
interface ProductCustomerLite {
  id: string;
  status: string;
  plan_name: string | null;
  monthly_amount: number | null;
  product: ProductRef;
}
interface Metrics {
  mrr: number;
  ltv: number;
  tenureDays: number;
  productCount: number;
  activeProductCount: number;
  overdueCount: number;
  ownedKeys: string[];
  riskBand: "low" | "medium" | "high";
  riskReasons: string[];
}
interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  governorate: string | null;
  products: ProductCustomerLite[];
  metrics: Metrics;
}
interface Aggregates {
  total: number;
  multiProduct: number;
  totalMrr: number;
  atRisk: number;
}

const RISK_TONE: Record<
  Metrics["riskBand"],
  { bg: string; fg: string; label: string }
> = {
  low: { bg: "#DCFCE7", fg: "#15803D", label: "منخفض" },
  medium: { bg: "#FEF3C7", fg: "#B45309", label: "متوسّط" },
  high: { bg: "#FEE2E2", fg: "#B91C1C", label: "مرتفع" },
};

const PRODUCT_OPTS = [
  { v: "", l: "كل المنتجات" },
  { v: "AMPER", l: "⚡ امبير" },
  { v: "RESTOIQ", l: "🍴 ريستو" },
  { v: "BARQ", l: "براق" },
];
const STATUS_OPTS = [
  { v: "", l: "كل الحالات" },
  { v: "active", l: "نشط" },
  { v: "trial", l: "تجريبي" },
  { v: "paused", l: "متوقّف" },
  { v: "cancelled", l: "ملغى" },
];
const RISK_OPTS = [
  { v: "", l: "كل المخاطر" },
  { v: "low", l: "منخفض" },
  { v: "medium", l: "متوسّط" },
  { v: "high", l: "مرتفع" },
];

function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

export default function EndurCustomersPage() {
  // Deep-link to the 360° view. Read from window.location (not
  // useSearchParams) so the page needs no Suspense boundary —
  // mirrors the endur-invoices pattern. Links are full <a>
  // navigations, so a mount-time read is sufficient.
  //   ?id=<endurCustomerId>          → direct
  //   ?amper_tenant_id=<tenantId>    → resolve (Amper /clients)
  //   ?ref=<extRef>&product=<KEY>    → resolve (any product hub)
  const [view360Id, setView360Id] = useState<string | null>(null);
  const [resolved360, setResolved360] = useState(false);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("id");
    if (id) {
      setView360Id(id);
      setResolved360(true);
      return;
    }
    const amperTenantId = sp.get("amper_tenant_id");
    const ref = sp.get("ref");
    const product = sp.get("product");
    if (!amperTenantId && !(ref && product)) {
      setResolved360(true);
      return;
    }
    const rp = new URLSearchParams();
    if (amperTenantId) rp.set("amper_tenant_id", amperTenantId);
    if (ref && product) {
      rp.set("ref", ref);
      rp.set("product", product);
    }
    fetch(`/api/endur-customers/resolve?${rp.toString()}`)
      .then((r) => r.json())
      .then((d: { id?: string | null }) => {
        if (d.id) setView360Id(d.id);
        else setNotLinked(true);
      })
      .catch(() => setNotLinked(true))
      .finally(() => setResolved360(true));
  }, []);

  if (!resolved360) return null;
  if (view360Id) return <Customer360 id={view360Id} />;
  if (notLinked) return <NotLinkedPanel />;

  return <CustomerList />;
}

function NotLinkedPanel() {
  return (
    <div style={{ padding: "48px 32px", maxWidth: 640, margin: "0 auto" }}>
      <a
        href="/endur-customers"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        ← كل العملاء
      </a>
      <div
        className="rounded-xl"
        style={{
          marginTop: 16,
          background: "var(--bg-surface)",
          border: "1px dashed var(--border)",
          padding: 32,
          textAlign: "center",
        }}
      >
        <Users
          size={30}
          style={{
            display: "block",
            margin: "0 auto 10px",
            opacity: 0.5,
            color: "var(--text-muted)",
          }}
        />
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          هذا العميل غير مربوط بسجلّ اندر موحّد بعد
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 6,
            lineHeight: 1.7,
          }}
        >
          لم يُنشأ بعد سجلّ «عميل اندر» مرتبط بهذا الاشتراك. أنشئه من قائمة
          عملاء اندر لربط المنتجات والفواتير والخطّ الزمني في ملف 360° واحد.
        </p>
      </div>
    </div>
  );
}

function CustomerList() {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [risk, setRisk] = useState("");
  const [multi, setMulti] = useState(false);

  // Governorate options are derived from the unfiltered first load so
  // the dropdown never desyncs from whatever string the data holds.
  const [govOpts, setGovOpts] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (product) params.set("product", product);
      if (status) params.set("status", status);
      if (governorate) params.set("governorate", governorate);
      if (risk) params.set("risk", risk);
      if (multi) params.set("multi", "1");

      fetch(`/api/endur-customers?${params.toString()}`)
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
          setError(null);
          const p = parsed as {
            customers?: CustomerRow[];
            aggregates?: Aggregates;
          } | null;
          const list = p?.customers ?? [];
          setRows(list);
          setAgg(p?.aggregates ?? null);
          setGovOpts((prev) => {
            if (prev.length) return prev;
            return Array.from(
              new Set(
                list
                  .map((c) => c.governorate)
                  .filter((g): g is string => !!g),
              ),
            ).sort();
          });
        })
        .catch((e) =>
          setError(String(e instanceof Error ? e.message : e)),
        )
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, product, status, governorate, risk, multi]);

  const kpis = useMemo(
    () => [
      {
        label: "إجمالي العملاء",
        value: agg ? String(agg.total) : "—",
        tone: "var(--blue-primary)",
      },
      {
        label: "متعدّدو المنتجات",
        value: agg ? String(agg.multiProduct) : "—",
        tone: "var(--violet)",
      },
      {
        label: "MRR الكلّي",
        value: agg ? iqd(agg.totalMrr) : "—",
        tone: "var(--success)",
      },
      {
        label: "معرّضون للخطر",
        value: agg ? String(agg.atRisk) : "—",
        tone: "var(--danger)",
      },
    ],
    [agg],
  );

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
            ENDUR CUSTOMERS
          </span>
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}
          >
            عابر للمنتجات · رؤية موحّدة
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
          🎯 عملاء اندر
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          كل عملاء اندر في مكان واحد عبر امبير وريستو وبراق. تابِع المنتجات
          المملوكة والإيراد الشهري والمخاطر، وافتح ملف العميل 360° لرؤية الفواتير
          والخطّ الزمني وفرص البيع المتقاطع.
        </p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              {k.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-rajdhani)",
                fontSize: 24,
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

      <CrossSellPanel />

      {/* Filter bar */}
      <div
        className="rounded-xl mb-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
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
            placeholder="ابحث باسم العميل، هاتف، أو بريد…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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

        <FilterSelect value={product} onChange={setProduct} opts={PRODUCT_OPTS} />
        <FilterSelect value={status} onChange={setStatus} opts={STATUS_OPTS} />
        <FilterSelect
          value={governorate}
          onChange={setGovernorate}
          opts={[
            { v: "", l: "كل المحافظات" },
            ...govOpts.map((g) => ({ v: g, l: g })),
          ]}
        />
        <FilterSelect value={risk} onChange={setRisk} opts={RISK_OPTS} />

        <button
          onClick={() => setMulti((m) => !m)}
          className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          style={{
            background: multi ? "var(--violet-soft)" : "var(--bg-muted)",
            color: multi ? "var(--violet)" : "var(--text-muted)",
          }}
        >
          متعدّد المنتجات
        </button>
      </div>

      {/* Table */}
      {error ? (
        <ErrorPanel message={error} />
      ) : loading && !rows ? (
        <LoadingPanel />
      ) : (
        <div
          className="rounded-xl overflow-x-auto"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {!rows || rows.length === 0 ? (
            <EmptyState />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-muted)" }}>
                <tr>
                  <Th>العميل</Th>
                  <Th>المحافظة</Th>
                  <Th>المنتجات</Th>
                  <Th>MRR</Th>
                  <Th>LTV</Th>
                  <Th>المخاطر</Th>
                  <Th>أقدميّة</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const tone = RISK_TONE[c.metrics.riskBand];
                  return (
                    <tr
                      key={c.id}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
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
                            dir="ltr"
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-jetbrains-mono)",
                              marginTop: 2,
                              textAlign: "right",
                            }}
                          >
                            {c.phone}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {c.governorate || "—"}
                        </span>
                      </Td>
                      <Td>
                        <div
                          style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        >
                          {c.products.length === 0 ? (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              —
                            </span>
                          ) : (
                            c.products.map((p) => (
                              <span
                                key={p.id}
                                title={`${p.product.name_ar} · ${p.status}`}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  background: p.product.color + "1A",
                                  color: p.product.color,
                                }}
                              >
                                {p.product.name_ar}
                              </span>
                            ))
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "var(--font-rajdhani)",
                            fontWeight: 700,
                          }}
                        >
                          {c.metrics.mrr ? iqd(c.metrics.mrr) : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "var(--font-rajdhani)",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                          }}
                        >
                          {c.metrics.ltv ? iqd(c.metrics.ltv) : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          title={c.metrics.riskReasons.join(" · ")}
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
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-rajdhani)",
                          }}
                        >
                          {c.metrics.tenureDays} يوم
                        </span>
                      </Td>
                      <Td>
                        <a
                          href={`/endur-customers?id=${encodeURIComponent(c.id)}`}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "var(--bg-muted)",
                            color: "var(--text-secondary)",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          ملف 360°
                        </a>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

interface AggOpportunity {
  customerId: string;
  customerName: string;
  governorate: string | null;
  opportunity: {
    product: string;
    productNameAr: string;
    kind: "expand" | "winback";
    confidence: number;
    reasonAr: string;
  };
}

function CrossSellPanel() {
  const [data, setData] = useState<{
    total: number;
    byProduct: Record<string, number>;
    top: AggOpportunity[];
  } | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/api/endur-ai/cross-sell")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, []);

  if (!data || data.total === 0) return null;

  return (
    <div
      className="rounded-xl mb-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{ padding: "14px 16px", background: "transparent", border: "none" }}
      >
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
          ذكاء اندر — فرص البيع المتقاطع
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--violet-soft)",
              color: "var(--violet)",
            }}
          >
            {data.total}
          </span>
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {open ? "إخفاء" : "عرض"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(data.byProduct).map(([k, n]) => (
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
                {k} · {n}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.top.slice(0, 8).map((it, i) => {
              const pct = Math.round(it.opportunity.confidence * 100);
              return (
                <a
                  key={i}
                  href={`/endur-customers?id=${encodeURIComponent(it.customerId)}#crosssell`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-muted)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: "var(--font-rajdhani)",
                      minWidth: 38,
                      color:
                        pct >= 70
                          ? "var(--success)"
                          : pct >= 50
                            ? "var(--warning)"
                            : "var(--text-muted)",
                    }}
                  >
                    {pct}%
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      minWidth: 140,
                    }}
                  >
                    {it.customerName}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      flex: 1,
                    }}
                  >
                    {it.opportunity.kind === "winback" ? "استرجاع" : "توسعة"}{" "}
                    {it.opportunity.productNameAr} — {it.opportunity.reasonAr}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: { v: string; l: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      {opts.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}

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
  return (
    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      <Users
        size={32}
        style={{ display: "block", margin: "0 auto 10px", opacity: 0.5 }}
      />
      <p style={{ fontSize: 14, fontWeight: 600 }}>لا عملاء يطابقون الفلاتر</p>
      <p style={{ fontSize: 12, marginTop: 6 }}>
        جرّب تغيير الفلاتر أو مسح صندوق البحث.
      </p>
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
      <p style={{ fontSize: 14 }}>تعذّر تحميل قائمة العملاء</p>
      <p
        style={{
          fontSize: 12,
          marginTop: 6,
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {message}
      </p>
    </div>
  );
}
