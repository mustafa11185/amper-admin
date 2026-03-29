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

    const [
      total_tenants,
      active_tenants,
      open_tickets,
      revenueResult,
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
        where: {
          is_paid: true,
          paid_at: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
      prisma.onlinePayment.aggregate({
        _sum: { commission_amount: true },
        where: {
          status: 'success',
          created_at: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
      prisma.tenant.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
      prisma.tenant.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          owner_name: true,
          phone: true,
          plan: true,
          is_active: true,
          created_at: true,
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { created_at: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          entity_type: true,
          actor_type: true,
          created_at: true,
        },
      }),
    ]);

    // New clients by month (last 12 months)
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
        return (
          c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
        );
      }).length;
      new_clients_by_month.push({ month: key, count });
    }

    // Top governorates from branches
    const top_governorates = await prisma.branch.groupBy({
      by: ["governorate"],
      _count: { governorate: true },
      where: { governorate: { not: null } },
      orderBy: { _count: { governorate: "desc" } },
      take: 10,
    });

    const monthly_revenue = revenueResult._sum.final_amount ?? 0;

    const total_commissions = Number(totalCommissions._sum.commission_amount ?? 0);

    return NextResponse.json({
      total_tenants,
      active_tenants,
      monthly_revenue,
      total_commissions,
      open_tickets,
      new_clients_by_month,
      plan_distribution: plan_distribution.map((p) => ({
        plan: p.plan,
        count: p._count.plan,
      })),
      top_governorates: top_governorates.map((g) => ({
        governorate: g.governorate,
        count: g._count.governorate,
      })),
      recent_clients,
      activity_feed,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
