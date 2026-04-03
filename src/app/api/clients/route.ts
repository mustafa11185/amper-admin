export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { owner_name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (plan) {
      where.plan = plan;
    }

    if (status === "active") {
      where.is_active = true;
    } else if (status === "inactive") {
      where.is_active = false;
    } else if (status === "trial") {
      where.is_trial = true;
    } else if (status === "locked") {
      where.locked_at = { not: null };
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          modules: { select: { module_key: true, is_active: true } },
          _count: {
            select: {
              branches: true,
              subscribers: true,
              staff: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      tenants: tenants.map((t) => ({
        ...t,
        password: undefined,
      })),
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List clients error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, owner_name, phone, email, password, plan, modules, governorate, neighborhood, alley, province_key, district_key } = body;

    if (!name || !owner_name || !phone || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, owner_name, phone, password" },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "رقم الهاتف أو البريد الإلكتروني مستخدم مسبقاً" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const tenant = await prisma.$transaction(async (tx) => {
      const isTrial = plan === "trial";
      const newTenant = await tx.tenant.create({
        data: {
          name,
          owner_name,
          phone,
          email: email || null,
          password: hashedPassword,
          plan: plan || "basic",
          is_trial: isTrial,
          trial_ends_at: isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        },
      });

      // Create TenantModule records for selected modules
      if (modules && Array.isArray(modules) && modules.length > 0) {
        await tx.tenantModule.createMany({
          data: modules.map((m: any) => ({
            tenant_id: newTenant.id,
            module_key: m.module_key || m,
            is_active: true,
            add_on_price: m.add_on_price || null,
            added_outside_plan: m.added_outside_plan || false,
          })),
        });
      }

      // Create default Branch
      const branch = await tx.branch.create({
        data: {
          tenant_id: newTenant.id,
          name: "الفرع الرئيسي",
          governorate: governorate || null,
          province_key: province_key || null,
          district_key: district_key || null,
          address: [neighborhood, alley].filter(Boolean).join(" — ") || null,
          is_active: true,
        },
      });

      // Create default Generator (every branch must have at least 1)
      await tx.generator.create({
        data: {
          branch_id: branch.id,
          name: "المولدة الرئيسية",
          is_active: true,
        },
      });

      // Create default pricing so the manager can start immediately
      await tx.monthlyPricing.create({
        data: {
          branch_id: branch.id,
          price_per_amp_normal: 3000,
          price_per_amp_gold: 6000,
          effective_from: new Date(),
        },
      });

      return newTenant;
    });

    const result = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        modules: true,
        branches: { include: { generators: true } },
      },
    });

    return NextResponse.json(
      { tenant: { ...result, password: undefined } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
