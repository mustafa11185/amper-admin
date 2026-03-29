export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const expired = await prisma.tenant.findMany({
    where: {
      is_trial: true,
      is_active: true,
      trial_ends_at: { lt: new Date() },
    },
  });

  let locked = 0;

  for (const tenant of expired) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { is_active: false, locked_at: new Date() },
    });
    locked++;
  }

  return NextResponse.json({ ok: true, expired_locked: locked });
}
