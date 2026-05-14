export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: { sort_order: "asc" },
  });

  // For each product, compute live metrics. AMPER reads from existing Tenant
  // table; RESTOIQ/BARQ read from ProductCustomer (empty until integrated).
  const enriched = await Promise.all(
    products.map(async (p) => {
      let customer_count = 0;
      let active_count = 0;
      let mrr = 0;

      if (p.key === "AMPER") {
        const [total, active, plans] = await Promise.all([
          prisma.tenant.count(),
          prisma.tenant.count({ where: { is_active: true } }),
          prisma.tenant.groupBy({
            by: ["plan"],
            where: { is_active: true, is_trial: false },
            _count: true,
          }),
        ]);
        customer_count = total;
        active_count = active;

        // MRR estimate from Plan.price_monthly × active tenants per plan
        const planRows = await prisma.plan.findMany({
          where: { is_active: true },
          select: { id: true, price_monthly: true },
        });
        const priceByPlan = Object.fromEntries(
          planRows.map((pl) => [pl.id, pl.price_monthly])
        );
        for (const row of plans) {
          const price = priceByPlan[row.plan as string] ?? 0;
          mrr += price * row._count;
        }
      } else {
        const subs = await prisma.productCustomer.findMany({
          where: { product_id: p.id, status: "active" },
          select: { monthly_amount: true },
        });
        customer_count = subs.length;
        active_count = subs.length;
        mrr = subs.reduce((acc, s) => acc + (s.monthly_amount ?? 0), 0);
      }

      return {
        id: p.id,
        key: p.key,
        name_ar: p.name_ar,
        name_en: p.name_en,
        tagline_ar: p.tagline_ar,
        tagline_en: p.tagline_en,
        description_ar: p.description_ar,
        color: p.color,
        icon: p.icon,
        status: p.status,
        sort_order: p.sort_order,
        customer_count,
        active_count,
        mrr,
      };
    })
  );

  return NextResponse.json({ products: enriched });
}
