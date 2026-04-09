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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [overdue, expiring, trialEnding, recentlyPaid] = await Promise.all([
      // Overdue: subscription_ends_at < now AND not locked AND active
      prisma.tenant.findMany({
        where: {
          subscription_ends_at: { lt: now },
          locked_at: null,
          is_active: true,
          is_trial: false,
        },
        select: {
          id: true,
          name: true,
          owner_name: true,
          phone: true,
          plan: true,
          subscription_ends_at: true,
        },
        orderBy: { subscription_ends_at: "asc" },
        take: 50,
      }),
      // Expiring within 7 days
      prisma.tenant.findMany({
        where: {
          subscription_ends_at: {
            gt: now,
            lte: sevenDaysFromNow,
          },
          locked_at: null,
          is_active: true,
          is_trial: false,
        },
        select: {
          id: true,
          name: true,
          owner_name: true,
          phone: true,
          plan: true,
          subscription_ends_at: true,
        },
        orderBy: { subscription_ends_at: "asc" },
        take: 50,
      }),
      // Trial ending within 7 days
      prisma.tenant.findMany({
        where: {
          is_trial: true,
          trial_ends_at: {
            gt: now,
            lte: sevenDaysFromNow,
          },
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          owner_name: true,
          phone: true,
          plan: true,
          trial_ends_at: true,
        },
        orderBy: { trial_ends_at: "asc" },
        take: 50,
      }),
      // Recently paid: payments in the last 3 days
      prisma.payment.findMany({
        where: {
          created_at: { gte: threeDaysAgo },
        },
        select: {
          id: true,
          amount: true,
          method: true,
          created_at: true,
          tenant: {
            select: {
              id: true,
              name: true,
              owner_name: true,
              phone: true,
              plan: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      overdue: overdue.map((t) => ({
        ...t,
        type: "overdue" as const,
        date: t.subscription_ends_at,
      })),
      expiring: expiring.map((t) => ({
        ...t,
        type: "expiring" as const,
        date: t.subscription_ends_at,
      })),
      trial_ending: trialEnding.map((t) => ({
        ...t,
        type: "trial_ending" as const,
        date: t.trial_ends_at,
      })),
      recently_paid: recentlyPaid.map((p) => ({
        id: p.id,
        tenant_id: p.tenant.id,
        name: p.tenant.name,
        owner_name: p.tenant.owner_name,
        phone: p.tenant.phone,
        plan: p.tenant.plan,
        amount: Number(p.amount),
        method: p.method,
        type: "recently_paid" as const,
        date: p.created_at,
      })),
    });
  } catch (error) {
    console.error("[finance/alerts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
