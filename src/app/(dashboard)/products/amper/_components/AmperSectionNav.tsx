"use client";

/**
 * AmperSectionNav — P-AMPER-HUB (2026-05-14) · P-FIX-1 (2026-05-14).
 *
 * P-FIX-1 brings the spacing in line with the RestoIQ manager web's
 * /manage SectionShell: 140px wide, no icons, 13px font, 36px rows,
 * right-edge brand stripe on active item. Matches the RestoIQ hub's
 * post-fix nav so both products feel identical.
 */
import { useScrollSpy } from "./useScrollSpy";

export interface AmperSectionDef {
  id: string;
  label: string;
}

// P-CO-4.2 (2026-05-16) — three field-ops sections added after
// العملاء (operational priority). Product-scoped per the rule.
export const AMPER_SECTIONS: AmperSectionDef[] = [
  { id: "clients",      label: "العملاء" },
  { id: "field-ops",    label: "العمليات الميدانيّة" },
  { id: "fuel",         label: "الوقود والطاقة" },
  { id: "collections",  label: "الجباية والشركاء" },
  { id: "plans",        label: "الباقات" },
  { id: "finance",      label: "الإدارة المالية" },
  { id: "reports",      label: "التقارير" },
  { id: "app-versions", label: "إصدارات التطبيقات" },
];

const ASIDE_WIDTH = 140;

export default function AmperSectionNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    AMPER_SECTIONS.map((s) => s.id),
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
        {AMPER_SECTIONS.map((s) => {
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
              <span style={{ whiteSpace: "nowrap" }}>{s.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
