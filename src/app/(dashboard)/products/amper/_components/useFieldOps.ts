"use client";

/**
 * useFieldOps — P-CO-4.2 (2026-05-16).
 *
 * The amper hub renders FieldOps/Fuel/Collections as three sibling
 * sections; all three read the same /api/products/amper/field-ops
 * endpoint. A module-scoped promise cache makes them share ONE
 * network call instead of three. Cache is per page-load (cleared on
 * navigation since the module re-evaluates).
 */
import { useEffect, useState } from "react";

export interface FieldOpsData {
  generatedAt: string;
  generators: { total: number; running: number; lowFuel: number };
  maintenance: {
    flagged: number;
    overdue: number;
    list: {
      engineId: string;
      engine: string;
      generator: string;
      runtime: number;
      band: "soon" | "overdue";
      topNeed: string;
      ratioPct: number;
      reasonAr: string;
    }[];
  };
  events: {
    voltageOpen: number;
    overloadOpen: number;
    voltage: {
      type: string;
      voltage: number;
      threshold: number;
      detected_at: string;
    }[];
    overload: {
      excess_pct: number;
      measured_amps: number;
      active_subs_count: number;
      detected_at: string;
    }[];
  };
  fuel: {
    summary: {
      windows: number;
      liters: number;
      cost: number;
      suspicious: number;
    };
    list: {
      generatorId: string;
      windowEnd: string;
      liters: number;
      cost: number;
      lph: number;
      runtimeMin: number;
      drop: number;
      suspicious: boolean;
    }[];
  };
  cash: {
    walletExposure: number;
    unconfirmedCount: number;
    unconfirmedAmount: number;
    topWallets: {
      staffId: string;
      balance: number;
      collected: number;
      delivered: number;
      lastUpdated: string;
    }[];
    distributions: {
      scope_type: string;
      period_month: number;
      period_year: number;
      total_revenue: number;
      net_profit: number;
      is_finalized: boolean;
    }[];
  };
}

let cache: Promise<FieldOpsData> | null = null;

function load(): Promise<FieldOpsData> {
  if (!cache) {
    cache = fetch("/api/products/amper/field-ops").then(async (r) => {
      const t = await r.text();
      const p = t ? JSON.parse(t) : null;
      if (!r.ok) {
        throw new Error(
          (p as { error?: string })?.error ?? `HTTP ${r.status}`,
        );
      }
      return p as FieldOpsData;
    });
  }
  return cache;
}

export function useFieldOps() {
  const [data, setData] = useState<FieldOpsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch((e) =>
        alive && setError(String(e instanceof Error ? e.message : e)),
      );
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
}
