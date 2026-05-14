"use client";

/**
 * RestoSectionNav — P-AMPER-UX (2026-05-14).
 *
 * Right-side vertical nav for the RestoIQ section (RTL: the
 * "side" we want is the inline-start of the content column).
 * Replaces the earlier horizontal RestoTabsStrip when the section
 * switched to a single-page-with-scroll-spy layout.
 *
 * Pattern matches the RestoIQ manager web's SectionShell aside:
 * sticky, compact, brand-accent active marker, click triggers a
 * smooth scroll, the scroll listener flips the active item back
 * when the user scrolls manually.
 */
import {
  LayoutDashboard,
  Users,
  MapPin,
  BarChart3,
  Sparkles,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  AlertTriangle,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useScrollSpy } from "./useScrollSpy";

export interface RestoSectionDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  placeholder?: boolean;
}

export const RESTO_SECTIONS: RestoSectionDef[] = [
  { id: "overview",    label: "نظرة عامّة",       Icon: LayoutDashboard },
  { id: "customers",   label: "المطاعم",          Icon: Users },
  { id: "branches",    label: "الفروع",           Icon: MapPin,        placeholder: true },
  { id: "reports",     label: "التقارير",         Icon: BarChart3,     placeholder: true },
  { id: "ai",          label: "ذكاء RestoIQ",      Icon: Sparkles },
  { id: "marketplace", label: "الماركت بليس",     Icon: ShoppingBag,   placeholder: true },
  { id: "payments",    label: "المدفوعات",        Icon: CreditCard,    placeholder: true },
  { id: "whatsapp",    label: "WhatsApp",         Icon: MessageCircle, placeholder: true },
  { id: "health",      label: "الصحّة",           Icon: AlertTriangle, placeholder: true },
  { id: "tickets",     label: "التذاكر",          Icon: Ticket,        placeholder: true },
];

const ASIDE_WIDTH = 200;

export default function RestoSectionNav() {
  const { activeId, scrollToSection } = useScrollSpy(
    RESTO_SECTIONS.map((s) => s.id),
  );

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{
        position: "sticky",
        top: 80, // below the DashboardShell's sticky top bar
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
        أقسام ريستو
      </p>
      {RESTO_SECTIONS.map((s) => {
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
            {/* Right-edge brand stripe when active (RTL — visually
                right in the content column). */}
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
            {s.placeholder && !isActive && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 999,
                  background: "var(--bg-muted)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                قريباً
              </span>
            )}
          </a>
        );
      })}
    </aside>
  );
}
