"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Sidebar from "./Sidebar";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "الرئيسية",
  "/clients": "العملاء",
  "/billing": "الفواتير",
  "/tickets": "التذاكر",
  "/reports": "التقارير",
  "/team": "الفريق",
  "/sync-conflicts": "تعارضات المزامنة",
  "/store-manager": "المتجر",
  "/app-versions": "إصدارات التطبيقات",
  "/announcements": "الإعلانات",
  "/settings": "الإعدادات",
};

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userEmail: string;
}

export default function DashboardShell({
  children,
  userName,
  userRole,
  userEmail,
}: DashboardShellProps) {
  const pathname = usePathname();

  const basePath = "/" + (pathname.split("/")[1] || "dashboard");
  const pageTitle = breadcrumbMap[basePath] || "الرئيسية";

  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar userRole={userRole} userName={userName} />

        {/* Main Content */}
        <div
          className="flex-1 flex flex-col"
          style={{ marginRight: 240 }}
        >
          {/* Top Bar */}
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
            style={{
              background: "rgba(238,243,255,0.85)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* Breadcrumb (right side in RTL) */}
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {pageTitle}
              </span>
            </div>

            {/* User info (left side in RTL) */}
            <div className="flex items-center gap-3">
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {userEmail}
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main
            className="flex-1 p-6"
            style={{
              background:
                "var(--bg-base) radial-gradient(ellipse at 30% 20%, rgba(27,79,216,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.03) 0%, transparent 50%)",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
