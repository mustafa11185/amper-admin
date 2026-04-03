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

    // Hard delete: remove ALL tenant data in correct FK order
    // Using raw SQL to avoid Prisma schema mismatches
    await prisma.$transaction(async (tx) => {
      // Helper subqueries
      const staffSub = `(SELECT id FROM staff WHERE tenant_id = '${id}')`;
      const subsSub = `(SELECT id FROM subscribers WHERE tenant_id = '${id}')`;
      const branchSub = `(SELECT id FROM branches WHERE tenant_id = '${id}')`;
      const genSub = `(SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}')`;
      const engineSub = `(SELECT e.id FROM engines e JOIN generators g ON e.generator_id = g.id JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}')`;

      // ── Level 5: engine sensor logs ──
      await tx.$executeRawUnsafe(`DELETE FROM fuel_logs WHERE engine_id IN ${engineSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM temperature_logs WHERE engine_id IN ${engineSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM oil_pressure_logs WHERE engine_id IN ${engineSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM load_logs WHERE engine_id IN ${engineSub}`);

      // ── Level 4: staff child tables ──
      await tx.$executeRawUnsafe(`DELETE FROM pos_transactions WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_daily_reports WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_shifts WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operator_shifts WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operator_schedules WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_gps_logs WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_devices WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_discount_requests WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM salary_payments WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_salary_configs WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_salaries WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_permissions WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operator_permissions WHERE staff_id IN ${staffSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_branch_access WHERE staff_id IN ${staffSub}`);

      // ── Level 4: subscriber child tables ──
      await tx.$executeRawUnsafe(`DELETE FROM pos_transactions WHERE subscriber_id IN ${subsSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM invoices WHERE subscriber_id IN ${subsSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM meter_readings WHERE subscriber_id IN ${subsSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_call_requests WHERE subscriber_id IN ${subsSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_discount_requests WHERE subscriber_id IN ${subsSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM subscriber_discounts WHERE subscriber_id IN ${subsSub}`);

      // ── Level 3: generator child tables ──
      await tx.$executeRawUnsafe(`DELETE FROM iot_devices WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM raspberry_devices WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM manual_override_logs WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operator_shifts WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operator_schedules WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM subscriber_app_settings WHERE generator_id IN ${genSub}`);

      // ── Level 3: branch child tables ──
      await tx.$executeRawUnsafe(`DELETE FROM delivery_records WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM expenses WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM notifications WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM monthly_pricing WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM invoice_generation_logs WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM ai_reports WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM loss_reports WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM marketing_messages WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM normal_cut_logs WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM offline_sync_queue WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM operation_logs WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM upgrade_requests WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM collector_wallets WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM pos_devices WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_gps_logs WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM subscriber_discounts WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM invoices WHERE branch_id IN ${branchSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM alleys WHERE branch_id IN ${branchSub}`);

      // ── Level 2: main entity tables ──
      await tx.$executeRawUnsafe(`DELETE FROM subscribers WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM staff WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM engines WHERE generator_id IN ${genSub}`);
      await tx.$executeRawUnsafe(`DELETE FROM generators WHERE branch_id IN ${branchSub}`);

      // ── Level 1: direct tenant FK tables ──
      await tx.$executeRawUnsafe(`DELETE FROM pos_devices WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM online_payments WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM payments WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM support_tickets WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM subscriber_app_settings WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM plan_change_logs WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM tenant_discounts WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM gps_logs WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM salary_payments WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM staff_salary_configs WHERE tenant_id = '${id}'`);

      // ── Level 0: branches + modules (cascade) + tenant ──
      await tx.$executeRawUnsafe(`DELETE FROM branches WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM tenant_modules WHERE tenant_id = '${id}'`);
      await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${id}'`);
    }, { timeout: 60000 });

    return NextResponse.json({ message: "تم حذف العميل وجميع بياناته نهائياً" });
  } catch (error) {
    console.error("Hard delete client error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `فشل الحذف: ${msg}` },
      { status: 500 }
    );
  }
}
