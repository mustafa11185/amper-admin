/**
 * GET /api/endur-ai/cross-sell — P-CO-1.5 (2026-05-16).
 *
 * ذكاء اندر — البيع المتقاطع.
 *   ?customer_id=<id>  → opportunities for one customer (360 screen)
 *   (no param)         → top opportunities across the portfolio
 *                        (aggregated panel + dashboard widget)
 *
 * Branding rule: this is «ذكاء اندر». Never expose any AI vendor.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";
import { computeCustomerMetrics } from "@/lib/endur-customer-metrics";
import {
  crossSellForCustomer,
  type Opportunity,
} from "@/lib/endur-cross-sell";

const CUSTOMER_INCLUDE = {
  products: {
    include: { product: { select: { key: true } } },
  },
  invoices: {
    select: { status: true, total: true, due_at: true, paid_at: true },
  },
} as const;

function metricsOf(c: {
  created_at: Date;
  products: {
    status: string;
    billing_type: "RECURRING" | "ENGAGEMENT";
    monthly_amount: number | null;
    ends_at: Date | null;
    product: { key: "AMPER" | "RESTOIQ" | "BARQ" };
  }[];
  invoices: {
    status: string;
    total: number;
    due_at: Date | null;
    paid_at: Date | null;
  }[];
}) {
  return computeCustomerMetrics({
    created_at: c.created_at,
    products: c.products.map((p) => ({
      status: p.status,
      billing_type: p.billing_type,
      monthly_amount: p.monthly_amount,
      ends_at: p.ends_at,
      product: { key: p.product.key },
    })),
    invoices: c.invoices,
  });
}

async function GET_(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const customerId = url.searchParams.get("customer_id");

  if (customerId) {
    const c = await prisma.endurCustomer.findUnique({
      where: { id: customerId },
      include: CUSTOMER_INCLUDE,
    });
    if (!c) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }
    const m = metricsOf(c);
    const opportunities = crossSellForCustomer({
      customerName: c.name,
      governorate: c.governorate,
      owned: c.products.map((p) => ({
        key: p.product.key,
        status: p.status,
      })),
      mrr: m.mrr,
      tenureDays: m.tenureDays,
      riskBand: m.riskBand,
    });
    return NextResponse.json({ opportunities });
  }

  // ── aggregated portfolio scan ───────────────────────────────────
  const customers = await prisma.endurCustomer.findMany({
    include: CUSTOMER_INCLUDE,
    orderBy: { created_at: "desc" },
    take: 300,
  });

  const items: {
    customerId: string;
    customerName: string;
    governorate: string | null;
    opportunity: Opportunity;
  }[] = [];

  for (const c of customers) {
    const m = metricsOf(c);
    const ops = crossSellForCustomer({
      customerName: c.name,
      governorate: c.governorate,
      owned: c.products.map((p) => ({
        key: p.product.key,
        status: p.status,
      })),
      mrr: m.mrr,
      tenureDays: m.tenureDays,
      riskBand: m.riskBand,
    });
    for (const opportunity of ops) {
      items.push({
        customerId: c.id,
        customerName: c.name,
        governorate: c.governorate,
        opportunity,
      });
    }
  }

  items.sort(
    (a, b) => b.opportunity.confidence - a.opportunity.confidence,
  );

  const byProduct: Record<string, number> = {};
  for (const it of items) {
    byProduct[it.opportunity.product] =
      (byProduct[it.opportunity.product] ?? 0) + 1;
  }

  return NextResponse.json({
    total: items.length,
    byProduct,
    top: items.slice(0, 25),
  });
}

export const GET = withGuard("endur-ai-cross-sell", GET_);
