"use client";

/**
 * RestoTabsStrip — sticky horizontal tabs for /products/restoiq.
 * Mirrors the tabbed-shell pattern used in the manager web's
 * /reports IA (P-DASH-3 era) so an admin moving between products
 * sees consistent UX.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface Tab {
  id: string;
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
  placeholder?: boolean; // true → still being wired; show subtle hint
}

const TABS: Tab[] = [
  { id: "overview",   label: "نظرة عامّة",      href: "/products/restoiq/overview",   Icon: LayoutDashboard },
  { id: "customers",  label: "المطاعم",         href: "/products/restoiq/customers",  Icon: Users },
  { id: "branches",   label: "الفروع",          href: "/products/restoiq/branches",   Icon: MapPin,        placeholder: true },
  { id: "reports",    label: "التقارير",        href: "/products/restoiq/reports",    Icon: BarChart3,     placeholder: true },
  { id: "ai",         label: "ذكاء RestoIQ",     href: "/products/restoiq/ai",         Icon: Sparkles },
  { id: "marketplace",label: "الماركت بليس",     href: "/products/restoiq/marketplace",Icon: ShoppingBag,   placeholder: true },
  { id: "payments",   label: "المدفوعات",       href: "/products/restoiq/payments",   Icon: CreditCard,    placeholder: true },
  { id: "whatsapp",   label: "WhatsApp",        href: "/products/restoiq/whatsapp",   Icon: MessageCircle, placeholder: true },
  { id: "health",     label: "الصحّة",          href: "/products/restoiq/health",     Icon: AlertTriangle, placeholder: true },
  { id: "tickets",    label: "التذاكر",         href: "/products/restoiq/tickets",    Icon: Ticket,        placeholder: true },
];

export default function RestoTabsStrip() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "8px",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((t) => {
          const isActive = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.Icon;
          return (
            <Link
              key={t.id}
              href={t.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                background: isActive ? "var(--blue-soft)" : "transparent",
                color: isActive
                  ? "var(--blue-primary)"
                  : "var(--text-secondary)",
                position: "relative",
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.placeholder && !isActive && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 999,
                    background: "var(--bg-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  قريباً
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
