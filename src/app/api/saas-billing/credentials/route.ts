/**
 * GET /api/saas-billing/credentials
 *
 * Lists all 3 supported gateways with their current status:
 *   - source: 'db' | 'env' | 'none'
 *   - is_test_mode + is_enabled (when in DB)
 *   - last_validated_at + last_validation_error
 *   - display_name
 *
 * Plaintext credentials are NEVER returned. Auth: super_admin only.
 */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type LibGateway = 'zaincash' | 'qi' | 'asiapay';
type DbGateway = 'zain_cash' | 'qi_card' | 'asia_pay';

const GATEWAYS: { lib: LibGateway; db: DbGateway; label: string; envCheck: string }[] = [
  { lib: 'zaincash', db: 'zain_cash', label: 'ZainCash', envCheck: 'AMPER_ZAINCASH_CLIENT_ID' },
  { lib: 'qi',       db: 'qi_card',   label: 'Qi Card',  envCheck: 'AMPER_QI_USERNAME' },
  { lib: 'asiapay',  db: 'asia_pay',  label: 'AsiaPay',  envCheck: 'AMPER_ASIAPAY_APP_ID' },
];

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const dbRows = await prisma.amperGatewayCredentials.findMany({
    select: {
      gateway: true,
      is_test_mode: true,
      is_enabled: true,
      display_name: true,
      last_validated_at: true,
      last_validation_error: true,
      updated_at: true,
    },
  });
  const byGateway = new Map(dbRows.map((r) => [r.gateway, r]));

  const items = GATEWAYS.map((g) => {
    const row = byGateway.get(g.db);
    if (row) {
      return {
        gateway: g.lib,
        label: g.label,
        source: 'db' as const,
        is_test_mode: row.is_test_mode,
        is_enabled: row.is_enabled,
        display_name: row.display_name,
        last_validated_at: row.last_validated_at,
        last_validation_error: row.last_validation_error,
        updated_at: row.updated_at,
      };
    }
    if (process.env[g.envCheck]) {
      return {
        gateway: g.lib,
        label: g.label,
        source: 'env' as const,
        is_test_mode: process.env[g.envCheck.replace(/_CLIENT_ID|_USERNAME|_APP_ID/, '_TEST_MODE')] === 'true',
        is_enabled: true,
        display_name: null,
        last_validated_at: null,
        last_validation_error: null,
        updated_at: null,
      };
    }
    return {
      gateway: g.lib,
      label: g.label,
      source: 'none' as const,
      is_test_mode: false,
      is_enabled: false,
      display_name: null,
      last_validated_at: null,
      last_validation_error: null,
      updated_at: null,
    };
  });

  return NextResponse.json({ items });
}
