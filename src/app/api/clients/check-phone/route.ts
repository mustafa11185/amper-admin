export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ exists: false });

  const existing = await prisma.tenant.findFirst({
    where: { phone },
    select: { id: true, is_active: true, name: true },
  });

  if (!existing) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    is_inactive: !existing.is_active,
    tenant_id: existing.id,
    tenant_name: existing.name,
  });
}
