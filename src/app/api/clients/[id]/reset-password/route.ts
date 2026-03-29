import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { password } = await req.json();

  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.tenant.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ ok: true });
}
