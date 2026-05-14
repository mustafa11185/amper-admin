/**
 * /products/restoiq layout — P-AMPER-UX (2026-05-14).
 *
 * Simple session-guarded wrapper. The previous tabs-strip header
 * moved into the page itself (single-page-with-scroll-spy layout),
 * so this layout no longer reserves header space. The header / nav
 * lives in page.tsx alongside the 10 sections.
 *
 * Why a layout at all: it keeps the auth check in one place for any
 * future sub-route we add (e.g. a future per-tenant deep page like
 * /products/restoiq/customer/<id>).
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RestoIqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return <>{children}</>;
}
