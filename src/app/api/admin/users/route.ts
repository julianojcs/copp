import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { USER_ROLES } from '@/lib/constants'

const MODERATORS = [USER_ROLES.ADMIN, USER_ROLES.COORDENADOR, USER_ROLES.INSTRUTOR] as readonly string[]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !MODERATORS.includes(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const role = searchParams.get('role') || undefined
  const cargo = searchParams.get('cargo') || undefined
  const courseId = searchParams.get('courseId') || undefined
  const q = searchParams.get('q') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  await connectDB()

  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (role) filter.role = role
  if (cargo) filter.cargo = cargo
  if (courseId) filter.courseId = courseId
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { lotacao: { $regex: q, $options: 'i' } },
    ]
  }

  const [total, items] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ])

  return NextResponse.json({
    items: items.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      cargo: u.cargo,
      lotacao: u.lotacao,
      whatsapp: u.whatsapp,
      status: u.status,
      isActive: u.isActive,
      courseId: u.courseId?.toString(),
      courseName: u.courseName,
      createdAt: u.createdAt,
    })),
    total,
    page,
    pageSize,
  })
}
