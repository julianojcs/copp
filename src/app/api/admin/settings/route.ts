// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { AppSettings } from '@/models/app-settings'
import { canEditSettings } from '@/lib/permissions'
import { invalidateAppSettingsCache } from '@/lib/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

const FIELDS = [
  'brandName', 'brandFullName', 'institutionName', 'institutionFullName',
  'description', 'activeCourseId', 'peerApprovalEnabled',
  'developerName', 'developerLinkedinUrl',
] as const

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditSettings(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const doc = await AppSettings.findOne().lean()
  return NextResponse.json(doc || { ...DEFAULT_APP_SETTINGS })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditSettings(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of FIELDS) {
    if (k in body) update[k] = body[k]
  }

  await connectDB()
  const existing = await AppSettings.findOne()
  if (existing) {
    Object.assign(existing, update)
    await existing.save()
  } else {
    await AppSettings.create({ ...DEFAULT_APP_SETTINGS, ...update })
  }
  invalidateAppSettingsCache()
  return NextResponse.json({ ok: true })
}
