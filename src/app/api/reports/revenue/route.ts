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
    const plan = searchParams.get("plan") || "";

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const where: any = {
      is_paid: true,
      paid_at: { gte: startDate },
    };

    if (plan) {
      where.plan = plan;
    }

    const invoices = await prisma.billingInvoice.findMany({
      where,
      select: {
        final_amount: true,
        discount_amount: true,
        plan: true,
        paid_at: true,
        period_start: true,
      },
      orderBy: { paid_at: "asc" },
    });

    // Aggregate by month
    const monthlyRevenue: Record<
      string,
      { month: string; total: number; discount: number; count: number }
    > = {};

    for (const inv of invoices) {
      const date = inv.paid_at || inv.period_start;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyRevenue[key]) {
        monthlyRevenue[key] = { month: key, total: 0, discount: 0, count: 0 };
      }
      monthlyRevenue[key].total += Number(inv.final_amount);
      monthlyRevenue[key].discount += Number(inv.discount_amount);
      monthlyRevenue[key].count += 1;
    }

    // Revenue by plan
    const byPlan: Record<string, number> = {};
    for (const inv of invoices) {
      byPlan[inv.plan] = (byPlan[inv.plan] || 0) + Number(inv.final_amount);
    }

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.final_amount),
      0
    );
    const totalDiscount = invoices.reduce(
      (sum, inv) => sum + Number(inv.discount_amount),
      0
    );

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_discount: totalDiscount,
      invoice_count: invoices.length,
      monthly: Object.values(monthlyRevenue),
      by_plan: Object.entries(byPlan).map(([plan, total]) => ({
        plan,
        total,
      })),
    });
  } catch (error) {
    console.error("Revenue report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
