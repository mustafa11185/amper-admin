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
    const months = parseInt(searchParams.get("months") || "12");

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [
      totalClients,
      activeClients,
      trialClients,
      lockedClients,
      planDistribution,
      recentClients,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { is_active: true } }),
      prisma.tenant.count({ where: { is_trial: true } }),
      prisma.tenant.count({ where: { locked_at: { not: null } } }),
      prisma.tenant.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
      prisma.tenant.findMany({
        where: { created_at: { gte: startDate } },
        select: { created_at: true, plan: true },
        orderBy: { created_at: "asc" },
      }),
    ]);

    // New clients by month
    const newByMonth: Record<string, number> = {};
    for (const client of recentClients) {
      const d = client.created_at;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      newByMonth[key] = (newByMonth[key] || 0) + 1;
    }

    // Churn: clients deactivated (locked_at set)
    const churnedClients = await prisma.tenant.count({
      where: {
        is_active: false,
        locked_at: { gte: startDate },
      },
    });

    return NextResponse.json({
      total_clients: totalClients,
      active_clients: activeClients,
      trial_clients: trialClients,
      locked_clients: lockedClients,
      churned_clients: churnedClients,
      churn_rate:
        totalClients > 0
          ? ((churnedClients / totalClients) * 100).toFixed(2)
          : "0",
      plan_distribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count.plan,
      })),
      new_clients_by_month: Object.entries(newByMonth).map(
        ([month, count]) => ({ month, count })
      ),
    });
  } catch (error) {
    console.error("Clients report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
