"use client";

/**
 * RestoSectionNav — P-AMPER-UX (2026-05-14) · P-FIX-1 (2026-05-14).
 *
 * Right-side vertical nav for the RestoIQ section. P-FIX-1 tightens
 * the spacing to match the RestoIQ manager web's /manage SectionShell
 * exactly: 140px wide aside, no icons, 13px font, 36px row height,
 * brand-accent right-edge stripe on active. The icons + 200px width
 * we shipped in P-AMPER-UX read as too "heavy" next to the content
 * column.
 */
import { useScrollSpy } from "./useScrollSpy";

export interface RestoSectionDef {
  id: string;
  label: string;
  placeholder?: boolean;
}

// P-CO-5.2 (2026-05-16) — economics + risk are REAL sections
// (derived from the Endur-side RESTOIQ subscriptions), inserted
// after المطاعم. Product-scoped per the rule.
export const RESTO_SECTIONS: RestoSectionDef[] = [
  { id: "overview",    label: "نظرة عامّة" },
  { id: "customers",   label: "المطاعم" },
  { id: "economics",   label: "اقتصاد الباقات" },
  { id: "risk",        label: "المطاعم المعرّضة" },
  { id: "branches",    label: "الفروع",           placeholder: true },
  { id: "reports",     label: "التقارير",         placeholder: true },
  { id: "ai",          label: "ذكاء RestoIQ" },
  { id: "marketplace", label: "الماركت بليس",     placeholder: true },
  { id: "payments",    label: "المدفوعات",        placeholder: true },
  { id: "whatsapp",    label: "WhatsApp",         placeholder: true },
  { id: "health",      label: "الصحّة",           placeholder: true },
  { id: "tickets",     label: "التذاكر",          placeholder: true },
];

const ASIDE_WIDTH = 140;

export default function RestoSectionNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    RESTO_SECTIONS.map((s) => s.id),
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
        {RESTO_SECTIONS.map((s) => {
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
              {s.placeholder && !isActive && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  •
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
