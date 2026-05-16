/**
 * GET /api/products/amper/field-ops — P-CO-4.1 (2026-05-16).
 *
 * Amper field operations, company lens (aggregated across all Amper
 * tenants — the operator view, like /clients). Three blocks:
 *   field : generator/engine status + ذكاء امبير predictive
 *           maintenance + unresolved voltage/overload events
 *   fuel  : recent fuel consumption + theft/anomaly signal
 *   cash  : collector wallet exposure + unconfirmed deliveries +
 *           latest profit distributions
 *
 * Read-only, bounded. The maintenance scorer is deterministic and
 * explainable (no LLM, no vendor name — UI shows «ذكاء امبير»);
 * an LLM layer can wrap it later behind an env flag.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const num = (d: unknown): number => Number(d ?? 0);

type Band = "ok" | "soon" | "overdue";
function bandOf(ratio: number): Band {
  if (ratio >= 1) return "overdue";
  if (ratio >= 0.85) return "soon";
  return "ok";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    generators,
    engines,
    voltageOpen,
    overloadOpen,
    fuelRows,
    wallets,
    unconfirmedDeliveries,
    distributions,
  ] = await Promise.all([
    prisma.generator.findMany({
      take: 4000,
      select: {
        id: true,
        name: true,
        is_active: true,
        run_status: true,
        fuel_level_pct: true,
        last_fuel_update: true,
      },
    }),
    prisma.engine.findMany({
      take: 5000,
      select: {
        id: true,
        name: true,
        oil_change_hours: true,
        air_filter_hours: true,
        full_service_hours: true,
        runtime_hours: true,
        hours_at_last_oil: true,
        hours_at_last_filter: true,
        hours_at_last_service: true,
        last_oil_change_at: true,
        generator: { select: { name: true } },
      },
    }),
    prisma.voltageEvent.findMany({
      where: { is_resolved: false },
      take: 200,
      orderBy: { detected_at: "desc" },
      select: {
        type: true,
        voltage: true,
        threshold: true,
        detected_at: true,
        generator_id: true,
      },
    }),
    prisma.overloadEvent.findMany({
      where: { is_resolved: false },
      take: 200,
      orderBy: { detected_at: "desc" },
      select: {
        excess_pct: true,
        measured_amps: true,
        active_subs_count: true,
        detected_at: true,
        generator_id: true,
      },
    }),
    prisma.fuelConsumption.findMany({
      take: 300,
      orderBy: { window_end: "desc" },
      select: {
        generator_id: true,
        window_start: true,
        window_end: true,
        fuel_pct_start: true,
        fuel_pct_end: true,
        liters_consumed: true,
        cost_iqd: true,
        runtime_minutes: true,
        liters_per_hour: true,
      },
    }),
    prisma.collectorWallet.findMany({
      take: 2000,
      orderBy: { balance: "desc" },
      select: {
        staff_id: true,
        balance: true,
        total_collected: true,
        total_delivered: true,
        last_updated: true,
      },
    }),
    prisma.deliveryRecord.findMany({
      where: { is_confirmed: false },
      take: 2000,
      select: { amount: true },
    }),
    prisma.profitDistribution.findMany({
      take: 12,
      orderBy: [{ period_year: "desc" }, { period_month: "desc" }],
      select: {
        scope_type: true,
        period_month: true,
        period_year: true,
        total_revenue: true,
        net_profit: true,
        is_finalized: true,
      },
    }),
  ]);

  // ── ذكاء امبير — predictive maintenance ─────────────────────────
  const maintenance = engines
    .map((e) => {
      const runtime = num(e.runtime_hours);
      const sinceOil = runtime - num(e.hours_at_last_oil);
      const sinceFilter = runtime - num(e.hours_at_last_filter);
      const sinceService = runtime - num(e.hours_at_last_service);
      const items = [
        {
          kind: "تغيير زيت",
          ratio: e.oil_change_hours > 0 ? sinceOil / e.oil_change_hours : 0,
          since: sinceOil,
          limit: e.oil_change_hours,
        },
        {
          kind: "فلتر هواء",
          ratio:
            e.air_filter_hours > 0 ? sinceFilter / e.air_filter_hours : 0,
          since: sinceFilter,
          limit: e.air_filter_hours,
        },
        {
          kind: "صيانة شاملة",
          ratio:
            e.full_service_hours > 0
              ? sinceService / e.full_service_hours
              : 0,
          since: sinceService,
          limit: e.full_service_hours,
        },
      ];
      const worst = items.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      const band = bandOf(worst.ratio);
      return {
        engineId: e.id,
        engine: e.name,
        generator: e.generator?.name ?? "—",
        runtime: Math.round(runtime),
        band,
        topNeed: worst.kind,
        ratioPct: Math.round(worst.ratio * 100),
        reasonAr:
          band === "overdue"
            ? `${worst.kind} متجاوز: ${Math.round(worst.since)} ساعة تشغيل منذ آخر مرّة (الحدّ ${worst.limit})`
            : band === "soon"
              ? `${worst.kind} يقترب: ${Math.round(worst.since)}/${worst.limit} ساعة`
              : "ضمن الجدول",
      };
    })
    .filter((m) => m.band !== "ok")
    .sort((a, b) => b.ratioPct - a.ratioPct);

  const genTotal = generators.length;
  const genRunning = generators.filter((g) => g.run_status).length;
  const genLowFuel = generators.filter(
    (g) => g.fuel_level_pct != null && g.fuel_level_pct < 15,
  ).length;

  // ── fuel anomaly / theft signal ─────────────────────────────────
  const fuel = fuelRows.map((f) => {
    const drop = f.fuel_pct_start - f.fuel_pct_end;
    const lph = f.liters_per_hour ?? 0;
    // Suspicious = meaningful fuel drop with little/no runtime, or an
    // implausibly high burn rate.
    const suspicious =
      (drop > 10 && f.runtime_minutes < 30) || lph > 10;
    return {
      generatorId: f.generator_id,
      windowEnd: f.window_end,
      liters: Math.round(num(f.liters_consumed) * 10) / 10,
      cost: num(f.cost_iqd),
      lph: Math.round(lph * 10) / 10,
      runtimeMin: f.runtime_minutes,
      drop: Math.round(drop * 10) / 10,
      suspicious,
    };
  });
  const fuelSummary = {
    windows: fuel.length,
    liters: Math.round(fuel.reduce((s, f) => s + f.liters, 0)),
    cost: Math.round(fuel.reduce((s, f) => s + f.cost, 0)),
    suspicious: fuel.filter((f) => f.suspicious).length,
  };

  // ── cash exposure ───────────────────────────────────────────────
  const walletExposure = wallets.reduce((s, w) => s + num(w.balance), 0);
  const topWallets = wallets.slice(0, 12).map((w) => ({
    staffId: w.staff_id,
    balance: num(w.balance),
    collected: num(w.total_collected),
    delivered: num(w.total_delivered),
    lastUpdated: w.last_updated,
  }));
  const unconfirmedAmount = unconfirmedDeliveries.reduce(
    (s, d) => s + num(d.amount),
    0,
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    generators: {
      total: genTotal,
      running: genRunning,
      lowFuel: genLowFuel,
    },
    maintenance: {
      flagged: maintenance.length,
      overdue: maintenance.filter((m) => m.band === "overdue").length,
      list: maintenance.slice(0, 30),
    },
    events: {
      voltageOpen: voltageOpen.length,
      overloadOpen: overloadOpen.length,
      voltage: voltageOpen.slice(0, 15),
      overload: overloadOpen.slice(0, 15),
    },
    fuel: { summary: fuelSummary, list: fuel.slice(0, 25) },
    cash: {
      walletExposure,
      unconfirmedCount: unconfirmedDeliveries.length,
      unconfirmedAmount,
      topWallets,
      distributions,
    },
  });
}
