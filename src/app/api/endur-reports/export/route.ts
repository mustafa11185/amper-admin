/**
 * CSV export for Endur reports.
 * ?type=invoices  → all paid Endur invoices in period
 * ?type=customers → customer revenue summary in period
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type PeriodKey =
  | "this_month"
  | "last_month"
  | "last_3m"
  | "last_12m"
  | "this_year"
  | "all";

function periodRange(period: PeriodKey): { start: Date | null; end: Date } {
  const end = new Date();
  const now = new Date();
  switch (period) {
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end: lastDay };
    }
    case "last_3m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end };
    case "last_12m":
      return { start: new Date(now.getFullYear(), now.getMonth() - 12, 1), end };
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case "all":
    default:
      return { start: null, end };
  }
}

// CSV escape: quote any cell containing comma, quote, or newline; escape quotes by doubling.
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["super_admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "invoices";
  const period = (url.searchParams.get("period") ?? "this_month") as PeriodKey;
  const { start, end } = periodRange(period);

  let csv = "";
  let filename = "";

  if (type === "invoices") {
    const invoices = await prisma.endurInvoice.findMany({
      where: {
        status: "PAID",
        ...(start ? { paid_at: { gte: start, lte: end } } : {}),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        line_items: { include: { product: { select: { name_ar: true, key: true } } } },
      },
      orderBy: { paid_at: "desc" },
    });

    const rows: string[] = [];
    rows.push(
      csvRow([
        "Invoice Number",
        "Date Issued",
        "Date Paid",
        "Customer",
        "Phone",
        "Products",
        "Subtotal (IQD)",
        "Tax (IQD)",
        "Total (IQD)",
      ])
    );
    for (const inv of invoices) {
      const productsList = Array.from(
        new Set(inv.line_items.map((l) => l.product.name_ar))
      ).join(" + ");
      rows.push(
        csvRow([
          inv.invoice_number,
          inv.issued_at.toISOString().slice(0, 10),
          inv.paid_at?.toISOString().slice(0, 10) ?? "",
          inv.customer.name,
          inv.customer.phone,
          productsList,
          inv.subtotal,
          inv.tax_amount,
          inv.total,
        ])
      );
    }
    csv = rows.join("\n");
    filename = `endur-invoices-${period}-${Date.now()}.csv`;
  } else if (type === "customers") {
    // Revenue summary per Endur customer
    const grouped = await prisma.endurInvoice.groupBy({
      by: ["customer_id"],
      where: {
        status: "PAID",
        ...(start ? { paid_at: { gte: start, lte: end } } : {}),
      },
      _sum: { total: true },
      _count: true,
    });
    const customers = await prisma.endurCustomer.findMany({
      where: { id: { in: grouped.map((g) => g.customer_id) } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        governorate: true,
      },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const rows: string[] = [];
    rows.push(
      csvRow([
        "Customer Name",
        "Phone",
        "Email",
        "Governorate",
        "Invoice Count",
        "Total Revenue (IQD)",
      ])
    );
    for (const g of grouped.sort(
      (a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0)
    )) {
      const c = customerMap.get(g.customer_id);
      if (!c) continue;
      rows.push(
        csvRow([
          c.name,
          c.phone,
          c.email ?? "",
          c.governorate ?? "",
          g._count,
          Number(g._sum.total ?? 0),
        ])
      );
    }
    csv = rows.join("\n");
    filename = `endur-customers-${period}-${Date.now()}.csv`;
  } else {
    return NextResponse.json(
      { error: "Invalid type — use 'invoices' or 'customers'" },
      { status: 400 }
    );
  }

  // BOM so Excel reads UTF-8 (Arabic) correctly
  const body = "﻿" + csv;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
