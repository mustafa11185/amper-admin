// POST /api/clients/fix-default-names
//
// One-shot maintenance endpoint that renames every generator + branch
// whose name is the boilerplate default ("المولدة الرئيسية" /
// "الفرع الرئيسي") to match the parent tenant's project name.
//
// Old client wizards stored those defaults instead of the user's
// "اسم المشروع" input, so the staff app header showed boilerplate
// labels for every tenant created before the fix. Running this once
// after deploy rewrites those rows in place — no schema change.
//
// Auth: super_admin session OR ?key=<CRON_SECRET> when the env var
// is set. The cron-secret path lets us trigger the migration from a
// CI / curl call without needing an interactive admin session.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BOILERPLATE_GENERATOR = 'المولدة الرئيسية'
const BOILERPLATE_BRANCH = 'الفرع الرئيسي'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const providedKey = req.nextUrl.searchParams.get('key') || req.headers.get('x-cron-key')
  const cronAllowed = cronSecret && providedKey === cronSecret

  if (!cronAllowed) {
    const session = await getSession()
    const role = (session?.user as { role?: string } | undefined)?.role
    if (role !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  // Pull every tenant once with its branches + generators so we can
  // pair each boilerplate row to the right tenant name in a single
  // pass instead of N+1 queries.
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      branches: {
        select: {
          id: true,
          name: true,
          generators: { select: { id: true, name: true } },
        },
      },
    },
  })

  let renamedBranches = 0
  let renamedGenerators = 0

  for (const t of tenants) {
    for (const b of t.branches) {
      if (b.name === BOILERPLATE_BRANCH) {
        await prisma.branch.update({
          where: { id: b.id },
          data: { name: t.name },
        })
        renamedBranches++
      }
      for (const g of b.generators) {
        if (g.name === BOILERPLATE_GENERATOR) {
          await prisma.generator.update({
            where: { id: g.id },
            data: { name: t.name },
          })
          renamedGenerators++
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tenants_scanned: tenants.length,
    renamed_branches: renamedBranches,
    renamed_generators: renamedGenerators,
  })
}
