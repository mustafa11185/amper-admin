"use client";

/**
 * /products/amper — P-AMPER-HUB (2026-05-14).
 *
 * Amper product hub — single-page with five sections sourced
 * verbatim from the existing top-level routes. Each section
 * imports the page component and renders it inline; we don't
 * duplicate the page logic.
 *
 * Why import-as-component instead of refactor-into-section:
 *   The five pages total ~5,700 lines (clients 1431, plans 537,
 *   finance 2615, reports 748, app-versions 368). Rewriting them
 *   as sections would be a high-risk, high-cost refactor. Instead,
 *   we render them in place — Next.js client pages are just React
 *   components and play nicely when imported.
 *
 * Trade-off: all five queries fire on mount. For typical
 * dashboards this is acceptable (the operator opens this view to
 * look at everything anyway). If load latency becomes a problem
 * we can lazy-load with `next/dynamic` per section.
 *
 * The five original routes (/clients, /plans, /finance, /reports,
 * /app-versions) STAY ACCESSIBLE at their URLs. Only the sidebar
 * top-level entries are consolidated into this hub. Bookmarks,
 * deep links, and inter-page navigation continue to work.
 */
export const dynamic = "force-dynamic";

import AmperSectionNav, { AMPER_SECTIONS } from "./_components/AmperSectionNav";

import ClientsPage from "../../clients/page";
import PlansPage from "../../plans/page";
import FinancePage from "../../finance/page";
import ReportsPage from "../../reports/page";
import AppVersionsPage from "../../app-versions/page";
// P-CO-4.2 (2026-05-16) — field-ops sections (product-scoped).
import FieldOpsSection from "./_components/FieldOpsSection";
import FuelSection from "./_components/FuelSection";
import CollectionsSection from "./_components/CollectionsSection";
// P-AI-4 (2026-05-16) — ذكاء امبير collections priority.
import CollectionsPrioritySection from "./_components/CollectionsPrioritySection";

// Map section id → component. Order = render order.
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  clients:        ClientsPage,
  "field-ops":    FieldOpsSection,
  fuel:           FuelSection,
  collections:    CollectionsSection,
  "collections-priority": CollectionsPrioritySection,
  plans:          PlansPage,
  finance:        FinancePage,
  reports:        ReportsPage,
  "app-versions": AppVersionsPage,
};

export default function AmperHubPage() {
  return (
    <div
      style={{
        padding: "32px 32px 64px",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Hub header */}
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
              background: "#FEF3C7",
              color: "#B45309",
            }}
          >
            AMPER PRODUCT
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            ٩ أقسام · لوحة الشركة
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
          ⚡ امبير — لوحة المنتج
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          إدارة موحّدة لمنتج Amper — عملاء، باقات، إدارة ماليّة، تقارير،
          وإصدارات التطبيقات في صفحة واحدة. مرّر للأسفل لاستعراض الأقسام،
          أو استخدم القائمة الجانبيّة للقفز السريع.
        </p>
      </header>

      {/* Two-column grid: side nav + content stream.
          P-FIX-1: gap tightened 28→20, section heading simplified to
          a single h2 to match the RestoIQ manager web's compact
          SectionShell. */}
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        <AmperSectionNav />

        <div style={{ flex: 1, minWidth: 0 }}>
          {AMPER_SECTIONS.map((s, i) => {
            const Component = SECTION_COMPONENTS[s.id];
            if (!Component) return null;
            return (
              <section
                key={s.id}
                id={s.id}
                style={{
                  scrollMarginTop: 80,
                  marginBottom: i === AMPER_SECTIONS.length - 1 ? 0 : 40,
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

                {/* The imported page component renders its own
                    padding + max-width. We let it; the section
                    wrapper just adds the anchor + heading. */}
                <Component />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
