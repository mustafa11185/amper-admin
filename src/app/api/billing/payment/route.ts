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
    const { tenant_id, invoice_id, amount, method, reference, notes } = body;

    if (!tenant_id || !amount || !method) {
      return NextResponse.json(
        { error: "tenant_id, amount, and method are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenant_id,
          invoice_id: invoice_id || null,
          amount,
          method,
          reference: reference || null,
          notes: notes || null,
          recorded_by: (session.user as any).id || null,
        },
      });

      // If invoice_id is provided, update the BillingInvoice
      if (invoice_id) {
        const invoice = await tx.billingInvoice.findUnique({
          where: { id: invoice_id },
        });

        if (invoice) {
          const newPaidStatus =
            Number(invoice.final_amount) <= Number(amount);

          await tx.billingInvoice.update({
            where: { id: invoice_id },
            data: {
              is_paid: newPaidStatus,
              paid_at: newPaidStatus ? new Date() : invoice.paid_at,
            },
          });
        }
      }

      return payment;
    });

    return NextResponse.json({ payment: result }, { status: 201 });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
