export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  // Plans are defined inline — editing via API is not supported
  return NextResponse.json({ error: "Plans are managed via code configuration" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  return NextResponse.json({ error: "Plans are managed via code configuration" }, { status: 400 });
}
