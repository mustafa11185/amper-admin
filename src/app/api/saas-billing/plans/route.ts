/**
 * GET  /api/saas-billing/plans         — list Plan rows (catalog editor)
 * PATCH /api/saas-billing/plans        — update one plan's prices/limits/features
 *
 * Body for PATCH: { id, ...fields }
 *
 * Auth: super_admin only — these changes affect MRR/ARR.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !['super_admin', 'sales', 'accountant'].includes(session.user.role)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const plans = await prisma.plan.findMany({ orderBy: { sort_order: 'asc' } });
  return NextResponse.json({ plans });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const id: string | undefined = body.id;
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 });

  // Whitelist editable fields — never touch id/created_at.
  const PRICE_FIELDS = ['price_monthly', 'price_3m', 'price_6m', 'price_12m'] as const;
  const LIMIT_FIELDS = ['generator_limit', 'subscriber_limit', 'staff_limit'] as const;
  const FLAG_FIELDS = [
    'has_iot', 'has_ai', 'has_subscriber_app', 'has_api',
    'has_multi_branch', 'has_priority_support',
    'is_active', 'is_popular',
  ] as const;
  const TEXT_FIELDS = ['name_en', 'name_ar', 'tagline_ar', 'tagline_en'] as const;
  const NUM_FIELDS = ['sort_order'] as const;

  const data: Record<string, unknown> = {};

  for (const f of PRICE_FIELDS) {
    if (f in body) {
      const n = Number(body[f]);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `INVALID_${f.toUpperCase()}` }, { status: 400 });
      }
      data[f] = Math.round(n);
    }
  }
  for (const f of LIMIT_FIELDS) {
    if (f in body) {
      const n = Number(body[f]);
      if (!Number.isFinite(n) || (n < -1)) {
        return NextResponse.json({ error: `INVALID_${f.toUpperCase()}` }, { status: 400 });
      }
      data[f] = Math.round(n);
    }
  }
  for (const f of FLAG_FIELDS) if (f in body) data[f] = !!body[f];
  for (const f of TEXT_FIELDS) if (f in body) data[f] = String(body[f] ?? '').slice(0, 200);
  for (const f of NUM_FIELDS) if (f in body) data[f] = Math.round(Number(body[f]));

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'NOTHING_TO_UPDATE' }, { status: 400 });
  }

  try {
    const updated = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json({ ok: true, plan: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UPDATE_FAILED';
    return NextResponse.json({ error: 'UPDATE_FAILED', message: msg }, { status: 500 });
  }
}
