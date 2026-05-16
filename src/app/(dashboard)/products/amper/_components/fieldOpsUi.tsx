"use client";

/** Shared UI primitives for the amper field-ops sections — P-CO-4.2. */
import { Loader2, AlertCircle } from "lucide-react";

export function FOLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <Loader2
        size={26}
        color="var(--blue-primary)"
        style={{ animation: "spin 1s linear infinite" }}
      />
    </div>
  );
}

export function FOError({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 12,
        padding: 20,
        textAlign: "center",
        color: "#B91C1C",
        fontWeight: 700,
      }}
    >
      <AlertCircle size={24} style={{ display: "block", margin: "0 auto 8px" }} />
      {message}
    </div>
  );
}

export function FOKpi({
  label,
  value,
  tone = "var(--text-primary)",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-rajdhani)",
          fontSize: 22,
          fontWeight: 800,
          color: tone,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function FOCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

export function FOEmpty({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl py-8 text-center"
      style={{
        background: "var(--bg-surface)",
        border: "1px dashed var(--border)",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

export function iqd(n: number): string {
  return new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";
}
export function dt(d: string): string {
  return new Date(d).toLocaleString("ar-IQ", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
