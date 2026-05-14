export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    // Create defaults from schema if missing
    settings = await prisma.companySettings.create({ data: {} });
  }

  return NextResponse.json({ settings });
}

const EDITABLE_FIELDS = [
  "name_ar",
  "name_en",
  "short_name_ar",
  "short_name_en",
  "tagline_ar",
  "tagline_en",
  "registration_no",
  "tax_id",
  "address_ar",
  "address_en",
  "city",
  "country",
  "phone",
  "email",
  "website",
  "logo_url",
  "signature_url",
  "invoice_prefix",
  "bank_name",
  "bank_account_no",
  "bank_iban",
  "bank_swift",
  "invoice_footer_ar",
  "invoice_footer_en",
] as const;

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super_admin can edit company settings" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  data.updated_by = session.user.id;

  const existing = await prisma.companySettings.findFirst();
  const settings = existing
    ? await prisma.companySettings.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.companySettings.create({ data });

  return NextResponse.json({ settings });
}
