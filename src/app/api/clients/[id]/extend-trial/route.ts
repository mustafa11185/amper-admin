import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { days } = await req.json();

  if (!days || days <= 0) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentEnd = tenant.trial_ends_at ?? new Date();
  const baseDate = new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
  const newEnd = new Date(baseDate.getTime() + days * 86400000);

  await prisma.tenant.update({
    where: { id },
    data: { trial_ends_at: newEnd, is_active: true, locked_at: null },
  });

  return NextResponse.json({ ok: true, new_trial_ends_at: newEnd.toISOString() });
}
