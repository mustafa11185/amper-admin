"use client";
export const dynamic = "force-dynamic";

/**
 * المتجر — P-STORE (2026-05-16).
 *
 * Endur's hardware store. CROSS-PRODUCT by nature: it sells devices
 * for Amper AND Toast/RestoIQ plus shared accessories, so per the
 * Product Isolation Rule (AGENTS.md) it stays a TOP-LEVEL sidebar
 * entry — not nested inside a single product hub. The catalogue is
 * organised into product-line sections via `product_line`
 * ("amper" | "restoiq" | "general").
 *
 * Layout follows the canonical product-hub pattern: single page +
 * scroll-spy + 140px right-side StoreSectionNav. Replaces the old
 * two-tab (المنتجات / الطلبات) screen.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, X, Package, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import StoreSectionNav, { STORE_SECTIONS } from "./_components/StoreSectionNav";

/* ── types ────────────────────────────────────────────────────── */

type ProductLine = "amper" | "restoiq" | "general";

interface Product {
  id: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  price_usd: string | number;
  category: string;
  product_line: string;
  stock: number;
  is_active: boolean;
  sort_order: number;
  discount_pct: string | number | null;
  discount_ends_at: string | null;
  created_at: string;
  _count?: { orders: number };
}

interface Order {
  id: string;
  product_id: string;
  tenant_id: string | null;
  name: string;
  phone: string;
  governorate: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  product?: {
    name_ar: string;
    name_en?: string | null;
    price_usd?: string | number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  shipped: "تم الشحن",
  cancelled: "ملغي",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(217,119,6,0.1)", color: "var(--warning)" },
  processing: { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
  shipped: { bg: "rgba(5,150,105,0.1)", color: "var(--success)" },
  cancelled: { bg: "rgba(220,38,38,0.1)", color: "var(--danger)" },
};

const ORDER_STATUSES = ["pending", "processing", "shipped", "cancelled"];

const LINES: Record<
  ProductLine,
  { label: string; emoji: string; bg: string; fg: string }
> = {
  amper: {
    label: "امبير",
    emoji: "⚡",
    bg: "var(--blue-soft)",
    fg: "var(--blue-primary)",
  },
  restoiq: {
    label: "ريستو",
    emoji: "🍴",
    bg: "var(--violet-soft)",
    fg: "var(--violet)",
  },
  general: {
    label: "عامّة",
    emoji: "📦",
    bg: "var(--bg-muted)",
    fg: "var(--text-muted)",
  },
};

function lineOf(p: Product): ProductLine {
  return p.product_line === "amper" || p.product_line === "restoiq"
    ? p.product_line
    : "general";
}

const LOW_STOCK = 3;

/* ── skeleton ─────────────────────────────────────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--bg-muted)" }}
    />
  );
}

/* ── main hub ─────────────────────────────────────────────────── */

export default function StoreManagerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newLine, setNewLine] = useState<ProductLine>("general");
  const [orderFilter, setOrderFilter] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/store/products");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast.error("فشل في تحميل المنتجات");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const url = orderFilter
        ? `/api/store/orders?status=${orderFilter}`
        : "/api/store/orders";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("فشل في تحميل الطلبات");
    } finally {
      setLoadingOrders(false);
    }
  }, [orderFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function toggleProductActive(product: Product) {
    try {
      const res = await fetch("/api/store/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, is_active: !product.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(product.is_active ? "تم إلغاء التفعيل" : "تم التفعيل");
      fetchProducts();
    } catch {
      toast.error("فشل في تحديث المنتج");
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const res = await fetch("/api/store/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم تحديث حالة الطلب");
      fetchOrders();
    } catch {
      toast.error("فشل في تحديث الطلب");
    }
  }

  function openNew(line: ProductLine) {
    setEditProduct(null);
    setNewLine(line);
    setShowProductModal(true);
  }
  function openEdit(p: Product) {
    setEditProduct(p);
    setShowProductModal(true);
  }

  /* ── derived ─────────────────────────────────────────────────── */

  const byLine = useMemo(() => {
    const g: Record<ProductLine, Product[]> = {
      amper: [],
      restoiq: [],
      general: [],
    };
    for (const p of products) g[lineOf(p)].push(p);
    return g;
  }, [products]);

  const kpis = useMemo(() => {
    const active = products.filter((p) => p.is_active).length;
    const lowStock = products.filter(
      (p) => p.is_active && p.stock <= LOW_STOCK,
    ).length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const pipelineIQD = orders
      .filter((o) => o.status !== "cancelled")
      .reduce(
        (sum, o) => sum + Number(o.product?.price_usd ?? 0) * 1300,
        0,
      );
    return { active, lowStock, pending, pipelineIQD };
  }, [products, orders]);

  const ordersPipeline = useMemo(() => {
    const c: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      cancelled: 0,
    };
    for (const o of orders) if (o.status in c) c[o.status]++;
    return c;
  }, [orders]);

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Hub header */}
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
            ENDUR STORE
          </span>
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}
          >
            عابر للمنتجات · ٥ أقسام
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
          🛒 المتجر — أجهزة اندر
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          متجر عتاد اندر العام. يبيع أجهزة امبير وريستو والملحقات المشتركة من
          مكان واحد. الكتالوج منظّم بأقسام حسب خط المنتج — مرّر للأسفل أو استخدم
          القائمة الجانبيّة للقفز السريع.
        </p>
      </header>

      {/* Two-column grid: side nav + content stream */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <StoreSectionNav />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ═══════ نظرة عامّة ═══════ */}
          <HubSection id="overview" label={STORE_SECTIONS[0].label}>
            {loadingProducts || loadingOrders ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="إجمالي المنتجات"
                    value={products.length}
                    tone="var(--blue-primary)"
                  />
                  <KpiCard
                    label="منتجات نشطة"
                    value={kpis.active}
                    tone="var(--success)"
                  />
                  <KpiCard
                    label={`مخزون منخفض (≤${LOW_STOCK})`}
                    value={kpis.lowStock}
                    tone={
                      kpis.lowStock > 0 ? "var(--danger)" : "var(--text-muted)"
                    }
                  />
                  <KpiCard
                    label="طلبات قيد الانتظار"
                    value={kpis.pending}
                    tone="var(--warning)"
                  />
                </div>

                {/* per-line breakdown */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p
                    className="text-xs font-bold mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    الكتالوج حسب خط المنتج
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(
                      Object.keys(LINES) as ProductLine[]
                    ).map((k) => (
                      <div
                        key={k}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: LINES[k].bg }}
                      >
                        <span>{LINES[k].emoji}</span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: LINES[k].fg }}
                        >
                          {LINES[k].label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-rajdhani)",
                            fontWeight: 700,
                            color: LINES[k].fg,
                          }}
                        >
                          {byLine[k].length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* orders pipeline + revenue estimate */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-xs font-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      مسار الطلبات
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      إيراد تقديري (غير الملغاة):{" "}
                      <span
                        style={{
                          fontFamily: "var(--font-rajdhani)",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {Math.round(kpis.pipelineIQD).toLocaleString()} د.ع
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ORDER_STATUSES.map((s) => (
                      <div
                        key={s}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{
                          background:
                            STATUS_COLORS[s]?.bg || "var(--bg-muted)",
                        }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              STATUS_COLORS[s]?.color || "var(--text-muted)",
                          }}
                        >
                          {STATUS_LABELS[s]}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-rajdhani)",
                            fontWeight: 700,
                            color:
                              STATUS_COLORS[s]?.color || "var(--text-muted)",
                          }}
                        >
                          {ordersPipeline[s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </HubSection>

          {/* ═══════ أجهزة امبير / ريستو / عامّة ═══════ */}
          {(["amper", "restoiq", "general"] as ProductLine[]).map(
            (line, idx) => (
              <HubSection
                key={line}
                id={STORE_SECTIONS[idx + 1].id}
                label={STORE_SECTIONS[idx + 1].label}
              >
                <ProductLineBlock
                  line={line}
                  loading={loadingProducts}
                  items={byLine[line]}
                  onAdd={() => openNew(line)}
                  onEdit={openEdit}
                  onToggle={toggleProductActive}
                />
              </HubSection>
            ),
          )}

          {/* ═══════ الطلبات ═══════ */}
          <HubSection id="orders" label={STORE_SECTIONS[4].label} last>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                فلترة:
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setOrderFilter("")}
                  className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    background:
                      orderFilter === ""
                        ? "var(--blue-soft)"
                        : "var(--bg-muted)",
                    color:
                      orderFilter === ""
                        ? "var(--blue-primary)"
                        : "var(--text-muted)",
                  }}
                >
                  الكل
                </button>
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    style={{
                      background:
                        orderFilter === s
                          ? STATUS_COLORS[s]?.bg || "var(--bg-muted)"
                          : "var(--bg-muted)",
                      color:
                        orderFilter === s
                          ? STATUS_COLORS[s]?.color || "var(--text-muted)"
                          : "var(--text-muted)",
                    }}
                  >
                    {STATUS_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </div>

            {loadingOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <p
                className="text-sm py-12 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                لا توجد طلبات
              </p>
            ) : (
              <div
                className="rounded-xl overflow-x-auto"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {[
                        "المنتج",
                        "الاسم",
                        "الهاتف",
                        "المحافظة",
                        "الحالة",
                        "التاريخ",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-right py-3 px-3 font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          className="py-3 px-3 font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {order.product?.name_ar || "---"}
                        </td>
                        <td
                          className="py-3 px-3"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {order.name}
                        </td>
                        <td
                          className="py-3 px-3"
                          dir="ltr"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono)",
                            color: "var(--text-secondary)",
                            fontSize: 12,
                          }}
                        >
                          {order.phone}
                        </td>
                        <td
                          className="py-3 px-3"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {order.governorate || "---"}
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                            className="px-2 py-1 rounded-lg text-xs font-medium outline-none cursor-pointer"
                            style={{
                              background:
                                STATUS_COLORS[order.status]?.bg ||
                                "var(--bg-muted)",
                              color:
                                STATUS_COLORS[order.status]?.color ||
                                "var(--text-muted)",
                              border: "none",
                            }}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          className="py-3 px-3"
                          style={{
                            fontFamily: "var(--font-rajdhani)",
                            color: "var(--text-muted)",
                            fontSize: 13,
                          }}
                        >
                          {new Date(order.created_at).toLocaleDateString(
                            "ar-IQ",
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              const phone =
                                order.phone?.replace(/[^0-9]/g, "") || "";
                              const intl = phone.startsWith("0")
                                ? "964" + phone.slice(1)
                                : phone;
                              window.open(
                                `https://wa.me/${intl}?text=${encodeURIComponent(
                                  `مرحباً ${order.name} — تم استلام طلبك من متجر اندر ✅\n\nالمنتج: ${order.product?.name_ar || "---"}\nالحالة: ${STATUS_LABELS[order.status] || order.status}\n\nENDURTECH`,
                                )}`,
                                "_blank",
                              );
                            }}
                            className="text-[10px] px-2 py-1 rounded-lg cursor-pointer transition-colors"
                            style={{ background: "#ECFDF5", color: "#059669" }}
                            title="واتساب"
                          >
                            📱
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HubSection>
        </div>
      </div>

      {showProductModal && (
        <ProductModal
          product={editProduct}
          defaultLine={newLine}
          onClose={() => {
            setShowProductModal(false);
            setEditProduct(null);
          }}
          onSuccess={() => {
            setShowProductModal(false);
            setEditProduct(null);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

/* ── section shell ────────────────────────────────────────────── */

function HubSection({
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

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
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
          fontSize: 28,
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

/* ── product-line block ───────────────────────────────────────── */

function ProductLineBlock({
  line,
  loading,
  items,
  onAdd,
  onEdit,
  onToggle,
}: {
  line: ProductLine;
  loading: boolean;
  items: Product[];
  onAdd: () => void;
  onEdit: (p: Product) => void;
  onToggle: (p: Product) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold"
          style={{ background: LINES[line].bg, color: LINES[line].fg }}
        >
          <span>{LINES[line].emoji}</span>
          {items.length} منتج
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer"
          style={{
            background:
              "linear-gradient(135deg, var(--blue-primary), var(--violet))",
          }}
        >
          <Plus size={16} />
          منتج جديد
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl py-12 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <Package
            size={28}
            style={{
              display: "block",
              margin: "0 auto 8px",
              opacity: 0.4,
              color: "var(--text-muted)",
            }}
          />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            لا توجد منتجات في «{LINES[line].label}» بعد
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((product) => (
            <div
              key={product.id}
              className="rounded-xl p-4 transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {product.name_ar}
                  </h3>
                  {product.name_en && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {product.name_en}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onEdit(product)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div>
                  <span
                    className="text-xl font-bold"
                    style={{
                      fontFamily: "var(--font-rajdhani)",
                      color: "var(--blue-primary)",
                    }}
                  >
                    ${Number(product.price_usd).toFixed(2)}
                  </span>
                  <span
                    className="block text-xs mt-0.5"
                    style={{
                      fontFamily: "var(--font-rajdhani)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ≈{" "}
                    {Math.round(
                      Number(product.price_usd) * 1300,
                    ).toLocaleString()}{" "}
                    د.ع
                  </span>
                </div>
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-xs"
                  style={{
                    background: "var(--violet-soft)",
                    color: "var(--violet)",
                  }}
                >
                  {product.category}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    المخزون:{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-rajdhani)",
                        fontWeight: 600,
                        color:
                          product.stock > 0
                            ? "var(--text-primary)"
                            : "var(--danger)",
                      }}
                    >
                      {product.stock}
                    </span>
                  </span>
                  {product._count && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      طلبات: {product._count.orders}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onToggle(product)}
                  className="relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer"
                  style={{
                    background: product.is_active
                      ? "var(--success)"
                      : "var(--border)",
                  }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                    style={{
                      transform: product.is_active
                        ? "translateX(1px) translateY(2px)"
                        : "translateX(17px) translateY(2px)",
                    }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Product Modal ────────────────────────────────────────────── */

function ProductModal({
  product,
  defaultLine,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  defaultLine: ProductLine;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!product;
  const [nameAr, setNameAr] = useState(product?.name_ar || "");
  const [nameEn, setNameEn] = useState(product?.name_en || "");
  const [description, setDescription] = useState(product?.description || "");
  const [priceUsd, setPriceUsd] = useState(
    product ? String(product.price_usd) : "",
  );
  const [category, setCategory] = useState(product?.category || "");
  const [productLine, setProductLine] = useState<ProductLine>(
    product
      ? product.product_line === "amper" || product.product_line === "restoiq"
        ? product.product_line
        : "general"
      : defaultLine,
  );
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameAr || !priceUsd || !category) {
      toast.error("الاسم والسعر والتصنيف مطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        name_ar: nameAr,
        name_en: nameEn || null,
        description: description || null,
        price_usd: parseFloat(priceUsd),
        category,
        product_line: productLine,
        stock: parseInt(stock) || 0,
        is_active: isActive,
      };

      if (isEdit) {
        body.id = product!.id;
      }

      const res = await fetch("/api/store/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }

      toast.success(isEdit ? "تم تحديث المنتج" : "تمت إضافة المنتج");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "فشل في حفظ المنتج");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {isEdit ? "تعديل المنتج" : "منتج جديد"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              الاسم (عربي)
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              الاسم (إنجليزي)
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              dir="ltr"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* خط المنتج — P-STORE */}
          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              خط المنتج
            </label>
            <div className="flex gap-2">
              {(Object.keys(LINES) as ProductLine[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setProductLine(k)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                  style={{
                    background:
                      productLine === k ? LINES[k].bg : "var(--bg-elevated)",
                    color:
                      productLine === k ? LINES[k].fg : "var(--text-muted)",
                    border:
                      productLine === k
                        ? `1px solid ${LINES[k].fg}`
                        : "1px solid var(--border)",
                  }}
                >
                  <span>{LINES[k].emoji}</span>
                  {LINES[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                السعر (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-rajdhani)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                المخزون
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-rajdhani)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              التصنيف
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="أجهزة، ملحقات، ..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              نشط
            </label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer"
              style={{
                background: isActive ? "var(--success)" : "var(--border)",
              }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{
                  transform: isActive
                    ? "translateX(1px) translateY(2px)"
                    : "translateX(17px) translateY(2px)",
                }}
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--blue-primary), var(--violet))",
            }}
          >
            {submitting
              ? "جاري الحفظ..."
              : isEdit
                ? "تحديث المنتج"
                : "إضافة المنتج"}
          </button>
        </form>
      </div>
    </div>
  );
}
