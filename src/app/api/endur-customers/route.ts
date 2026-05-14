export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  const customers = await prisma.endurCustomer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      products: {
        include: { product: { select: { key: true, name_ar: true, color: true } } },
      },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json({ customers });
}

interface CreateBody {
  name: string;
  contact_name?: string;
  phone: string;
  email?: string;
  governorate?: string;
  address?: string;
  notes?: string;
  amper_tenant_id?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["super_admin", "sales"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as CreateBody;
  if (!body.name || !body.phone) {
    return NextResponse.json(
      { error: "name and phone are required" },
      { status: 400 }
    );
  }

  try {
    const customer = await prisma.endurCustomer.create({
      data: {
        name: body.name,
        contact_name: body.contact_name ?? null,
        phone: body.phone,
        email: body.email ?? null,
        governorate: body.governorate ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        amper_tenant_id: body.amper_tenant_id ?? null,
      },
    });
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
