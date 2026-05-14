/**
 * GET /api/restoiq/marketplace-policy — P-MERGE-3 (2026-05-14).
 *
 * Proxies the RestoIQ backend's /saas/marketplace-policy endpoint
 * with HMAC signing. Reused by the upcoming /products/restoiq/marketplace
 * tab.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  restoiqRequest,
  isRestoIqConfigured,
  RestoIqClientError,
} from "@/lib/restoiq-client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isRestoIqConfigured())) {
    return NextResponse.json(
      {
        error: "RESTOIQ product is missing api_base_url or webhook_secret",
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const data = await restoiqRequest<unknown>(
      "GET",
      "/saas/marketplace-policy",
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof RestoIqClientError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          status: err.status,
          upstream: err.body,
        },
        { status: err.status ?? 502 },
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
