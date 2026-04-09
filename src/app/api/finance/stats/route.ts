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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      activeTenants,
      overdueTenants,
      expiringSoon,
      monthlyRevenue,
      totalClients,
    ] = await Promise.all([
      // Active tenants: is_active AND not locked
      prisma.tenant.count({
        where: {
          is_active: true,
          locked_at: null,
        },
      }),
      // Overdue: subscription_ends_at < now AND not locked
      prisma.tenant.count({
        where: {
          subscription_ends_at: { lt: now },
          locked_at: null,
          is_active: true,
        },
      }),
      // Expiring within 7 days
      prisma.tenant.count({
        where: {
          subscription_ends_at: {
            gt: now,
            lte: sevenDaysFromNow,
          },
          locked_at: null,
          is_active: true,
        },
      }),
      // Monthly revenue from paid invoices this month
      prisma.billingInvoice.aggregate({
        _sum: { final_amount: true },
        where: {
          is_paid: true,
          paid_at: { gte: startOfMonth },
        },
      }),
      // Total clients
      prisma.tenant.count(),
    ]);

    return NextResponse.json({
      active_tenants: activeTenants,
      overdue_tenants: overdueTenants,
      expiring_soon: expiringSoon,
      monthly_revenue: Number(monthlyRevenue._sum.final_amount || 0),
      total_clients: totalClients,
    });
  } catch (error) {
    console.error("[finance/stats] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
