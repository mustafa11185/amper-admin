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

    const [totalResult, paidResult, pendingResult, thisMonthResult] =
      await Promise.all([
        prisma.billingInvoice.aggregate({
          _sum: { final_amount: true },
        }),
        prisma.billingInvoice.aggregate({
          _sum: { final_amount: true },
          where: { is_paid: true },
        }),
        prisma.billingInvoice.aggregate({
          _sum: { final_amount: true },
          where: { is_paid: false },
        }),
        prisma.billingInvoice.aggregate({
          _sum: { final_amount: true },
          where: {
            is_paid: true,
            paid_at: { gte: monthStart },
          },
        }),
      ]);

    return NextResponse.json({
      total_revenue: totalResult._sum.final_amount ?? 0,
      paid: paidResult._sum.final_amount ?? 0,
      pending: pendingResult._sum.final_amount ?? 0,
      this_month: thisMonthResult._sum.final_amount ?? 0,
    });
  } catch (error) {
    console.error("Billing summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
