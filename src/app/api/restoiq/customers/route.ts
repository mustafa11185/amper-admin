/**
 * GET /api/restoiq/customers — P-MERGE-2 (2026-05-14).
 *
 * Lists every RestoIQ subscription from the Amper-side DB
 * (ProductCustomer rows where product.key === 'RESTOIQ') joined
 * with their Customer record so the admin can identify each tenant
 * by name + contact info.
 *
 * P-MERGE-3 will enrich each row with live RestoIQ-side data
 * (branch count, last activity, MRR override) via the proxy.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { key: "RESTOIQ" },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ customers: [], note: "RESTOIQ product not registered" });
  }

  const rows = await prisma.productCustomer.findMany({
    where: { product_id: product.id },
    orderBy: [{ status: "asc" }, { started_at: "desc" }],
    take: 200,
  });

  // The Amper customer table holds the actual restaurant identity.
  // We fetch in a second query to avoid coupling to a specific
  // Prisma relation name on the schema.
  // Note: ProductCustomer.customer_id is on the row — we look it up.
  const customerIds = [...new Set(rows.map((r) => r.customer_id))];
  // The model is Tenant in the Amper schema; ProductCustomer.customer_id
  // resolves to that.
  // Fall back to empty list if the table is unrelated.
  let identities: Record<string, { name: string; phone: string | null }> = {};
  try {
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });
    identities = Object.fromEntries(
      tenants.map((t) => [t.id, { name: t.name, phone: t.phone }]),
    );
  } catch {
    // If the lookup fails, the rows still render with raw IDs.
  }

  return NextResponse.json({
    customers: rows.map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      external_ref: r.external_ref,
      name: identities[r.customer_id]?.name ?? r.external_ref,
      phone: identities[r.customer_id]?.phone ?? null,
      billing_type: r.billing_type,
      plan_name: r.plan_name,
      monthly_amount: r.monthly_amount,
      status: r.status,
      started_at: r.started_at,
      ends_at: r.ends_at,
    })),
    total: rows.length,
  });
}
