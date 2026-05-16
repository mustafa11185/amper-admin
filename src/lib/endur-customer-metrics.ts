/**
 * Endur customer derived metrics — P-CO-1.1 (2026-05-16).
 *
 * Pure functions shared by the عملاء اندر list, the 360 screen, and
 * the ذكاء اندر cross-sell engine so MRR / LTV / risk are computed
 * identically everywhere. No DB access here — callers pass the
 * already-loaded relations.
 */
import type { ProductKey } from "@prisma/client";

export interface PcLite {
  status: string; // active | trial | paused | cancelled
  billing_type: "RECURRING" | "ENGAGEMENT";
  monthly_amount: number | null;
  ends_at: Date | string | null;
  product: { key: ProductKey };
}

export interface InvLite {
  status: string; // EndurInvoiceStatus: DRAFT|SENT|PAID|OVERDUE|CANCELLED
  total: number;
  due_at: Date | string | null;
  paid_at: Date | string | null;
}

export type RiskBand = "low" | "medium" | "high";

export interface CustomerMetrics {
  mrr: number; // IQD, active RECURRING only
  ltv: number; // IQD, sum of PAID invoice totals
  tenureDays: number;
  productCount: number;
  activeProductCount: number;
  overdueCount: number;
  ownedKeys: ProductKey[];
  riskBand: RiskBand;
  riskReasons: string[];
}

const DAY_MS = 86_400_000;
const SEVERITY: Record<RiskBand, number> = { low: 0, medium: 1, high: 2 };

function asTime(d: Date | string | null): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

export function computeCustomerMetrics(args: {
  created_at: Date | string;
  products: PcLite[];
  invoices: InvLite[];
}): CustomerMetrics {
  const now = Date.now();
  const { products, invoices } = args;

  const mrr = products
    .filter((p) => p.status === "active" && p.billing_type === "RECURRING")
    .reduce((s, p) => s + (p.monthly_amount ?? 0), 0);

  const ltv = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + (i.total ?? 0), 0);

  const tenureDays = Math.max(
    0,
    Math.floor((now - new Date(args.created_at).getTime()) / DAY_MS),
  );

  const productCount = products.length;
  const activeProductCount = products.filter(
    (p) => p.status === "active",
  ).length;

  const overdueCount = invoices.filter((i) => {
    if (i.status === "OVERDUE") return true;
    if (i.status === "PAID" || i.status === "CANCELLED") return false;
    const due = asTime(i.due_at);
    return due != null && due < now;
  }).length;

  const ownedKeys = Array.from(
    new Set(products.map((p) => p.product.key)),
  ) as ProductKey[];

  let band: RiskBand = "low";
  const reasons: string[] = [];
  const bump = (b: RiskBand, reason: string) => {
    reasons.push(reason);
    if (SEVERITY[b] > SEVERITY[band]) band = b;
  };

  if (productCount > 0 && activeProductCount === 0) {
    bump("high", "كل الاشتراكات متوقّفة أو ملغاة");
  }
  if (overdueCount > 0) {
    bump("high", `${overdueCount} فاتورة متأخّرة`);
  }
  if (products.some((p) => p.status === "paused")) {
    bump("medium", "يوجد اشتراك متوقّف");
  }
  for (const p of products) {
    if (p.status !== "trial") continue;
    const ends = asTime(p.ends_at);
    if (ends != null && ends - now <= 7 * DAY_MS) {
      bump("medium", "تجربة تنتهي خلال ٧ أيّام");
      break;
    }
  }

  return {
    mrr,
    ltv,
    tenureDays,
    productCount,
    activeProductCount,
    overdueCount,
    ownedKeys,
    riskBand: band,
    riskReasons: reasons,
  };
}
