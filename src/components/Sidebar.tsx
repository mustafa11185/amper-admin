"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Ticket,
  BarChart3,
  UserCog,
  RefreshCcw,
  ShoppingCart,
  Settings,
  LogOut,
  Gem,
  Banknote,
  Inbox,
  Smartphone,
  Megaphone,
  CreditCard,
  Boxes,
  Building2,
  FileText,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { EndurIcon } from "./EndurLogo";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    roles: ["super_admin", "sales", "support", "accountant"],
  },
  {
    label: "المنتجات",
    href: "/products",
    icon: <Boxes size={20} />,
    roles: ["super_admin", "sales", "support", "accountant"],
  },
  // P-MERGE-2 (2026-05-14) — direct entry into the RestoIQ product
  // section. Mirrors the /dashboard layout in the manager web —
  // SaaS-admin lens (aggregated across all RestoIQ tenants).
  {
    label: "🍴 ريستو",
    href: "/products/restoiq",
    icon: <UtensilsCrossed size={20} />,
    roles: ["super_admin", "sales", "support", "accountant"],
  },
  {
    label: "العملاء",
    href: "/clients",
    icon: <Users size={20} />,
    roles: ["super_admin", "sales", "support"],
  },
  {
    label: "صندوق الطلبات",
    href: "/leads",
    icon: <Inbox size={20} />,
    roles: ["super_admin", "sales"],
    badge: true,
  },
  {
    label: "الباقات",
    href: "/plans",
    icon: <Gem size={20} />,
    roles: ["super_admin", "sales"],
  },
  {
    label: "الإدارة المالية",
    href: "/finance",
    icon: <Banknote size={20} />,
    roles: ["super_admin", "sales", "accountant"],
  },
  {
    label: "الفواتير (Amper)",
    href: "/billing",
    icon: <Receipt size={20} />,
    roles: ["super_admin", "sales", "accountant"],
  },
  {
    label: "فواتير اندر",
    href: "/endur-invoices",
    icon: <FileText size={20} />,
    roles: ["super_admin", "sales", "accountant"],
  },
  {
    label: "إدارة الاشتراكات",
    href: "/saas-billing",
    icon: <CreditCard size={20} />,
    roles: ["super_admin", "sales", "accountant", "support"],
  },
  {
    label: "التذاكر",
    href: "/tickets",
    icon: <Ticket size={20} />,
    roles: ["super_admin", "support"],
    badge: true,
  },
  {
    label: "التقارير (Amper)",
    href: "/reports",
    icon: <BarChart3 size={20} />,
    roles: ["super_admin", "accountant"],
  },
  {
    label: "تقارير اندر",
    href: "/endur-reports",
    icon: <TrendingUp size={20} />,
    roles: ["super_admin", "accountant"],
  },
  {
    label: "الفريق",
    href: "/team",
    icon: <UserCog size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "تعارضات المزامنة",
    href: "/sync-conflicts",
    icon: <RefreshCcw size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "المتجر",
    href: "/store-manager",
    icon: <ShoppingCart size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "إصدارات التطبيقات",
    href: "/app-versions",
    icon: <Smartphone size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "الإعلانات",
    href: "/announcements",
    icon: <Megaphone size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "بيانات الشركة",
    href: "/settings/company",
    icon: <Building2 size={20} />,
    roles: ["super_admin"],
  },
  {
    label: "الإعدادات",
    href: "/settings",
    icon: <Settings size={20} />,
    roles: ["super_admin"],
  },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export default function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className="fixed top-0 right-0 h-full flex flex-col"
      style={{
        width: 240,
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 40,
      }}
    >
      {/* ENDURTECH brand header */}
      <div className="flex items-center gap-3 px-5 py-6">
        <EndurIcon size={40} variant="light" />
        <div style={{ lineHeight: 1.1 }}>
          <span
            style={{
              fontFamily: "var(--font-outfit), 'Inter', sans-serif",
              fontWeight: 900,
              fontSize: 18,
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
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative"
              style={{
                background: isActive ? "var(--blue-soft)" : "transparent",
                color: isActive
                  ? "var(--blue-primary)"
                  : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className="absolute left-3 top-2.5 w-2 h-2 rounded-full"
                  style={{ background: "var(--danger)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Sign Out */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "var(--blue-primary)" }}
          >
            {userName?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {userName}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{ color: "var(--danger)" }}
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
