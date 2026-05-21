// src/app/api/admin/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'
import { canManageCourses } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  await connectDB()
  const items = await Course.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      description: c.description,
      location: c.location,
      startDate: c.startDate,
      endDate: c.endDate,
      isActive: c.isActive,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = await req.json()
  await connectDB()
  const created = await Course.create(body)
  return NextResponse.json({ id: created._id.toString() }, { status: 201 })
}
