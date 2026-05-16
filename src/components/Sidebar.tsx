"use client";

/**
 * Sidebar — P-AMPER-UX (2026-05-14).
 *
 * Hover-expand rail: 64px collapsed (icons only), 240px on hover.
 * Mirrors the RestoIQ manager web pattern so an operator moving
 * between products sees consistent navigation behaviour.
 *
 * RTL layout: the rail sits on the page's right edge
 * (inset-inline-start === right side in RTL). The expanded panel
 * floats over content via box-shadow rather than reflowing the
 * layout, so the main column stays stable.
 *
 * The outer wrapper reserves exactly 64px of width via flex-shrink-0
 * + a fixed width; the inner <aside> absolutely-positions itself so
 * its width animation doesn't fight the layout.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  UserCog,
  RefreshCcw,
  ShoppingCart,
  Settings,
  LogOut,
  Inbox,
  Megaphone,
  CreditCard,
  Boxes,
  Building2,
  FileText,
  TrendingUp,
  UtensilsCrossed,
  Zap,
  Users,
  LineChart,
} from "lucide-react";
import { EndurIcon } from "./EndurLogo";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: boolean;
  /** matchPrefixes activates the item even if pathname.startsWith one of these. */
  matchPrefixes?: string[];
}

// P-AMPER-HUB (2026-05-14) — the five Amper-specific entries
// (Clients · Plans · Finance · Reports · App Versions) consolidated
// into the new /products/amper hub. Their standalone routes still
// resolve at their old URLs so bookmarks keep working; only the
// sidebar entries are removed.
const navItems: NavItem[] = [
  { label: "الرئيسية",          href: "/dashboard",         icon: <LayoutDashboard size={20} />, roles: ["super_admin", "sales", "support", "accountant"] },
  { label: "المنتجات",          href: "/products",          icon: <Boxes size={20} />,           roles: ["super_admin", "sales", "support", "accountant"] },
  { label: "⚡ امبير",          href: "/products/amper",    icon: <Zap size={20} />,             roles: ["super_admin", "sales", "support", "accountant"], matchPrefixes: ["/products/amper", "/clients", "/plans", "/finance", "/reports", "/app-versions"] },
  { label: "🍴 ريستو",          href: "/products/restoiq",  icon: <UtensilsCrossed size={20} />, roles: ["super_admin", "sales", "support", "accountant"], matchPrefixes: ["/products/restoiq"] },
  // P-CO-1.2 (2026-05-16) — unified cross-product customer hub.
  // Company-level per the Product Isolation Rule (one customer may
  // own Amper + RestoIQ + BARQ), so it is a top-level entry, NOT a
  // product-hub section.
  { label: "🎯 عملاء اندر",      href: "/endur-customers",   icon: <Users size={20} />,           roles: ["super_admin", "sales", "accountant"], matchPrefixes: ["/endur-customers"] },
  // P-CO-2.2 (2026-05-16) — forward-looking financial command
  // (MRR/ARR · subscription movement · AR aging · exec brief).
  // Cross-product company surface → top-level per the rule.
  { label: "📈 النموّ والإيرادات", href: "/endur-growth",      icon: <LineChart size={20} />,       roles: ["super_admin", "sales", "accountant"], matchPrefixes: ["/endur-growth"] },
  { label: "صندوق الطلبات",      href: "/leads",             icon: <Inbox size={20} />,           roles: ["super_admin", "sales"], badge: true },
  // P-RULE-1 (2026-05-16) — legacy "الفواتير (Amper)" → /billing removed
  // from the sidebar. Per the Product Isolation Rule, invoices are
  // company-level (Endur issues them) and product-tagged, not a
  // separate Amper-only screen. The unified "فواتير اندر" below is
  // the single source; product context flows via deep-links. The
  // /billing route still resolves for old bookmarks.
  { label: "فواتير اندر",       href: "/endur-invoices",    icon: <FileText size={20} />,        roles: ["super_admin", "sales", "accountant"] },
  { label: "إدارة الاشتراكات",   href: "/saas-billing",      icon: <CreditCard size={20} />,      roles: ["super_admin", "sales", "accountant", "support"] },
  { label: "التذاكر",           href: "/tickets",           icon: <Ticket size={20} />,          roles: ["super_admin", "support"], badge: true },
  { label: "تقارير اندر",       href: "/endur-reports",     icon: <TrendingUp size={20} />,      roles: ["super_admin", "accountant"] },
  { label: "الفريق",            href: "/team",              icon: <UserCog size={20} />,         roles: ["super_admin"] },
  { label: "تعارضات المزامنة",   href: "/sync-conflicts",    icon: <RefreshCcw size={20} />,      roles: ["super_admin"] },
  { label: "المتجر",            href: "/store-manager",     icon: <ShoppingCart size={20} />,    roles: ["super_admin"] },
  { label: "الإعلانات",         href: "/announcements",     icon: <Megaphone size={20} />,       roles: ["super_admin"] },
  { label: "بيانات الشركة",      href: "/settings/company",  icon: <Building2 size={20} />,       roles: ["super_admin"] },
  { label: "الإعدادات",         href: "/settings",          icon: <Settings size={20} />,        roles: ["super_admin"] },
];

