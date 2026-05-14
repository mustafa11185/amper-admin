/**
 * /products/restoiq layout — P-MERGE-2 (2026-05-14).
 *
 * RestoIQ product section inside the Endur company admin. Mirrors
 * the section layout of the RestoIQ manager web (/dashboard) but
 * with a SaaS-admin lens: every section aggregates across **all**
 * RestoIQ tenants instead of showing a single restaurant's data.
 *
 * Auth: any company-admin role can view — per-section sensitive
 * actions (suspend, change marketplace policy, edit AI pools) are
 * gated inside each tab.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RestoTabsStrip from "./_components/RestoTabsStrip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RestoIqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div
      style={{
        padding: "32px 32px 64px",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Section header */}
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
            عدسة SaaS-Admin
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
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
          إدارة موحّدة لمنتج RestoIQ من زاوية شركة اندر. كل قسم يجمّع البيانات
          عبر كل المطاعم المشتركة — مختلف عن لوحة المدير التي تخصّ مطعماً
          واحداً.
        </p>
      </header>

      {/* Tabs strip */}
      <RestoTabsStrip />

      {/* Tab content */}
      <main style={{ marginTop: 24 }}>{children}</main>
    </div>
  );
}
