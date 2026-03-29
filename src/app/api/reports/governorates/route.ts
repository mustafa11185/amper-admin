import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Governorate distribution from branches
    const branchGovernorates = await prisma.branch.groupBy({
      by: ["governorate"],
      _count: { governorate: true },
      where: { governorate: { not: null } },
      orderBy: { _count: { governorate: "desc" } },
    });

    // Subscriber count per governorate
    const subscriberGovernorates = await prisma.subscriber.groupBy({
      by: ["governorate"],
      _count: { governorate: true },
      where: { governorate: { not: null } },
      orderBy: { _count: { governorate: "desc" } },
    });

    // Revenue by governorate (via branches -> invoices)
    const branches = await prisma.branch.findMany({
      where: { governorate: { not: null } },
      select: { id: true, governorate: true },
    });

    const branchGovMap: Record<string, string> = {};
    for (const b of branches) {
      if (b.governorate) branchGovMap[b.id] = b.governorate;
    }

    const paidInvoices = await prisma.invoice.findMany({
      where: {
        branch_id: { in: branches.map((b) => b.id) },
        is_fully_paid: true,
      },
      select: {
        branch_id: true,
        total_amount_due: true,
      },
    });

    const revenueByGov: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const gov = branchGovMap[inv.branch_id];
      if (gov) {
        revenueByGov[gov] =
          (revenueByGov[gov] || 0) + Number(inv.total_amount_due);
      }
    }

    const revenue_by_governorate = Object.entries(revenueByGov)
      .map(([governorate, revenue]) => ({ governorate, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      branches_by_governorate: branchGovernorates.map((g) => ({
        governorate: g.governorate,
        branch_count: g._count.governorate,
      })),
      subscribers_by_governorate: subscriberGovernorates.map((g) => ({
        governorate: g.governorate,
        subscriber_count: g._count.governorate,
      })),
      revenue_by_governorate,
    });
  } catch (error) {
    console.error("Governorates report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
