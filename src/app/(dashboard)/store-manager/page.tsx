"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  X,
  Package,
  ClipboardList,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

/* ── types ────────────────────────────────────────────────────── */

interface Product {
  id: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  price_usd: string | number;
  category: string;
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
  product?: { name_ar: string; name_en?: string | null; price_usd?: string | number };
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

/* ── skeleton ─────────────────────────────────────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--bg-muted)" }}
    />
  );
}

/* ── main page ────────────────────────────────────────────────── */

export default function StoreManagerPage() {
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
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

  /* ── tabs ──────────────────────────────────────────────────── */

  const tabs = [
    { key: "products" as const, label: "المنتجات", icon: <Package size={16} /> },
    { key: "orders" as const, label: "الطلبات", icon: <ClipboardList size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShoppingCart size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              إدارة المتجر
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: "var(--bg-muted)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background:
                  activeTab === tab.key ? "var(--bg-surface)" : "transparent",
                color:
                  activeTab === tab.key
                    ? "var(--blue-primary)"
                    : "var(--text-muted)",
                boxShadow:
                  activeTab === tab.key ? "var(--shadow-sm)" : "none",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════ Products Tab ═══════════ */}
        {activeTab === "products" && (
          <>
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  setEditProduct(null);
                  setShowProductModal(true);
                }}
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

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <p
                className="text-sm py-12 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                لا توجد منتجات
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
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
                        onClick={() => {
                          setEditProduct(product);
                          setShowProductModal(true);
                        }}
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
                          ≈ {Math.round(Number(product.price_usd) * 1300).toLocaleString()} د.ع
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

                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleProductActive(product)}
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
        )}

        {/* ═══════════ Orders Tab ═══════════ */}
        {activeTab === "orders" && (
          <>
            {/* Filter */}
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
                      orderFilter === "" ? "var(--blue-soft)" : "var(--bg-muted)",
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
                          ? (STATUS_COLORS[s]?.bg || "var(--bg-muted)")
                          : "var(--bg-muted)",
                      color:
                        orderFilter === s
                          ? (STATUS_COLORS[s]?.color || "var(--text-muted)")
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
              <div className="overflow-x-auto">
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
                        style={{
                          borderBottom: "1px solid var(--border)",
                        }}
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
                            "ar-IQ"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              const phone = order.phone?.replace(/[^0-9]/g, '') || ''
                              const intl = phone.startsWith('0') ? '964' + phone.slice(1) : phone
                              window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`مرحباً ${order.name} — تم استلام طلبك من متجر أمبير ✅\n\nالمنتج: ${order.product?.name_ar || '---'}\nالحالة: ${STATUS_LABELS[order.status] || order.status}\n\nأمبير ⚡`)}`, '_blank')
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
          </>
        )}
      </section>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editProduct}
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

/* ── Product Modal ────────────────────────────────────────────── */

function ProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!product;
  const [nameAr, setNameAr] = useState(product?.name_ar || "");
  const [nameEn, setNameEn] = useState(product?.name_en || "");
  const [description, setDescription] = useState(product?.description || "");
  const [priceUsd, setPriceUsd] = useState(
    product ? String(product.price_usd) : ""
  );
  const [category, setCategory] = useState(product?.category || "");
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
