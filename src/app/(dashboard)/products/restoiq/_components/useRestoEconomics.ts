"use client";

/**
 * useRestoEconomics — P-CO-5.2 (2026-05-16).
 *
 * EconomicsSection + RiskSection both read
 * /api/products/restoiq/economics. Module-scoped promise cache so
 * the two sibling sections share ONE network call (per page-load).
 */
import { useEffect, useState } from "react";

export interface RestoEconomics {
  empty?: boolean;
  note?: string;
  generatedAt: string;
  totals: {
    restaurants: number;
    subscriptions: number;
    mrr: number;
    arpu: number;
    activeRecurring: number;
  };
  statusCounts: Record<string, number>;
  planCounts: Record<string, number>;
  mrrByPlan: Record<string, number>;
  atRisk: {
    total: number;
    high: number;
    list: {
      customerId: string;
      name: string;
      band: "high" | "medium";
      reasonsAr: string[];
      monthly: number;
    }[];
  };
}

let cache: Promise<RestoEconomics> | null = null;

function load(): Promise<RestoEconomics> {
  if (!cache) {
    cache = fetch("/api/products/restoiq/economics").then(async (r) => {
      const t = await r.text();
      const p = t ? JSON.parse(t) : null;
      if (!r.ok) {
        throw new Error(
          (p as { error?: string })?.error ?? `HTTP ${r.status}`,
        );
      }
      return p as RestoEconomics;
    });
  }
  return cache;
}

export function useRestoEconomics() {
  const [data, setData] = useState<RestoEconomics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch(
        (e) => alive && setError(String(e instanceof Error ? e.message : e)),
      );
    return () => {
      alive = false;
    };
  }, []);

  return { data, error };
}
