/**
 * withGuard — P-FIX-2 (2026-05-16).
 *
 * Thin top-level error wrapper for the P-CO / P-AI API routes.
 * Applies the established P-FIX-1 hardening uniformly: the wrapped
 * handler keeps its own auth/session check; this only adds a
 * try/catch that returns a STRUCTURED JSON error (with the real
 * message + name) instead of an opaque framework 500 with an empty
 * body (which the client surfaces as "Unexpected end of JSON
 * input"). console.error keeps the stack in the server logs so the
 * exact failing query/column is diagnosable from Render logs too.
 *
 * Loosely typed on purpose (a hardening shim wrapping handlers with
 * varying signatures); each route handler itself stays fully typed.
 */
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => Promise<NextResponse>;

export function withGuard(tag: string, fn: AnyHandler) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: any, ctx?: any): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      const detail =
        e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error(`[api:${tag}]`, e);
      return NextResponse.json(
        { error: "خطأ في الخادم", detail },
        { status: 500 },
      );
    }
  };
}
