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
    const { modules } = body;

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: "modules array is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const mod of modules) {
        const moduleKey = mod.module_key;
        const isActive = mod.is_active ?? true;
        const addOnPrice = mod.add_on_price ?? null;
        const addedOutsidePlan = mod.added_outside_plan ?? false;

        await tx.tenantModule.upsert({
          where: {
            tenant_id_module_key: {
              tenant_id: id,
              module_key: moduleKey,
            },
          },
          update: {
            is_active: isActive,
            add_on_price: addOnPrice,
            added_outside_plan: addedOutsidePlan,
            deactivated_at: isActive ? null : new Date(),
          },
          create: {
            tenant_id: id,
            module_key: moduleKey,
            is_active: isActive,
            add_on_price: addOnPrice,
            added_outside_plan: addedOutsidePlan,
          },
        });
      }
    });

    const updatedModules = await prisma.tenantModule.findMany({
      where: { tenant_id: id },
    });

    return NextResponse.json({ modules: updatedModules });
  } catch (error) {
    console.error("Update modules error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
