export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
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
    const { plan, notes } = body;

    if (!plan) {
      return NextResponse.json(
        { error: "Plan is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id },
        data: { plan },
      });

      await tx.planChangeLog.create({
        data: {
          tenant_id: id,
          changed_by: (session.user as any).id || "system",
          change_type: "plan_change",
          from_plan: existing.plan,
          to_plan: plan,
          notes: notes || null,
        },
      });

      return updated;
    });

    return NextResponse.json({ tenant: { ...tenant, password: undefined } });
  } catch (error) {
    console.error("Change plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
