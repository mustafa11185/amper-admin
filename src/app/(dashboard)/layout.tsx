import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = session.user as { name?: string; role?: string; email?: string };

  return (
    <DashboardShell
      userName={user.name || "مستخدم"}
      userRole={user.role || "support"}
      userEmail={user.email || ""}
    >
      {children}
    </DashboardShell>
  );
}
