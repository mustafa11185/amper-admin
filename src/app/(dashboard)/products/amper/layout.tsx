/**
 * /products/amper layout — P-AMPER-HUB (2026-05-14).
 *
 * Session guard only; navigation lives on page.tsx (single-page
 * scroll-spy pattern, same as the RestoIQ hub).
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AmperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return <>{children}</>;
}
