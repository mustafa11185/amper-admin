/**
 * PUT    /api/saas-billing/credentials/{gateway}   — save/update (encrypted)
 * DELETE /api/saas-billing/credentials/{gateway}   — remove DB row, fall back to env
 *
 * gateway ∈ {zaincash, qi, asiapay}
 *
 * PUT body:
 *   {
 *     credentials: { ...gateway-specific fields },
 *     is_test_mode: boolean,
 *     is_enabled: boolean,
 *     display_name?: string
 *   }
 *
 * Auth: super_admin only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { encryptCredentials } from '@/lib/payments/encryption';

type LibGateway = 'zaincash' | 'qi' | 'asiapay';
type DbGateway = 'zain_cash' | 'qi_card' | 'asia_pay';

const LIB_TO_DB: Record<LibGateway, DbGateway> = {
  zaincash: 'zain_cash',
  qi: 'qi_card',
  asiapay: 'asia_pay',
};

// Required fields per gateway — used to validate the body before encrypting.
const REQUIRED_FIELDS: Record<LibGateway, string[]> = {
  zaincash: ['client_id', 'client_secret', 'api_key', 'service_type'],
  qi: ['username', 'password', 'terminal_id'],
  asiapay: ['app_id', 'app_key', 'app_secret', 'private_key', 'merchant_code', 'domain_url'],
};

function isValidGateway(g: string): g is LibGateway {
  return g === 'zaincash' || g === 'qi' || g === 'asiapay';
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ gateway: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { gateway } = await ctx.params;
  if (!isValidGateway(gateway)) {
    return NextResponse.json({ error: 'INVALID_GATEWAY' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const credentials = body.credentials;
  if (!credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'CREDENTIALS_REQUIRED' }, { status: 400 });
  }

  // Validate all required fields are present + non-empty
  const required = REQUIRED_FIELDS[gateway];
  const missing = required.filter((f) => !credentials[f] || String(credentials[f]).trim() === '');
  if (missing.length > 0) {
    return NextResponse.json({ error: 'MISSING_FIELDS', fields: missing }, { status: 400 });
  }

  let encrypted: string;
  try {
    encrypted = encryptCredentials(credentials);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ENCRYPTION_FAILED';
    return NextResponse.json({ error: 'ENCRYPTION_FAILED', message: msg }, { status: 500 });
  }

  const dbGateway = LIB_TO_DB[gateway];
  const isTestMode = !!body.is_test_mode;
  const isEnabled = body.is_enabled !== false; // default true
  const displayName = body.display_name ? String(body.display_name).slice(0, 100) : null;

  await prisma.amperGatewayCredentials.upsert({
    where: { gateway: dbGateway },
    create: {
      gateway: dbGateway,
      encrypted_credentials: encrypted,
      is_test_mode: isTestMode,
      is_enabled: isEnabled,
      display_name: displayName,
      updated_by: session.user.id,
    },
    update: {
      encrypted_credentials: encrypted,
      is_test_mode: isTestMode,
      is_enabled: isEnabled,
      display_name: displayName,
      updated_by: session.user.id,
      // Reset validation state — caller must re-test after editing.
      last_validated_at: null,
      last_validation_error: null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ gateway: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { gateway } = await ctx.params;
  if (!isValidGateway(gateway)) {
    return NextResponse.json({ error: 'INVALID_GATEWAY' }, { status: 400 });
  }
  await prisma.amperGatewayCredentials.deleteMany({
    where: { gateway: LIB_TO_DB[gateway] },
  });
  return NextResponse.json({ ok: true });
}
