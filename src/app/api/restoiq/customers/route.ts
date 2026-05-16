/**
 * GET /api/restoiq/customers — P-MERGE-2 + P-FIX-1 (2026-05-14).
 *
 * Lists every RestoIQ subscription from the Amper-side DB.
 * P-FIX-1: top-level try/catch so production never returns an
 * empty 500. The client now always receives structured JSON.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مسجَّل دخول" },
        { status: 401 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { key: "RESTOIQ" },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({
        customers: [],
        total: 0,
        note: "RESTOIQ product not registered — run prisma/scripts/seed-restoiq-product.ts",
      });
    }

    const rows = await prisma.productCustomer.findMany({
      where: { product_id: product.id },
      orderBy: [{ status: "asc" }, { started_at: "desc" }],
      take: 200,
    });

    const customerIds = [...new Set(rows.map((r) => r.customer_id))];
    let identities: Record<string, { name: string; phone: string | null }> = {};
    if (customerIds.length > 0) {
      try {
        const tenants = await prisma.tenant.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, phone: true },
        });
        identities = Object.fromEntries(
          tenants.map((t) => [t.id, { name: t.name, phone: t.phone }]),
        );
      } catch (err) {
        // Soft fail — rows still render with raw IDs as the name.
        console.warn("[api/restoiq/customers] tenant lookup failed:", err);
      }
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذّر تنفيذ الاستعلام";
    console.error("[api/restoiq/customers] error:", err);
    return NextResponse.json(
      {
        error: "تعذّر تحميل قائمة المطاعم",
        detail: message,
      },
      { status: 500 },
    );
  }
}
