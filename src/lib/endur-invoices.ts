/**
 * Endur unified invoicing — issue invoices on behalf of "شركة اندر للحلول التقنية"
 * with multi-product line items and an atomic auto-increment number sequence
 * (END-YYYY-NNNNN).
 */
import type { Prisma, PrismaClient } from "@prisma/client";

export interface NewInvoiceLineInput {
  product_id: string;
  description: string;
  quantity?: number;
  unit_price: number;
  source_ref?: string | null;
}

export interface CreateInvoiceInput {
  customer_id: string;
  due_at?: Date | null;
  tax_amount?: number;
  notes?: string | null;
  line_items: NewInvoiceLineInput[];
}

/**
 * Atomically reserve the next invoice number from CompanySettings.
 * Returns the formatted number (e.g. "END-2026-00042").
 *
 * Atomicity: uses a transaction + raw UPDATE … RETURNING to avoid races where
 * two concurrent invoice creations could grab the same sequence value.
 */
export async function reserveNextInvoiceNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const settings = await tx.companySettings.findFirst();
  if (!settings) {
    throw new Error("CompanySettings row missing — run prisma/seed-endur.ts");
  }

  // Atomic increment via raw SQL — RETURNING gives us the value that WAS used.
  const rows = await tx.$queryRawUnsafe<{ invoice_next_seq: number }[]>(
    `UPDATE endur_company_settings
     SET invoice_next_seq = invoice_next_seq + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING invoice_next_seq - 1 AS invoice_next_seq`,
    settings.id
  );
  const usedSeq = rows[0]?.invoice_next_seq;
  if (typeof usedSeq !== "number") {
    throw new Error("Failed to reserve invoice number");
  }

  const year = new Date().getFullYear();
  const padded = String(usedSeq).padStart(5, "0");
  return `${settings.invoice_prefix}-${year}-${padded}`;
}

/**
 * Snapshot the current company info — frozen onto the invoice so historical
 * records stay accurate even if CompanySettings later change.
 */
async function snapshotCompany(tx: Prisma.TransactionClient) {
  const s = await tx.companySettings.findFirst();
  if (!s) return null;
  return {
    name_ar: s.name_ar,
    name_en: s.name_en,
    short_name_ar: s.short_name_ar,
    short_name_en: s.short_name_en,
    registration_no: s.registration_no,
    tax_id: s.tax_id,
    address_ar: s.address_ar,
    address_en: s.address_en,
    city: s.city,
    country: s.country,
    phone: s.phone,
    email: s.email,
    website: s.website,
    bank_name: s.bank_name,
    bank_account_no: s.bank_account_no,
    bank_iban: s.bank_iban,
    bank_swift: s.bank_swift,
    invoice_footer_ar: s.invoice_footer_ar,
    invoice_footer_en: s.invoice_footer_en,
  };
}

async function snapshotCustomer(
  tx: Prisma.TransactionClient,
  customer_id: string
) {
  const c = await tx.endurCustomer.findUnique({ where: { id: customer_id } });
  if (!c) return null;
  return {
    name: c.name,
    contact_name: c.contact_name,
    phone: c.phone,
    email: c.email,
    governorate: c.governorate,
    address: c.address,
  };
}

export async function createEndurInvoice(
  prisma: PrismaClient,
  input: CreateInvoiceInput
) {
  if (!input.line_items.length) {
    throw new Error("Invoice must have at least one line item");
  }
  for (const item of input.line_items) {
    if (item.unit_price < 0) throw new Error("unit_price cannot be negative");
    if ((item.quantity ?? 1) < 1) throw new Error("quantity must be >= 1");
  }

  return prisma.$transaction(async (tx) => {
    const invoice_number = await reserveNextInvoiceNumber(tx);
    const company_snapshot = await snapshotCompany(tx);
    const customer_snapshot = await snapshotCustomer(tx, input.customer_id);

    const subtotal = input.line_items.reduce(
      (sum, l) => sum + l.unit_price * (l.quantity ?? 1),
      0
    );
    const tax_amount = input.tax_amount ?? 0;
    const total = subtotal + tax_amount;

    const invoice = await tx.endurInvoice.create({
      data: {
        invoice_number,
        customer_id: input.customer_id,
        due_at: input.due_at ?? null,
        company_snapshot: company_snapshot ?? undefined,
        customer_snapshot: customer_snapshot ?? undefined,
        subtotal,
        tax_amount,
        total,
        notes: input.notes ?? null,
        line_items: {
          create: input.line_items.map((l, i) => ({
            product_id: l.product_id,
            description: l.description,
            quantity: l.quantity ?? 1,
            unit_price: l.unit_price,
            total: l.unit_price * (l.quantity ?? 1),
            source_ref: l.source_ref ?? null,
            sort_order: i,
          })),
        },
      },
      include: { line_items: { include: { product: true } }, customer: true },
    });

    return invoice;
  });
}

/** Mark invoice paid (records paid_at and updates status). */
export async function markEndurInvoicePaid(
  prisma: PrismaClient,
  invoice_id: string
) {
  return prisma.endurInvoice.update({
    where: { id: invoice_id },
    data: { paid_at: new Date(), status: "PAID" },
  });
}
