export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { markEndurInvoicePaid } from "@/lib/endur-invoices";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const invoice = await prisma.endurInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      line_items: { include: { product: true }, orderBy: { sort_order: "asc" } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

interface PatchBody {
  action?: "mark_paid" | "mark_sent" | "cancel";
  notes?: string;
  due_at?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["super_admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  if (body.action === "mark_paid") {
    const invoice = await markEndurInvoicePaid(prisma, id);
    return NextResponse.json({ invoice });
  }
  if (body.action === "mark_sent") {
    const invoice = await prisma.endurInvoice.update({
      where: { id },
      data: { status: "SENT" },
    });
    return NextResponse.json({ invoice });
  }
  if (body.action === "cancel") {
    const invoice = await prisma.endurInvoice.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ invoice });
  }

  // Generic field update (notes / due date)
  const data: Record<string, unknown> = {};
  if ("notes" in body) data.notes = body.notes ?? null;
  if ("due_at" in body) data.due_at = body.due_at ? new Date(body.due_at) : null;

  const invoice = await prisma.endurInvoice.update({ where: { id }, data });
  return NextResponse.json({ invoice });
}
