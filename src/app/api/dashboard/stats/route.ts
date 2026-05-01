export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ─── Core stats ─────────────────────────────────────────
    const [
      total_tenants,
      active_tenants,
      open_tickets,
      revenueResult,
      prevRevenueResult,
      totalCommissions,
      plan_distribution,
      recent_clients,
      activity_feed,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { is_active: true } }),
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.billingInvoice.aggregate({
        _sum: { final_amount: true },
        where: { is_paid: true, paid_at: { gte: monthStart } },
      }),
      prisma.billingInvoice.aggregate({
        _sum: { final_amount: true },
        where: { is_paid: true, paid_at: { gte: prevMonthStart, lte: prevMonthEnd } },
      }),
      prisma.onlinePayment.aggregate({
        _sum: { commission_amount: true },
        where: { status: 'success', created_at: { gte: monthStart } },
      }),
      prisma.tenant.groupBy({ by: ["plan"], _count: { plan: true } }),
      prisma.tenant.findMany({
        orderBy: { created_at: "desc" }, take: 10,
        select: { id: true, name: true, owner_name: true, phone: true, plan: true, is_active: true, created_at: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { created_at: "desc" }, take: 20,
        select: { id: true, action: true, entity_type: true, actor_type: true, created_at: true },
      }),
    ]);

    const monthly_revenue = Number(revenueResult._sum.final_amount ?? 0);
    const prev_monthly_revenue = Number(prevRevenueResult._sum.final_amount ?? 0);
    const total_commissions = Number(totalCommissions._sum.commission_amount ?? 0);

    // ─── Growth & Churn ─────────────────────────────────────
    // New clients this month
    const newThisMonth = await prisma.tenant.count({
      where: { created_at: { gte: monthStart } },
    });
    // New clients last month
    const newLastMonth = await prisma.tenant.count({
      where: { created_at: { gte: prevMonthStart, lte: prevMonthEnd } },
    });
    // Churned = deactivated this month (locked_at or is_active=false, updated this month)
    const churnedThisMonth = await prisma.tenant.count({
      where: {
        is_active: false,
        updated_at: { gte: monthStart },
      },
    });
    // Active at start of month (total - new this month + churned)
    const activeStartOfMonth = Math.max(1, active_tenants - newThisMonth + churnedThisMonth);
    const churn_rate = Math.round((churnedThisMonth / activeStartOfMonth) * 100);
    const growth_rate = newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : 0;
    const revenue_growth = prev_monthly_revenue > 0
      ? Math.round(((monthly_revenue - prev_monthly_revenue) / prev_monthly_revenue) * 100)
      : monthly_revenue > 0 ? 100 : 0;

    // ─── New clients by month (12 months) ───────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const allTenantsLastYear = await prisma.tenant.findMany({
      where: { created_at: { gte: twelveMonthsAgo } },
      select: { created_at: true },
    });
    const new_clients_by_month: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = allTenantsLastYear.filter((t) => {
        const c = t.created_at;
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      new_clients_by_month.push({ month: key, count });
    }

    // ─── Revenue trend (6 months) ───────────────────────────
    const revenue_trend: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const key = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, "0")}`;
      const rev = await prisma.billingInvoice.aggregate({
        _sum: { final_amount: true },
        where: { is_paid: true, paid_at: { gte: mStart, lte: mEnd } },
      });
      revenue_trend.push({ month: key, revenue: Number(rev._sum.final_amount ?? 0) });
    }

    // ─── Feature (module) usage ─────────────────────────────
    const moduleUsage = await prisma.tenantModule.groupBy({
      by: ['module_key'],
      where: { is_active: true },
      _count: { module_key: true },
      orderBy: { _count: { module_key: 'desc' } },
    });
    const feature_usage = moduleUsage.map(m => ({
      module: m.module_key,
      count: m._count.module_key,
    }));

    // ─── Usage metrics ──────────────────────────────────────
    const [
      totalSubscribers,
      totalStaff,
      totalGenerators,
      totalBranches,
      totalInvoicesThisMonth,
      paidInvoicesThisMonth,
      totalIotDevices,
      onlineIotDevices,
    ] = await Promise.all([
      prisma.subscriber.count({ where: { is_active: true } }),
      prisma.staff.count({ where: { is_active: true } }),
      prisma.generator.count(),
      prisma.branch.count(),
      prisma.invoice.count({ where: { created_at: { gte: monthStart } } }),
      prisma.invoice.count({ where: { created_at: { gte: monthStart }, is_fully_paid: true } }),
      prisma.iotDevice.count().catch(() => 0),
      prisma.iotDevice.count({ where: { is_online: true } }).catch(() => 0),
    ]);

    const platform_collection_rate = totalInvoicesThisMonth > 0
      ? Math.round((paidInvoicesThisMonth / totalInvoicesThisMonth) * 100)
      : 0;

    // ─── Avg subscribers per client ─────────────────────────
    const avg_subscribers_per_client = active_tenants > 0
      ? Math.round(totalSubscribers / active_tenants)
      : 0;

    // ─── Trial conversion ───────────────────────────────────
    const trialClients = await prisma.tenant.count({ where: { is_trial: true } });
    const convertedFromTrial = await prisma.tenant.count({
      where: { has_used_trial: true, is_trial: false, is_active: true },
    });
    const totalTrialEver = trialClients + convertedFromTrial;
    const trial_conversion_rate = totalTrialEver > 0
      ? Math.round((convertedFromTrial / totalTrialEver) * 100)
      : 0;

    // ─── Top governorates ───────────────────────────────────
    const top_governorates = await prisma.branch.groupBy({
      by: ["governorate"],
      _count: { governorate: true },
      where: { governorate: { not: null } },
      orderBy: { _count: { governorate: "desc" } },
      take: 10,
    });

    // ─── Best selling plans (by new signups this quarter) ───
    const quarterAgo = new Date();
    quarterAgo.setMonth(quarterAgo.getMonth() - 3);
    const recentSignups = await prisma.tenant.groupBy({
      by: ['plan'],
      where: { created_at: { gte: quarterAgo } },
      _count: { plan: true },
      orderBy: { _count: { plan: 'desc' } },
    });
    const best_selling_plans = recentSignups.map(p => ({
      plan: p.plan,
      count: p._count.plan,
    }));

    return NextResponse.json({
      // Core
      total_tenants,
      active_tenants,
      monthly_revenue,
      total_commissions,
      open_tickets,
      // Growth
      new_this_month: newThisMonth,
      new_last_month: newLastMonth,
      churned_this_month: churnedThisMonth,
      churn_rate,
      growth_rate,
      revenue_growth,
      trial_clients: trialClients,
      trial_conversion_rate,
      // Charts
      new_clients_by_month,
      revenue_trend,
      plan_distribution: plan_distribution.map((p) => ({ plan: p.plan, count: p._count.plan })),
      feature_usage,
      best_selling_plans,
      // Platform usage
      platform_stats: {
        total_subscribers: totalSubscribers,
        total_staff: totalStaff,
        total_generators: totalGenerators,
        total_branches: totalBranches,
        avg_subscribers_per_client,
        platform_collection_rate,
        iot_devices: totalIotDevices,
        iot_online: onlineIotDevices,
      },
      // Tables
      top_governorates: top_governorates.map((g) => ({ governorate: g.governorate, count: g._count.governorate })),
      recent_clients,
      activity_feed,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
