"use client";

/**
 * AmperSectionNav — P-AMPER-HUB (2026-05-14).
 *
 * Right-side sticky nav for the Amper product hub. Five sections
 * sourced verbatim from the existing top-level routes:
 *   /clients · /plans · /finance · /reports · /app-versions
 *
 * Same shape as RestoSectionNav (RestoIQ hub) so the two products
 * feel identical in navigation.
 */
import {
  Users,
  Gem,
  Banknote,
  BarChart3,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useScrollSpy } from "./useScrollSpy";

export interface AmperSectionDef {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const AMPER_SECTIONS: AmperSectionDef[] = [
  { id: "clients",      label: "العملاء",          Icon: Users },
  { id: "plans",        label: "الباقات",          Icon: Gem },
  { id: "finance",      label: "الإدارة المالية",  Icon: Banknote },
  { id: "reports",      label: "التقارير",         Icon: BarChart3 },
  { id: "app-versions", label: "إصدارات التطبيقات", Icon: Smartphone },
];

const ASIDE_WIDTH = 200;

export default function AmperSectionNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    AMPER_SECTIONS.map((s) => s.id),
  );

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{
        position: "sticky",
        top: 80,
        width: ASIDE_WIDTH,
        alignSelf: "flex-start",
        paddingBlock: 8,
        gap: 2,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          paddingInline: 12,
          marginBottom: 8,
        }}
      >
        أقسام امبير
      </p>
      {AMPER_SECTIONS.map((s) => {
        const isActive = activeId === s.id;
        const Icon = s.Icon;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => scrollToSection(e, s.id)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 14px 9px 16px",
              fontSize: 12.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--blue-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--blue-soft)" : "transparent",
              borderRadius: 10,
              transition: "background 120ms ease, color 120ms ease",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-muted)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 999,
                  background: "var(--blue-primary)",
                }}
              />
            )}
            <Icon size={15} />
            <span style={{ flex: 1, whiteSpace: "nowrap" }}>{s.label}</span>
          </a>
        );
      })}
    </aside>
  );
}
