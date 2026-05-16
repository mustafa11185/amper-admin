/**
 * GET /api/endur-health — P-CO-3.1 (2026-05-16).
 *
 * Platform health (Ops/SRE) for the multi-product operator. Reads
 * only — surfaces a summary that complements the existing
 * /sync-conflicts and /tickets screens (it does not replace them;
 * it links out for detail).
 *
 *   db            : SELECT 1 + measured latency
 *   products[]    : per-product integration health from
 *                   EndurProductEvent + Product registry config
 *   sync          : OfflineSyncQueue counts by status
 *   tickets       : open-ticket ops summary
 *   score / band  : transparent derived health indicator
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const H24 = 24 * 60 * 60 * 1000;
const H72 = 72 * 60 * 60 * 1000;

function band(score: number): "healthy" | "attention" | "critical" {
  if (score >= 85) return "healthy";
  if (score >= 60) return "attention";
  return "critical";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── db latency ──────────────────────────────────────────────────
  let db = { ok: true, latencyMs: 0 };
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    db = { ok: true, latencyMs: Date.now() - t0 };
  } catch {
    db = { ok: false, latencyMs: -1 };
  }

  const now = Date.now();

  const [products, events, sync, tickets] = await Promise.all([
    prisma.product.findMany({
      select: {
        key: true,
        name_ar: true,
        status: true,
        api_base_url: true,
        webhook_secret: true,
      },
      orderBy: { sort_order: "asc" },
    }),
    prisma.endurProductEvent.findMany({
      take: 4000,
      orderBy: { created_at: "desc" },
      select: {
        product_key: true,
        event_type: true,
        external_ref: true,
        processed_at: true,
        error: true,
        created_at: true,
      },
    }),
    prisma.offlineSyncQueue.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.supportTicket.findMany({
      where: { status: { not: "closed" } },
      take: 3000,
      select: {
        priority: true,
        status: true,
        assigned_to: true,
        created_at: true,
      },
    }),
  ]);

  // ── per-product integration ─────────────────────────────────────
  const productHealth = products.map((p) => {
    const evs = events.filter((e) => e.product_key === p.key);
    const last = evs[0]?.created_at ?? null;
    const events24h = evs.filter(
      (e) => now - new Date(e.created_at).getTime() <= H24,
    ).length;
    const backlog = evs.filter((e) => e.processed_at == null && !e.error)
      .length;
    const failed = evs.filter((e) => e.error != null).length;
    const apiConfigured = !!(p.api_base_url && p.webhook_secret);
    return {
      key: p.key,
      name_ar: p.name_ar,
      status: p.status,
      apiConfigured,
      lastEventAt: last,
      events24h,
      backlog,
      failed,
    };
  });

  const recentEvents = events.slice(0, 40).map((e) => ({
    product_key: e.product_key,
    event_type: e.event_type,
    external_ref: e.external_ref,
    state: e.error ? "failed" : e.processed_at ? "processed" : "pending",
    created_at: e.created_at,
  }));

  // ── sync ────────────────────────────────────────────────────────
  const syncByStatus: Record<string, number> = {};
  for (const row of sync) syncByStatus[row.status] = row._count._all;
  const syncProblems =
    (syncByStatus["conflict"] ?? 0) + (syncByStatus["error"] ?? 0);

  // ── tickets ops ─────────────────────────────────────────────────
  const openTickets = tickets.filter((t) => t.status !== "closed");
  const ticketsByPriority: Record<string, number> = {};
  let unassigned = 0;
  let oldestOpenAgeH = 0;
  let agedOpen = 0;
  for (const t of openTickets) {
    ticketsByPriority[t.priority] =
      (ticketsByPriority[t.priority] ?? 0) + 1;
    if (!t.assigned_to) unassigned += 1;
    const ageH = (now - new Date(t.created_at).getTime()) / 3_600_000;
    oldestOpenAgeH = Math.max(oldestOpenAgeH, ageH);
    if (now - new Date(t.created_at).getTime() > H72) agedOpen += 1;
  }

  // ── health score (transparent, capped contributions) ────────────
  const totalBacklog = productHealth.reduce((s, p) => s + p.backlog, 0);
  const totalFailed = productHealth.reduce((s, p) => s + p.failed, 0);
  const misconfigured = productHealth.filter(
    (p) => p.status === "ACTIVE" && !p.apiConfigured,
  ).length;

  let score = 100;
  if (!db.ok) score -= 40;
  score -= Math.min(20, totalBacklog * 2);
  score -= Math.min(25, totalFailed * 5);
  score -= Math.min(20, syncProblems * 3);
  score -= Math.min(15, agedOpen * 2);
  score -= Math.min(20, misconfigured * 10);
  score = Math.max(0, Math.round(score));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    db,
    score,
    band: band(score),
    products: productHealth,
    recentEvents,
    sync: {
      byStatus: syncByStatus,
      problems: syncProblems,
    },
    tickets: {
      open: openTickets.length,
      byPriority: ticketsByPriority,
      unassigned,
      agedOpen,
      oldestOpenAgeH: Math.round(oldestOpenAgeH),
    },
    signals: {
      totalBacklog,
      totalFailed,
      syncProblems,
      misconfigured,
      agedOpen,
    },
  });
}
