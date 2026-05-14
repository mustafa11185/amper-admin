import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Default tab = overview. Bookmarking /products/restoiq sends the
// user straight to the most useful screen.
export default function RestoIqIndex() {
  redirect("/products/restoiq/overview");
}
