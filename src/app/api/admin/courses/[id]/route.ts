// src/app/api/admin/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'
import { canManageCourses } from '@/lib/permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

const FIELDS = ['name', 'code', 'description', 'location', 'startDate', 'endDate', 'isActive'] as const

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  await connectDB()
  const c = await Course.findById(id).lean()
  if (!c) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ...c, id: c._id.toString() })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of FIELDS) {
    if (k in body) update[k] = body[k]
  }
  await connectDB()
  const updated = await Course.findByIdAndUpdate(id, update, { new: true })
  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
