import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Lotacao } from '@/models/lotacao'
import { canEditUser, canAssignAdminRole } from '@/lib/permissions'
import { USER_ROLES } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

const EDITABLE_FIELDS = [
  'name', 'email', 'avatar', 'cargo', 'whatsapp',
  'role', 'status', 'isActive', 'courseId', 'courseName',
  'lotacaoId', 'linkedin', 'instagram', 'twitter', 'bio',
] as const

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditUser(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (k in body) update[k] = body[k]
  }

  // Only admin can assign or remove the admin role
  if (
    'role' in update &&
    (update.role === USER_ROLES.ADMIN || (await User.findById(id))?.role === USER_ROLES.ADMIN)
  ) {
    if (!canAssignAdminRole(session.user)) {
      return NextResponse.json({ error: 'Apenas admin pode promover/rebaixar admins' }, { status: 403 })
    }
  }

  await connectDB()

  // Resolve lotacaoId if provided: copy denormalized fields + derive state/city
  if (typeof update.lotacaoId === 'string') {
    if (!OBJECT_ID_RE.test(update.lotacaoId)) {
      return NextResponse.json({ error: 'Lotação inválida' }, { status: 400 })
    }
    const lotacao = await Lotacao.findById(update.lotacaoId).lean()
    if (!lotacao) {
      return NextResponse.json({ error: 'Lotação não encontrada' }, { status: 400 })
    }
    update.lotacaoId = lotacao._id
    update.lotacaoSigla = lotacao.sigla
    update.lotacaoNome = lotacao.nome
    update.lotacaoTipo = lotacao.tipo
    update.state = lotacao.uf
    update.city = lotacao.cidade
  }

  const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
  if (!updated) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditUser(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params

  await connectDB()
  const u = await User.findById(id).lean()
  if (!u) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  return NextResponse.json({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    role: u.role,
    cargo: u.cargo,
    whatsapp: u.whatsapp,
    status: u.status,
    isActive: u.isActive,
    rejectedReason: u.rejectedReason,
    courseId: u.courseId?.toString(),
    courseName: u.courseName,
    lotacaoId: u.lotacaoId?.toString(),
    lotacaoSigla: u.lotacaoSigla,
    lotacaoNome: u.lotacaoNome,
    lotacaoTipo: u.lotacaoTipo,
    state: u.state,
    city: u.city,
    linkedin: u.linkedin,
    instagram: u.instagram,
    twitter: u.twitter,
    bio: u.bio,
    createdAt: u.createdAt,
  })
}
