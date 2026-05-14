/**
 * RestoIQ service client — P-MERGE-3 (2026-05-14).
 *
 * Talks to the RestoIQ backend's `/saas/*` endpoints from the Endur
 * company-admin. The matching middleware on the RestoIQ side is
 * `src/middleware/service-hmac.ts` (in the resto repo).
 *
 * Auth: every request carries an `X-Amper-Signature` header derived
 * from a shared secret. The secret + base URL live on the RESTOIQ
 * Product row in our own DB (api_base_url + webhook_secret) so a
 * production-vs-staging swap is a DB tweak, not a code change.
 *
 * Protocol (mirrors the verifier exactly):
 *   header: X-Amper-Signature: t=<unix-sec>,v1=<hex hmac-sha256>
 *   body:   "<t>.<METHOD>.<path>.<sha256(body) or empty>"
 *   key:    Product.webhook_secret (== RESTOIQ_HMAC_SECRET on the
 *           RestoIQ side)
 */
import { createHash, createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

interface RestoIqProductConfig {
  apiBaseUrl: string;
  secret: string;
}

async function loadConfig(): Promise<RestoIqProductConfig | null> {
  const product = await prisma.product.findUnique({
    where: { key: "RESTOIQ" },
    select: { api_base_url: true, webhook_secret: true },
  });
  if (!product) return null;
  if (!product.api_base_url || !product.webhook_secret) return null;
  return {
    apiBaseUrl: product.api_base_url.replace(/\/+$/, ""),
    secret: product.webhook_secret,
  };
}

function signRequest(
  secret: string,
  method: string,
  path: string,
  body: unknown,
): { signatureHeader: string; serialisedBody: string | undefined } {
  const t = Math.floor(Date.now() / 1000);
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "DELETE";
  let bodyHash = "";
  let serialised: string | undefined;
  if (hasBody && body !== undefined) {
    serialised = JSON.stringify(body ?? {});
    bodyHash = createHash("sha256").update(serialised).digest("hex");
  }
  const canonical = `${t}.${method}.${path}.${bodyHash}`;
  const v1 = createHmac("sha256", secret).update(canonical).digest("hex");
  return {
    signatureHeader: `t=${t},v1=${v1}`,
    serialisedBody: serialised,
  };
}

export class RestoIqClientError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIG_MISSING"
      | "NETWORK"
      | "HTTP"
      | "DECODE",
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "RestoIqClientError";
  }
}

/**
 * Call any `/saas/*` path on the RestoIQ backend.
 *
 *   const data = await restoiqRequest<MyType>("GET", "/saas/ai-subscriptions");
 *
 * Always returns the parsed JSON body on 2xx. Throws RestoIqClientError
 * otherwise — callers can inspect `.code` and `.status`.
 */
export async function restoiqRequest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const cfg = await loadConfig();
  if (!cfg) {
    throw new RestoIqClientError(
      "RESTOIQ Product is missing api_base_url or webhook_secret",
      "CONFIG_MISSING",
    );
  }

  // `path` is the public path on the RestoIQ side — e.g. "/saas/ai-subscriptions".
  // We sign the exact path the server will see (originalUrl) so they
  // match byte-for-byte.
  if (!path.startsWith("/")) path = `/${path}`;
  const url = `${cfg.apiBaseUrl}${path}`;

  const { signatureHeader, serialisedBody } = signRequest(
    cfg.secret,
    method,
    path,
    body,
  );

  const headers: Record<string, string> = {
    "X-Amper-Signature": signatureHeader,
  };
  if (serialisedBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: serialisedBody,
      cache: "no-store",
    });
  } catch (err) {
    throw new RestoIqClientError(
      `network error calling ${url}: ${(err as Error).message}`,
      "NETWORK",
    );
  }

  if (!res.ok) {
    let parsed: unknown = undefined;
    try {
      parsed = await res.json();
    } catch {
      // body wasn't JSON
    }
    throw new RestoIqClientError(
      `RestoIQ ${method} ${path} → ${res.status}`,
      "HTTP",
      res.status,
      parsed,
    );
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new RestoIqClientError(
      `failed to parse response from ${url}: ${(err as Error).message}`,
      "DECODE",
    );
  }
}

/** Returns true if the RESTOIQ Product is fully configured for live calls. */
export async function isRestoIqConfigured(): Promise<boolean> {
  const cfg = await loadConfig();
  return cfg !== null;
}
