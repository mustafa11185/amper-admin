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

    // Get last 6 months of revenue from paid invoices
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const invoices = await prisma.billingInvoice.findMany({
      where: {
        is_paid: true,
        paid_at: { gte: sixMonthsAgo },
      },
      select: {
        final_amount: true,
        paid_at: true,
      },
    });

    // Group by month
    const monthlyData: Record<string, { revenue: number; count: number }> = {};

    // Initialize all 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { revenue: 0, count: 0 };
    }

    // Accumulate
    for (const inv of invoices) {
      if (!inv.paid_at) continue;
      const d = new Date(inv.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].revenue += Number(inv.final_amount);
        monthlyData[key].count += 1;
      }
    }

    const data = Object.entries(monthlyData).map(([month, vals]) => ({
      month,
      revenue: vals.revenue,
      count: vals.count,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[finance/revenue-chart] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
