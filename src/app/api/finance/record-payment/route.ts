export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, amount, method, reference, notes } = body;

    if (!tenant_id || !amount || !method) {
      return NextResponse.json(
        { error: "tenant_id, amount, and method are required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenant_id,
          amount: Number(amount),
          method,
          reference: reference || null,
          notes: notes || null,
          recorded_by: (session.user as any)?.id || "admin",
        },
      });

      // Find latest unpaid invoice for this tenant
      const unpaidInvoice = await tx.billingInvoice.findFirst({
        where: {
          tenant_id,
          is_paid: false,
        },
        orderBy: { created_at: "desc" },
      });

      // If found and amount >= final_amount, mark as paid
      if (unpaidInvoice && Number(amount) >= Number(unpaidInvoice.final_amount)) {
        await tx.billingInvoice.update({
          where: { id: unpaidInvoice.id },
          data: {
            is_paid: true,
            paid_at: new Date(),
          },
        });

        // Link payment to invoice
        await tx.payment.update({
          where: { id: payment.id },
          data: { invoice_id: unpaidInvoice.id },
        });
      }

      // Extend subscription: from current end date or from now, add 1 month
      const baseDate = tenant.subscription_ends_at && new Date(tenant.subscription_ends_at) > new Date()
        ? new Date(tenant.subscription_ends_at)
        : new Date();
      baseDate.setMonth(baseDate.getMonth() + 1);

      await tx.tenant.update({
        where: { id: tenant_id },
        data: {
          subscription_ends_at: baseDate,
          is_active: true,
          locked_at: null,
        },
      });

      return payment;
    });

    return NextResponse.json({ ok: true, payment: result });
  } catch (error) {
    console.error("[finance/record-payment] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
