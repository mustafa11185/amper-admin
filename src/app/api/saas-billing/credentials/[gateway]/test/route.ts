/**
 * POST /api/saas-billing/credentials/{gateway}/test
 *
 * Test connection to the gateway using stored (DB) credentials.
 * Updates `last_validated_at` on success or `last_validation_error` on failure.
 *
 * Auth: super_admin only.
 *
 * Note: this calls into the manager-app's gateway adapters. company-admin
 * doesn't have those adapters locally — instead we call manager-app's
 * `/api/billing/test-gateway/{gateway}` which delegates to the adapter.
 * For now, we just decrypt + verify shape locally and mark as validated.
 * Real connectivity check is recommended via manager-app endpoint when the
 * latter is reachable.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decryptCredentials } from '@/lib/payments/encryption';

type LibGateway = 'zaincash' | 'qi' | 'asiapay';
type DbGateway = 'zain_cash' | 'qi_card' | 'asia_pay';

const LIB_TO_DB: Record<LibGateway, DbGateway> = {
  zaincash: 'zain_cash',
  qi: 'qi_card',
  asiapay: 'asia_pay',
};

function isValidGateway(g: string): g is LibGateway { return g === 'zaincash' || g === 'qi' || g === 'asiapay'; }

export async function POST(_req: NextRequest, ctx: { params: Promise<{ gateway: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { gateway } = await ctx.params;
  if (!isValidGateway(gateway)) {
    return NextResponse.json({ error: 'INVALID_GATEWAY' }, { status: 400 });
  }

  const row = await prisma.amperGatewayCredentials.findUnique({
    where: { gateway: LIB_TO_DB[gateway] },
  });
  if (!row) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 404 });
  }

  // Step 1: decrypt-shape check
  let decrypted: Record<string, unknown>;
  try {
    decrypted = decryptCredentials(row.encrypted_credentials);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DECRYPT_FAILED';
    await prisma.amperGatewayCredentials.update({
      where: { gateway: LIB_TO_DB[gateway] },
      data: { last_validation_error: `decrypt: ${msg}`.slice(0, 500), last_validated_at: null },
    });
    return NextResponse.json({ ok: false, error: 'DECRYPT_FAILED', message: msg }, { status: 500 });
  }

  // Step 2: try real connectivity test by calling manager-app (best-effort)
  const managerAppUrl = process.env.MANAGER_APP_URL || 'http://localhost:3002';
  let connectivityOk = false;
  let connectivityMsg: string | null = null;
  try {
    const res = await fetch(`${managerAppUrl}/api/billing/test-amper-gateway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Auth': process.env.INTERNAL_API_KEY || 'dev' },
      body: JSON.stringify({ gateway }),
      // Short timeout — owner doesn't want to wait forever
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      connectivityOk = true;
    } else {
      connectivityMsg = `manager-app returned HTTP ${res.status}`;
    }
  } catch (err) {
    connectivityMsg = err instanceof Error ? err.message : String(err);
  }

  if (connectivityOk) {
    await prisma.amperGatewayCredentials.update({
      where: { gateway: LIB_TO_DB[gateway] },
      data: { last_validated_at: new Date(), last_validation_error: null },
    });
    return NextResponse.json({ ok: true, validated: true });
  }

  // Connectivity failed but decrypt + shape OK — still useful to record.
  await prisma.amperGatewayCredentials.update({
    where: { gateway: LIB_TO_DB[gateway] },
    data: {
      last_validation_error: connectivityMsg ? `connect: ${connectivityMsg}`.slice(0, 500) : 'unknown',
      last_validated_at: null,
    },
  });
  return NextResponse.json({
    ok: false,
    decrypted_keys: Object.keys(decrypted),
    error: 'CONNECTION_TEST_FAILED',
    message: connectivityMsg,
  }, { status: 502 });
}
