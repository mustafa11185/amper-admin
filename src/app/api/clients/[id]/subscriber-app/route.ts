import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const totalSubscribers = await prisma.subscriber.count({ where: { tenant_id: id, is_active: true } });
  const withCode = await prisma.subscriber.count({ where: { tenant_id: id, is_active: true, access_code: { not: null } } });

  return NextResponse.json({
    total_subscribers: totalSubscribers,
    with_code: withCode,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
