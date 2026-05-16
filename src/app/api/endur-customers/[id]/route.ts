/**
 * GET /api/endur-customers/[id] — P-CO-1.1 (2026-05-16).
 *
 * 360° payload for one Endur customer: identity + owned products +
 * Endur invoices + computed metrics (MRR / LTV / risk) + a unified
 * activity timeline derived from existing rows (no timeline table —
 * sourced from ProductCustomer dates, EndurInvoice dates, and the
 * linked Amper tenant's SubscriptionEvent log).
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeCustomerMetrics } from "@/lib/endur-customer-metrics";

interface TimelineItem {
  at: string; // ISO
  kind: "product" | "invoice" | "subscription";
  title: string;
  meta?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.endurCustomer.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            select: { key: true, name_ar: true, name_en: true, color: true },
          },
        },
        orderBy: { started_at: "asc" },
      },
      invoices: {
        orderBy: { issued_at: "desc" },
        include: {
          line_items: {
            select: {
              description: true,
              total: true,
              product: { select: { key: true, name_ar: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const metrics = computeCustomerMetrics({
    created_at: customer.created_at,
    products: customer.products.map((p) => ({
      status: p.status,
      billing_type: p.billing_type,
      monthly_amount: p.monthly_amount,
      ends_at: p.ends_at,
      product: { key: p.product.key },
    })),
    invoices: customer.invoices.map((i) => ({
      status: i.status,
      total: i.total,
      due_at: i.due_at,
      paid_at: i.paid_at,
    })),
  });

  // ── unified timeline ────────────────────────────────────────────
  const timeline: TimelineItem[] = [];

  for (const pc of customer.products) {
    timeline.push({
      at: new Date(pc.started_at).toISOString(),
      kind: "product",
      title: `اشترك في ${pc.product.name_ar}`,
      meta: pc.plan_name ? `باقة ${pc.plan_name}` : undefined,
    });
    if (pc.ends_at) {
      timeline.push({
        at: new Date(pc.ends_at).toISOString(),
        kind: "product",
        title: `انتهى/أُوقف ${pc.product.name_ar}`,
        meta: pc.status,
      });
    }
  }

  for (const inv of customer.invoices) {
    timeline.push({
      at: new Date(inv.issued_at).toISOString(),
      kind: "invoice",
      title: `صدرت فاتورة ${inv.invoice_number}`,
      meta: `${inv.total.toLocaleString("ar-IQ")} د.ع · ${inv.status}`,
    });
    if (inv.paid_at) {
      timeline.push({
        at: new Date(inv.paid_at).toISOString(),
        kind: "invoice",
        title: `سُدّدت فاتورة ${inv.invoice_number}`,
        meta: `${inv.total.toLocaleString("ar-IQ")} د.ع`,
      });
    }
  }

  // Amper-side subscription events (only when soft-linked to a Tenant).
  if (customer.amper_tenant_id) {
    const events = await prisma.subscriptionEvent.findMany({
      where: { tenant_id: customer.amper_tenant_id },
      orderBy: { created_at: "desc" },
      take: 40,
    });
    for (const ev of events) {
      timeline.push({
        at: new Date(ev.created_at).toISOString(),
        kind: "subscription",
        title: ev.event_type,
        meta:
          ev.metadata && typeof ev.metadata === "object"
            ? JSON.stringify(ev.metadata)
            : undefined,
      });
    }
  }

  timeline.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      contact_name: customer.contact_name,
      phone: customer.phone,
      email: customer.email,
      governorate: customer.governorate,
      address: customer.address,
      notes: customer.notes,
      amper_tenant_id: customer.amper_tenant_id,
      created_at: customer.created_at,
      products: customer.products,
      invoices: customer.invoices,
    },
    metrics,
    timeline: timeline.slice(0, 80),
  });
}
