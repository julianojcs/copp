import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { sendAccountApprovedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()
  const target = await User.findById(id)
  if (!target) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (target.status !== USER_STATUS.PENDING) {
    return NextResponse.json({ error: 'Usuário já foi avaliado' }, { status: 409 })
  }

  target.status = USER_STATUS.APPROVED
  target.approvedBy = session.user.id
  target.approvedAt = new Date()
  await target.save()

  try {
    await sendAccountApprovedEmail(target.email, target.name)
  } catch (e) {
    console.error('Email failed:', e)
  }

  return NextResponse.json({ ok: true })
}
