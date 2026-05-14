export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  createEndurInvoice,
  type NewInvoiceLineInput,
} from "@/lib/endur-invoices";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const customer_id = url.searchParams.get("customer_id");

  const invoices = await prisma.endurInvoice.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(customer_id ? { customer_id } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      line_items: { include: { product: { select: { name_ar: true, key: true, color: true } } } },
    },
    orderBy: { issued_at: "desc" },
    take: 200,
  });

  return NextResponse.json({ invoices });
}

interface CreateBody {
  customer_id: string;
  due_at?: string;
  tax_amount?: number;
  notes?: string;
  line_items: NewInvoiceLineInput[];
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["super_admin", "sales", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as CreateBody;
  if (!body.customer_id) {
    return NextResponse.json(
      { error: "customer_id is required" },
      { status: 400 }
    );
  }
  if (!body.line_items?.length) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  try {
    const invoice = await createEndurInvoice(prisma, {
      customer_id: body.customer_id,
      due_at: body.due_at ? new Date(body.due_at) : null,
      tax_amount: body.tax_amount,
      notes: body.notes,
      line_items: body.line_items,
    });
    return NextResponse.json({ invoice });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
