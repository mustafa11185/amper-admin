"use client";

/**
 * /products/restoiq — P-AMPER-UX (2026-05-14).
 *
 * Single-page-with-scroll-spy layout, matching the RestoIQ manager
 * web's /dashboard pattern. All 10 sections render stacked in one
 * scrollable column with a sticky right-side nav (RestoSectionNav)
 * that highlights the section currently in view and supports
 * smooth-scroll-on-click.
 *
 * Previously: 10 sub-routes with horizontal tab navigation
 * (RestoTabsStrip). Switched at user request so the UX matches the
 * manager web (the operator moves between products and expects
 * the same scrolling behaviour everywhere).
 */
export const dynamic = "force-dynamic";

import RestoSectionNav, { RESTO_SECTIONS } from "./_components/RestoSectionNav";
import OverviewSection from "./_components/OverviewSection";
import CustomersSection from "./_components/CustomersSection";
import BranchesSection from "./_components/BranchesSection";
import ReportsSection from "./_components/ReportsSection";
import AiSection from "./_components/AiSection";
import MarketplaceSection from "./_components/MarketplaceSection";
import PaymentsSection from "./_components/PaymentsSection";
import WhatsAppSection from "./_components/WhatsAppSection";
import HealthSection from "./_components/HealthSection";
import TicketsSection from "./_components/TicketsSection";

// Map section id → component. Order here = render order down the page.
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  overview:    OverviewSection,
  customers:   CustomersSection,
  branches:    BranchesSection,
  reports:     ReportsSection,
  ai:          AiSection,
  marketplace: MarketplaceSection,
  payments:    PaymentsSection,
  whatsapp:    WhatsAppSection,
  health:      HealthSection,
  tickets:     TicketsSection,
};

export default function RestoIqPage() {
  return (
    <div
      style={{
        padding: "32px 32px 64px",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Section header (kept above the two-column grid). */}
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 4,
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            RESTOIQ PRODUCT
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            عدسة SaaS-Admin · ١٠ أقسام
          </span>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          🍴 ريستو — لوحة الشركة
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          إدارة موحّدة لمنتج RestoIQ من زاوية شركة اندر. كل قسم يجمّع البيانات
          عبر كل المطاعم المشتركة. مرّر للأسفل لاستعراض الأقسام، أو استخدم
          القائمة الجانبيّة للقفز السريع.
        </p>
      </header>

      {/* Two-column grid: side nav + content stream.
          P-FIX-1: gap tightened 28→20, section heading simplified to
          a single h2 (no numbered badge) to match the RestoIQ
          manager web's /manage compact SectionShell. */}
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        <RestoSectionNav />

        <div style={{ flex: 1, minWidth: 0 }}>
          {RESTO_SECTIONS.map((s, i) => {
            const Component = SECTION_COMPONENTS[s.id];
            if (!Component) return null;
            return (
              <section
                key={s.id}
                id={s.id}
                style={{
                  scrollMarginTop: 80,
                  marginBottom: i === RESTO_SECTIONS.length - 1 ? 0 : 40,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    marginBottom: 12,
                  }}
                >
                  {s.label}
                </h2>
                <Component />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
