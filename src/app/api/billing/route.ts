export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const tenant_id = searchParams.get("tenant_id") || "";
    const is_paid = searchParams.get("is_paid");
    const plan = searchParams.get("plan") || "";

    const where: any = {};

    if (tenant_id) {
      where.tenant_id = tenant_id;
    }

    if (is_paid === "true") {
      where.is_paid = true;
    } else if (is_paid === "false") {
      where.is_paid = false;
    }

    if (plan) {
      where.plan = plan;
    }

    const [invoices, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              owner_name: true,
              phone: true,
            },
          },
        },
      }),
      prisma.billingInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List billing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
