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

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        modules: true,
        branches: {
          include: {
            generators: true,
            _count: { select: { subscribers: true } },
          },
        },
        billing_invoices: { orderBy: { created_at: "desc" }, take: 6 },
        support_tickets: { orderBy: { created_at: "desc" }, take: 10 },
        _count: {
          select: {
            staff: true,
            subscribers: true,
            billing_invoices: true,
            support_tickets: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Additional stats
    const [planChangeLogs, activeSubscribers, generatorsCount, totalDebtResult] = await Promise.all([
      prisma.planChangeLog.findMany({ where: { tenant_id: id }, orderBy: { created_at: "desc" }, take: 10 }),
      prisma.subscriber.count({ where: { tenant_id: id, is_active: true } }),
      prisma.generator.count({ where: { branch: { tenant_id: id } } }),
      prisma.subscriber.aggregate({ where: { tenant_id: id }, _sum: { total_debt: true } }),
    ]);

    // Monthly revenue
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthlyInvoices = await prisma.invoice.findMany({
      where: { tenant_id: id, created_at: { gte: monthStart } },
      select: { amount_paid: true, total_amount_due: true },
    });
    const monthlyRevenue = monthlyInvoices.reduce((a, i) => a + Number(i.amount_paid), 0);
    const monthlyTotal = monthlyInvoices.reduce((a, i) => a + Number(i.total_amount_due), 0);

    // Trial info
    const trialInfo = tenant.is_trial ? {
      is_trial: true,
      trial_ends_at: tenant.trial_ends_at,
      days_remaining: tenant.trial_ends_at ? Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000) : 0,
    } : null;

    return NextResponse.json({
      tenant: { ...tenant, password: undefined },
      stats: {
        branches_count: (tenant as any)._count?.branches ?? tenant.branches?.length ?? 0,
        generators_count: generatorsCount,
        staff_count: (tenant as any)._count?.staff ?? 0,
        subscribers_count: (tenant as any)._count?.subscribers ?? 0,
        active_subscribers: activeSubscribers,
        monthly_revenue: monthlyRevenue,
        total_debt: Number(totalDebtResult._sum?.total_debt ?? 0),
        collection_rate: monthlyTotal > 0 ? Math.round((monthlyRevenue / monthlyTotal) * 100) : 0,
      },
      plan_change_logs: planChangeLogs,
      trial_info: trialInfo,
    });
  } catch (error) {
    console.error("Get client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const {
      name,
      owner_name,
      phone,
      email,
      plan,
      is_active,
      is_trial,
      trial_ends_at,
      trial_subscriber_limit,
      custom_max_generators,
      custom_max_subscribers,
    } = body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(owner_name !== undefined && { owner_name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(plan !== undefined && { plan }),
        ...(is_active !== undefined && { is_active }),
        ...(is_trial !== undefined && { is_trial }),
        ...(trial_ends_at !== undefined && {
          trial_ends_at: trial_ends_at ? new Date(trial_ends_at) : null,
        }),
        ...(trial_subscriber_limit !== undefined && { trial_subscriber_limit }),
        ...(custom_max_generators !== undefined && { custom_max_generators }),
        ...(custom_max_subscribers !== undefined && { custom_max_subscribers }),
      },
      include: { modules: true },
    });

    return NextResponse.json({ tenant: { ...tenant, password: undefined } });
  } catch (error) {
    console.error("Update client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Soft delete: set is_active=false
    await prisma.tenant.update({
      where: { id },
      data: { is_active: false, locked_at: new Date() },
    });

    return NextResponse.json({ message: "Tenant deactivated successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
