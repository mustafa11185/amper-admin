"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Zap,
  UtensilsCrossed,
  Sparkles,
  Box,
  ArrowUpRight,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface Product {
  id: string;
  key: "AMPER" | "RESTOIQ" | "BARQ";
  name_ar: string;
  name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  description_ar: string | null;
  color: string;
  icon: string;
  status: "ACTIVE" | "COMING_SOON" | "MAINTENANCE" | "RETIRED";
  customer_count: number;
  active_count: number;
  mrr: number;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Zap,
  UtensilsCrossed,
  Sparkles,
  Box,
};

function formatIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";
}

const STATUS_LABELS: Record<Product["status"], { ar: string; color: string }> = {
  ACTIVE: { ar: "نشط", color: "#059669" },
  COMING_SOON: { ar: "قريباً", color: "#D97706" },
  MAINTENANCE: { ar: "صيانة", color: "#7C3AED" },
  RETIRED: { ar: "متوقف", color: "#64748B" },
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProducts(data.products);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, color: "var(--danger)" }}>خطأ: {error}</div>
    );
  }

  if (!products) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Loader2
          size={32}
          color="var(--blue-primary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  const totals = products.reduce(
    (acc, p) => ({
      customers: acc.customers + p.customer_count,
      mrr: acc.mrr + p.mrr,
      active_products: acc.active_products + (p.status === "ACTIVE" ? 1 : 0),
    }),
    { customers: 0, mrr: 0, active_products: 0 }
  );

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          منتجات اندر
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-muted)",
          }}
        >
          منصات SaaS الخاصة بشركة اندر التقنية — إدارة موحدة لكل المنتجات
        </p>
      </div>

      {/* Top stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="منتجات نشطة"
          value={`${totals.active_products} / ${products.length}`}
          icon={<Box size={22} color="var(--blue-primary)" />}
        />
        <StatCard
          label="إجمالي العملاء"
          value={totals.customers.toLocaleString("ar-IQ")}
          icon={<Users size={22} color="var(--violet)" />}
        />
        <StatCard
          label="الإيراد الشهري المتكرر (MRR)"
          value={formatIQD(totals.mrr)}
          icon={<TrendingUp size={22} color="var(--success)" />}
        />
      </div>

      {/* Product cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--bg-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = ICONS[product.icon] ?? Box;
  const statusInfo = STATUS_LABELS[product.status];
  const isActive = product.status === "ACTIVE";

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid var(--border)`,
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
        boxShadow: "var(--shadow-sm)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Color bar */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${product.color}, ${product.color}80)`,
        }}
      />

      <div style={{ padding: "22px 24px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `${product.color}1A`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={26} color={product.color} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {product.name_ar}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-rajdhani)",
                  letterSpacing: "0.1em",
                }}
              >
                {product.name_en.toUpperCase()}
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 20,
              background: `${statusInfo.color}1A`,
              color: statusInfo.color,
            }}
          >
            {statusInfo.ar}
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            minHeight: 60,
            marginBottom: 18,
          }}
        >
          {product.description_ar ?? product.tagline_ar ?? ""}
        </p>

        {/* Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 16,
            padding: "14px 16px",
            background: "var(--bg-muted)",
            borderRadius: 12,
          }}
        >
          <Metric label="عملاء" value={product.customer_count.toLocaleString("ar-IQ")} />
          <Metric
            label="MRR"
            value={isActive ? formatIQD(product.mrr) : "—"}
          />
        </div>

        {/* Action */}
        <button
          disabled={!isActive}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 12,
            border: "none",
            background: isActive ? product.color : "var(--bg-muted)",
            color: isActive ? "#FFFFFF" : "var(--text-muted)",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-tajawal)",
            cursor: isActive ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "opacity 0.15s",
          }}
        >
          {isActive ? (
            <>
              عرض التفاصيل
              <ArrowUpRight size={16} />
            </>
          ) : (
            "قريباً"
          )}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
