// Company-admin API for managing app version rows.
// Only super_admin can list/create/update.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireSuperAdmin() {
  const session = await getSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const rows = await prisma.appVersion.findMany({
    orderBy: { app_key: 'asc' },
  })
  return NextResponse.json({ versions: rows })
}

export async function PUT(req: NextRequest) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const body = await req.json()
  const {
    app_key,
    min_version,
    latest_version,
    update_url,
    changelog_ar,
    changelog_en,
    force,
  } = body as {
    app_key?: string
    min_version?: string
    latest_version?: string
    update_url?: string | null
    changelog_ar?: string | null
    changelog_en?: string | null
    force?: boolean
  }

  if (!app_key || !min_version || !latest_version) {
    return NextResponse.json(
      { error: 'app_key, min_version, latest_version are required' },
      { status: 400 },
    )
  }

  const row = await prisma.appVersion.upsert({
    where: { app_key },
    create: {
      app_key,
      min_version,
      latest_version,
      update_url: update_url || null,
      changelog_ar: changelog_ar || null,
      changelog_en: changelog_en || null,
      force: force || false,
      released_at: new Date(),
    },
    update: {
      min_version,
      latest_version,
      update_url: update_url || null,
      changelog_ar: changelog_ar || null,
      changelog_en: changelog_en || null,
      force: force || false,
      released_at: new Date(),
    },
  })

  return NextResponse.json({ version: row })
}
