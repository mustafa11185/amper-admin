/**
 * GET /api/endur-customers/resolve — P-CO-1.4 (2026-05-16).
 *
 * Resolves a product-side identifier to an EndurCustomer id so the
 * product hubs can deep-link back into the 360° screen without
 * knowing the Endur id. Completes the bidirectional navigation the
 * Product Isolation Rule requires.
 *
 *   ?amper_tenant_id=<tenantId>        → EndurCustomer.amper_tenant_id
 *   ?ref=<external_ref>&product=<KEY>   → ProductCustomer.external_ref
 *
 * Returns { id: string | null }. null = product customer exists but
 * has no unified Endur record yet (the caller shows a CTA).
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";
import type { ProductKey } from "@prisma/client";

async function GET_(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const amperTenantId = url.searchParams.get("amper_tenant_id");
  const ref = url.searchParams.get("ref");
  const product = url.searchParams.get("product");

  if (amperTenantId) {
    const c = await prisma.endurCustomer.findUnique({
      where: { amper_tenant_id: amperTenantId },
      select: { id: true },
    });
    return NextResponse.json({ id: c?.id ?? null });
  }

  if (ref && product) {
    const prod = await prisma.product.findUnique({
      where: { key: product as ProductKey },
      select: { id: true },
    });
    if (!prod) return NextResponse.json({ id: null });
    const pc = await prisma.productCustomer.findFirst({
      where: { product_id: prod.id, external_ref: ref },
      select: { customer_id: true },
    });
    return NextResponse.json({ id: pc?.customer_id ?? null });
  }

  return NextResponse.json(
    { error: "amper_tenant_id, or ref+product, required" },
    { status: 400 },
  );
}

export const GET = withGuard("endur-customers-resolve", GET_);
