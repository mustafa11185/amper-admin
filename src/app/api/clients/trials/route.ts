import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const allTrials = await prisma.tenant.findMany({
    where: { is_trial: true },
    include: {
      branches: { select: { governorate: true } },
      _count: { select: { subscribers: true, staff: true } },
    },
    orderBy: { trial_ends_at: "asc" },
  });

  const active = allTrials.filter(t => t.is_active && t.trial_ends_at && new Date(t.trial_ends_at) > now);
  const expiring48h = active.filter(t => t.trial_ends_at && new Date(t.trial_ends_at) <= in48h);
  const expired = allTrials.filter(t => !t.is_active || (t.trial_ends_at && new Date(t.trial_ends_at) <= now));

  // Conversion rate: tenants that WERE trial but are now active paid
  const converted = await prisma.tenant.count({ where: { is_trial: false, is_active: true, trial_ends_at: { not: null } } });
  const totalTrialEver = allTrials.length + converted;
  const conversionRate = totalTrialEver > 0 ? Math.round((converted / totalTrialEver) * 100) : 0;

  return NextResponse.json({
    stats: {
      active_count: active.length,
      expiring_48h: expiring48h.length,
      expired_not_converted: expired.length,
      conversion_rate: conversionRate,
    },
    trials: allTrials.map(t => ({
      id: t.id,
      name: t.name,
      owner_name: t.owner_name,
      phone: t.phone,
      governorate: (t.branches as any)?.[0]?.governorate ?? null,
      is_active: t.is_active,
      created_at: t.created_at.toISOString(),
      trial_ends_at: t.trial_ends_at?.toISOString() ?? null,
      days_remaining: t.trial_ends_at ? Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86400000) : 0,
      subscribers_count: t._count.subscribers,
      staff_count: t._count.staff,
    })),
  });
}
