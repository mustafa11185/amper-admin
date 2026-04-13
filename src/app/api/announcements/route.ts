// Broadcast an announcement notification to one tenant or all tenants.
// Creates one notification per tenant (targeting the primary branch).
// super_admin only.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const deny = await requireSuperAdmin();
  if (deny) return deny;

  const body = await req.json();
  const { title, message, target, tenant_id } = body as {
    title?: string;
    message?: string;
    target?: "all" | "one";
    tenant_id?: string;
  };

  if (!title || !message) {
    return NextResponse.json(
      { error: "title and message are required" },
      { status: 400 },
    );
  }
  if (target !== "all" && target !== "one") {
    return NextResponse.json(
      { error: 'target must be "all" or "one"' },
      { status: 400 },
    );
  }
  if (target === "one" && !tenant_id) {
    return NextResponse.json(
      { error: "tenant_id required when target=one" },
      { status: 400 },
    );
  }

  // Pick primary branch for each target tenant.
  const tenantWhere = target === "all" ? { is_active: true } : { id: tenant_id };
  const tenants = await prisma.tenant.findMany({
    where: tenantWhere,
    select: { id: true },
  });

  if (tenants.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: 0 });
  }

  const branches = await prisma.branch.findMany({
    where: { tenant_id: { in: tenants.map((t) => t.id) }, is_active: true },
    orderBy: { created_at: "asc" },
  });

  // Pick the first branch per tenant.
  const primaryByTenant = new Map<string, string>();
  for (const b of branches) {
    if (!primaryByTenant.has(b.tenant_id)) {
      primaryByTenant.set(b.tenant_id, b.id);
    }
  }

  // Unique broadcast id — dedupe the same broadcast from being re-sent.
  const broadcastId = `ann_${Date.now()}`;

  let created = 0;
  let skipped = 0;
  for (const t of tenants) {
    const branch_id = primaryByTenant.get(t.id);
    if (!branch_id) {
      skipped++;
      continue;
    }
    const res = await createNotification({
      tenant_id: t.id,
      branch_id,
      type: "announcement",
      title,
      body: message,
      payload: { broadcast_id: broadcastId, from: "amper_admin" },
      dedupe_key: `${broadcastId}_${t.id}`,
    });
    if (res.created) created++;
    else skipped++;
  }

  return NextResponse.json({
    ok: true,
    broadcast_id: broadcastId,
    created,
    skipped,
    total_tenants: tenants.length,
  });
}