const RAIL_W = 64;
const PANEL_W = 240;

interface SidebarProps {
  userRole: string;
  userName: string;
}

export default function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    // Outer container reserves the rail width so content layout is
    // stable regardless of hover state. The expanded panel inside is
    // absolutely positioned so it floats over content on hover.
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative shrink-0"
      style={{ width: RAIL_W, zIndex: 40 }}
    >
      <aside
        className="fixed top-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          right: 0,
          width: hover ? PANEL_W : RAIL_W,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          transition:
            "width 220ms cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 220ms ease",
          boxShadow: hover ? "-4px 0 24px rgba(0, 0, 0, 0.10)" : "none",
        }}
      >
        {/* ENDURTECH brand header */}
        <div
          className="flex items-center gap-3 px-3 py-5"
          style={{ minHeight: 72 }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: RAIL_W - 24, height: 40 }}
          >
            <EndurIcon size={32} variant="light" />
          </div>
          <div
            className="overflow-hidden whitespace-nowrap"
            style={{
              maxWidth: hover ? 180 : 0,
              opacity: hover ? 1 : 0,
              transition:
                "max-width 220ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 140ms ease 80ms",
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-outfit), 'Inter', sans-serif",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: "-0.02em",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>ENDUR</span>
              <span style={{ color: "var(--brand-teal)" }}>TECH</span>
            </span>
            <span
              className="block"
              style={{
                fontFamily: "var(--font-outfit), 'Inter', sans-serif",
                color: "var(--brand-teal)",
                fontSize: 9,
                letterSpacing: "0.18em",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              CONSOLE · IRAQ
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingInline: 8,
            paddingBottom: 8,
            scrollbarWidth: "thin",
          }}
        >
          <div className="flex flex-col" style={{ gap: 2 }}>
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/") ||
                item.matchPrefixes?.some((p) => pathname.startsWith(p));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!hover ? item.label : undefined}
                  className="relative flex items-center rounded-xl transition-colors"
                  style={{
                    height: 40,
                    paddingInline: hover ? 12 : 0,
                    justifyContent: hover ? "flex-start" : "center",
                    gap: 12,
                    background: isActive ? "var(--blue-soft)" : "transparent",
                    color: isActive
                      ? "var(--blue-primary)"
                      : "var(--text-secondary)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    width: hover ? "auto" : RAIL_W - 16,
                  }}
                >
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
                    {item.icon}
                  </span>
                  <span
                    className="whitespace-nowrap overflow-hidden"
                    style={{
                      maxWidth: hover ? 180 : 0,
                      opacity: hover ? 1 : 0,
                      transition:
                        "max-width 220ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 140ms ease 80ms",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="absolute rounded-full"
                      style={{
                        background: "var(--danger)",
                        width: 6,
                        height: 6,
                        // When collapsed, dot sits on top-right of the icon.
                        // When expanded, dot stays right of the label.
                        top: hover ? "50%" : 8,
                        left: hover ? 10 : "auto",
                        right: hover ? "auto" : 14,
                        transform: hover ? "translateY(-50%)" : "none",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User + Sign out */}
        <div
          className="border-t"
          style={{
            borderColor: "var(--border)",
            paddingInline: 8,
            paddingBlock: 12,
          }}
        >
          <div
            className="flex items-center gap-3 mb-2"
            style={{
              paddingInline: hover ? 12 : 0,
              justifyContent: hover ? "flex-start" : "center",
            }}
          >
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
              style={{ width: 32, height: 32, background: "var(--blue-primary)" }}
            >
              {userName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div
              className="overflow-hidden whitespace-nowrap"
              style={{
                maxWidth: hover ? 160 : 0,
                opacity: hover ? 1 : 0,
                transition:
                  "max-width 220ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 140ms ease 80ms",
              }}
            >
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {userName}
              </p>
              <p
                className="text-[10.5px]"
                style={{ color: "var(--text-muted)" }}
              >
                {userRole === "super_admin"
                  ? "مدير عام"
                  : userRole === "sales"
                    ? "مبيعات"
                    : userRole === "support"
                      ? "دعم فني"
                      : "محاسب"}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={!hover ? "تسجيل الخروج" : undefined}
            className="rounded-lg transition-colors cursor-pointer flex items-center"
            style={{
              width: hover ? "100%" : RAIL_W - 16,
              height: 36,
              paddingInline: hover ? 12 : 0,
              justifyContent: hover ? "flex-start" : "center",
              gap: 8,
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            <LogOut size={16} />
            <span
              className="whitespace-nowrap overflow-hidden"
              style={{
                maxWidth: hover ? 140 : 0,
                opacity: hover ? 1 : 0,
                transition:
                  "max-width 220ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 140ms ease 80ms",
              }}
            >
              تسجيل الخروج
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
