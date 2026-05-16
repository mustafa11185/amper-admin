/**
 * ذكاء اندر — محرّك البيع المتقاطع — P-CO-1.5 (2026-05-16).
 *
 * Deterministic next-best-product recommender across Endur's
 * portfolio (Amper · RestoIQ · BARQ). Pure, explainable scoring —
 * every recommendation carries an Arabic reason + a WhatsApp-ready
 * rep script. No external AI dependency, so it ships without an
 * infra/key decision; an optional LLM enrichment can later wrap
 * `crossSellForCustomer` behind an env flag without touching callers
 * or the UI.
 *
 * UI surfaces this strictly as «ذكاء اندر» — never a vendor name
 * (mandatory branding rule).
 */
import type { ProductKey } from "@prisma/client";

export interface OwnedProduct {
  key: ProductKey;
  status: string; // active | trial | paused | cancelled
}

export interface CrossSellInput {
  customerName: string;
  governorate: string | null;
  owned: OwnedProduct[];
  mrr: number;
  tenureDays: number;
  riskBand: "low" | "medium" | "high";
}

export interface Opportunity {
  product: ProductKey;
  productNameAr: string;
  kind: "expand" | "winback";
  confidence: number; // 0..1, rounded to 2dp
  reasonAr: string;
  scriptAr: string; // WhatsApp-ready
}

const NAME_AR: Record<ProductKey, string> = {
  AMPER: "امبير",
  RESTOIQ: "ريستو",
  BARQ: "براق",
};

const PITCH_AR: Record<ProductKey, string> = {
  AMPER: "إدارة مولّدات الأحياء والاشتراكات والجباية",
  RESTOIQ: "إدارة مطعمك بالكامل: طلبات ومطبخ ومخزون وولاء",
  BARQ: "حملات تسويق رقمي ووصول أوسع لعملائك",
};

function clamp(n: number): number {
  return Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
}

function activeKeys(owned: OwnedProduct[]): Set<ProductKey> {
  return new Set(owned.filter((o) => o.status === "active").map((o) => o.key));
}

function script(
  customerName: string,
  product: ProductKey,
  kind: "expand" | "winback",
): string {
  const n = NAME_AR[product];
  if (kind === "winback") {
    return `مرحباً ${customerName} 👋 لاحظنا أنّ اشتراك ${n} لديكم متوقّف. نقدر نعيد تفعيله بعرض خاص ونرجّع كل بياناتكم كما كانت — تحبّون نحجز لكم موعد تفعيل؟`;
  }
  return `مرحباً ${customerName} 👋 بما أنّكم تستخدمون منتجاتنا، نقترح إضافة ${n} (${PITCH_AR[product]}). نقدر نسوّيلكم عرض تجريبي بدون التزام — تحبّون نبدأ؟`;
}

export function crossSellForCustomer(
  input: CrossSellInput,
): Opportunity[] {
  const active = activeKeys(input.owned);
  const ownedAny = new Set(input.owned.map((o) => o.key));
  const out: Opportunity[] = [];

  const tenureBoost = input.tenureDays >= 180 ? 0.1 : 0;
  const mrrBoost = input.mrr >= 100_000 ? 0.1 : 0;
  const riskPenalty =
    input.riskBand === "high" ? 0.25 : input.riskBand === "medium" ? 0.1 : 0;

  const push = (
    product: ProductKey,
    kind: "expand" | "winback",
    base: number,
    reasonAr: string,
  ) => {
    out.push({
      product,
      productNameAr: NAME_AR[product],
      kind,
      confidence: clamp(base + tenureBoost + mrrBoost - riskPenalty),
      reasonAr,
      scriptAr: script(input.customerName, product, kind),
    });
  };

  // ── win-back: a product owned but none of its rows active ────────
  for (const key of ownedAny) {
    const anyActive = input.owned.some(
      (o) => o.key === key && o.status === "active",
    );
    const lapsed = input.owned.some(
      (o) =>
        o.key === key && (o.status === "paused" || o.status === "cancelled"),
    );
    if (!anyActive && lapsed) {
      push(
        key,
        "winback",
        0.6,
        `اشتراك ${NAME_AR[key]} متوقّف/ملغى — فرصة استرجاع قبل الفقد النهائي`,
      );
    }
  }

  // ── expand: Amper-active → RestoIQ (strongest cross-sell) ────────
  if (active.has("AMPER") && !ownedAny.has("RESTOIQ")) {
    push(
      "RESTOIQ",
      "expand",
      0.7,
      "عميل مولّدات نشط — كثير من مشغّلي المولّدات يديرون مطاعم/منشآت تخدمها ريستو",
    );
  }

  // ── expand: RestoIQ-active → BARQ (marketing upsell) ─────────────
  if (active.has("RESTOIQ") && !ownedAny.has("BARQ")) {
    push(
      "BARQ",
      "expand",
      0.6,
      "مطعم نشط على ريستو — جاهز لحملات تسويق رقمي عبر براق لزيادة الطلبات",
    );
  }

  // ── expand: RestoIQ-active, no Amper (weaker, generic) ───────────
  if (active.has("RESTOIQ") && !ownedAny.has("AMPER")) {
    push(
      "AMPER",
      "expand",
      0.4,
      "عميل ريستو نشط — قد يملك/يدير مولّداً يخدمه نظام امبير للاشتراكات والجباية",
    );
  }

  return out
    .filter((o) => o.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
}
