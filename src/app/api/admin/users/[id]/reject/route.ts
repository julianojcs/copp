import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canReject } from '@/lib/permissions'
import { sendAccountRejectedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canReject(session.user)) {
    return NextResponse.json({ error: 'Sem permissão para rejeitar' }, { status: 403 })
  }

  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string }
  const { id } = await params

  await connectDB()
  const target = await User.findById(id)
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  target.status = USER_STATUS.REJECTED
  target.rejectedReason = reason || undefined
  await target.save()

  try {
    await sendAccountRejectedEmail(target.email, target.name, reason)
  } catch (e) {
    console.error('Failed to send rejection email:', e)
  }

  return NextResponse.json({ ok: true })
}
