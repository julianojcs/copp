import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { sendAccountApprovedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão para aprovar' }, { status: 403 })
  }

  const { id } = await params

  await connectDB()
  const target = await User.findById(id)
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  target.status = USER_STATUS.APPROVED
  target.rejectedReason = undefined
  target.approvedBy = session.user.id as unknown as typeof target.approvedBy
  target.approvedAt = new Date()
  await target.save()

  try {
    await sendAccountApprovedEmail(target.email, target.name)
  } catch (e) {
    console.error('Failed to send approval email:', e)
  }

  return NextResponse.json({ ok: true })
}
