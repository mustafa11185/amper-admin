export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";
import {
  computeCustomerMetrics,
  type RiskBand,
} from "@/lib/endur-customer-metrics";

async function GET_(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const productKey = url.searchParams.get("product") ?? ""; // AMPER|RESTOIQ|BARQ
  const status = url.searchParams.get("status") ?? ""; // active|trial|paused|cancelled
  const governorate = url.searchParams.get("governorate") ?? "";
  const multiOnly = url.searchParams.get("multi") === "1";
  const riskFilter = url.searchParams.get("risk") ?? ""; // low|medium|high

  // governorate + text search filter at the DB; product/status/risk
  // are relation/computed predicates applied in memory over the
  // bounded result set (≤200 rows — fine for an operator console).
  const rows = await prisma.endurCustomer.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(governorate ? { governorate } : {}),
    },
    include: {
      products: {
        include: {
          product: { select: { key: true, name_ar: true, color: true } },
        },
      },
      invoices: {
        select: { status: true, total: true, due_at: true, paid_at: true },
      },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  let customers = rows.map((c) => {
    const metrics = computeCustomerMetrics({
      created_at: c.created_at,
      products: c.products.map((p) => ({
        status: p.status,
        billing_type: p.billing_type,
        monthly_amount: p.monthly_amount,
        ends_at: p.ends_at,
        product: { key: p.product.key },
      })),
      invoices: c.invoices,
    });
    // Drop the heavy invoice array from the list payload.
    const { invoices: _omit, ...rest } = c;
    void _omit;
    return { ...rest, metrics };
  });

  if (productKey) {
    customers = customers.filter((c) =>
      c.products.some((p) => p.product.key === productKey),
    );
  }
  if (status) {
    customers = customers.filter((c) =>
      c.products.some((p) => p.status === status),
    );
  }
  if (multiOnly) {
    customers = customers.filter((c) => c.metrics.productCount > 1);
  }
  if (riskFilter) {
    customers = customers.filter(
      (c) => c.metrics.riskBand === (riskFilter as RiskBand),
    );
  }

  const aggregates = {
    total: customers.length,
    multiProduct: customers.filter((c) => c.metrics.productCount > 1).length,
    totalMrr: customers.reduce((s, c) => s + c.metrics.mrr, 0),
    atRisk: customers.filter((c) => c.metrics.riskBand !== "low").length,
  };

  return NextResponse.json({ customers, aggregates });
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

export const GET = withGuard("endur-customers", GET_);
