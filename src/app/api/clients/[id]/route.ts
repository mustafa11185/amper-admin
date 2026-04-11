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
      // NOTE: `plan` is intentionally NOT accepted here — all plan changes
      // must go through PUT /api/clients/[id]/plan so the audit log
      // (PlanChangeLog) is always written and trial flags / billing cycle
      // are handled. If a caller sends `plan` to this endpoint it's silently
      // ignored.
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
    // Use a DO block to handle missing tables gracefully
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        -- Helper: safe delete that ignores missing tables
        -- Level 5: engine sensor logs
        DELETE FROM fuel_logs WHERE engine_id IN (SELECT e.id FROM engines e JOIN generators g ON e.generator_id = g.id JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM temperature_logs WHERE engine_id IN (SELECT e.id FROM engines e JOIN generators g ON e.generator_id = g.id JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM oil_pressure_logs WHERE engine_id IN (SELECT e.id FROM engines e JOIN generators g ON e.generator_id = g.id JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM load_logs WHERE engine_id IN (SELECT e.id FROM engines e JOIN generators g ON e.generator_id = g.id JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');

        -- Level 4: staff children
        DELETE FROM pos_transactions WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM collector_daily_reports WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM collector_shifts WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM operator_shifts WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM operator_schedules WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM staff_gps_logs WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM staff_devices WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM collector_discount_requests WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM salary_payments WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM staff_salary_configs WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM collector_permissions WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM operator_permissions WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');
        DELETE FROM staff_branch_access WHERE staff_id IN (SELECT id FROM staff WHERE tenant_id = '${id}');

        -- Level 4: subscriber children
        DELETE FROM pos_transactions WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');
        DELETE FROM invoices WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');
        DELETE FROM meter_readings WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');
        DELETE FROM collector_call_requests WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');
        DELETE FROM collector_discount_requests WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');
        DELETE FROM subscriber_discounts WHERE subscriber_id IN (SELECT id FROM subscribers WHERE tenant_id = '${id}');

        -- Level 3: generator children
        DELETE FROM iot_devices WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM raspberry_devices WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM manual_override_logs WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM operator_shifts WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM operator_schedules WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM subscriber_app_settings WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');

        -- Level 3: branch children
        DELETE FROM delivery_records WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM expenses WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM notifications WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM monthly_pricing WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM invoice_generation_logs WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM ai_reports WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM loss_reports WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM marketing_messages WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM normal_cut_logs WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM offline_sync_queue WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM operation_logs WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM upgrade_requests WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM collector_wallets WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM pos_devices WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM staff_gps_logs WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM subscriber_discounts WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM invoices WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');
        DELETE FROM alleys WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');

        -- Level 2: main entities
        DELETE FROM subscribers WHERE tenant_id = '${id}';
        DELETE FROM staff WHERE tenant_id = '${id}';
        DELETE FROM engines WHERE generator_id IN (SELECT g.id FROM generators g JOIN branches b ON g.branch_id = b.id WHERE b.tenant_id = '${id}');
        DELETE FROM generators WHERE branch_id IN (SELECT id FROM branches WHERE tenant_id = '${id}');

        -- Level 1: direct tenant FKs
        DELETE FROM pos_devices WHERE tenant_id = '${id}';
        DELETE FROM online_payments WHERE tenant_id = '${id}';
        DELETE FROM payments WHERE tenant_id = '${id}';
        DELETE FROM billing_invoices WHERE tenant_id = '${id}';
        DELETE FROM support_tickets WHERE tenant_id = '${id}';
        DELETE FROM subscriber_app_settings WHERE tenant_id = '${id}';
        DELETE FROM plan_change_logs WHERE tenant_id = '${id}';
        DELETE FROM tenant_discounts WHERE tenant_id = '${id}';
        DELETE FROM gps_logs WHERE tenant_id = '${id}';
        DELETE FROM audit_logs WHERE tenant_id = '${id}';
        DELETE FROM salary_payments WHERE tenant_id = '${id}';
        DELETE FROM staff_salary_configs WHERE tenant_id = '${id}';

        -- Level 0: branches + modules + tenant
        DELETE FROM branches WHERE tenant_id = '${id}';
        DELETE FROM tenant_modules WHERE tenant_id = '${id}';
        DELETE FROM tenants WHERE id = '${id}';
      END $$;
    `);

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
