"use client";

/**
 * StoreSectionNav — P-STORE (2026-05-16).
 *
 * Right-side vertical nav for the المتجر hub. Mirrors the canonical
 * product-hub side-nav spec exactly (see AGENTS.md / the Endur
 * Console Product Isolation Rule): 140px wide aside · no icons ·
 * 13px font · 36px rows · brand-accent right-edge stripe on active.
 *
 * المتجر is a CROSS-PRODUCT screen (it sells devices for both Amper
 * and Toast/RestoIQ plus shared accessories), so per the rule it
 * stays a top-level sidebar entry — it is NOT nested inside a single
 * product hub. These sections only organise its own catalogue.
 */
import { useScrollSpy } from "./useScrollSpy";

export interface StoreSectionDef {
  id: string;
  label: string;
}

export const STORE_SECTIONS: StoreSectionDef[] = [
  { id: "overview", label: "نظرة عامّة" },
  { id: "amper",    label: "أجهزة امبير" },
  { id: "restoiq",  label: "أجهزة ريستو" },
  { id: "general",  label: "ملحقات عامّة" },
  { id: "orders",   label: "الطلبات" },
];

const ASIDE_WIDTH = 140;

export default function StoreSectionNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    STORE_SECTIONS.map((s) => s.id),
  );

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0"
      style={{
        position: "sticky",
        top: 80,
        width: ASIDE_WIDTH,
        alignSelf: "flex-start",
        paddingTop: 8,
      }}
    >
      <nav className="flex flex-col">
        {STORE_SECTIONS.map((s) => {
          const isActive = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => scrollToSection(e, s.id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: 36,
                paddingInline: 12,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--blue-primary)" : "var(--text-primary)",
                transition: "color 120ms ease",
                textDecoration: "none",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--blue-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: "999px 0 0 999px",
                    background: "var(--blue-primary)",
                  }}
                />
              )}
              <span style={{ flex: 1, whiteSpace: "nowrap" }}>{s.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
