export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const discounts = await prisma.tenantDiscount.findMany({
      where: { tenant_id: id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error("Get discounts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      discount_type,
      discount_value,
      promo_code,
      reason,
      valid_from,
      valid_until,
      auto_renew,
    } = body;

    if (!discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: "discount_type and discount_value are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const discount = await prisma.tenantDiscount.create({
      data: {
        tenant_id: id,
        discount_type,
        discount_value,
        promo_code: promo_code || null,
        reason: reason || null,
        valid_from: valid_from ? new Date(valid_from) : new Date(),
        valid_until: valid_until ? new Date(valid_until) : null,
        auto_renew: auto_renew || false,
        applied_by: (session.user as any).id || "system",
      },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    console.error("Create discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
