export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// GET — current overrides for this tenant
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { feature_overrides: true, plan: true },
  })
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    plan: tenant.plan,
    feature_overrides: tenant.feature_overrides,
  })
}

// PUT — replace the entire overrides array
// Body: { feature_overrides: ["fuel_theft_detection", "voltage_monitoring", ...] }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { feature_overrides } = await req.json()

  if (!Array.isArray(feature_overrides)) {
    return NextResponse.json({ error: "feature_overrides must be an array" }, { status: 400 })
  }

  const existing = await prisma.tenant.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id },
      data: { feature_overrides },
    })

    // Log the change
    await tx.planChangeLog.create({
      data: {
        tenant_id: id,
        changed_by: (session.user as any).id || "system",
        change_type: "feature_override",
        from_plan: existing.plan,
        to_plan: existing.plan,
        notes: `Overrides set: ${feature_overrides.join(", ") || "(none)"}`,
      },
    })
  })

  return NextResponse.json({ ok: true, feature_overrides })
}
