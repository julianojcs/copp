import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { USER_STATUS } from '@/lib/constants'
import { sendAccountApprovedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { ids } = (await req.json()) as { ids: string[] }
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'ids[] obrigatório' }, { status: 400 })
  }

  await connectDB()
  const targets = await User.find({ _id: { $in: ids } })
  for (const t of targets) {
    t.status = USER_STATUS.APPROVED
    t.rejectedReason = undefined
    t.approvedBy = session.user.id as unknown as typeof t.approvedBy
    t.approvedAt = new Date()
    await t.save()
    try {
      await sendAccountApprovedEmail(t.email, t.name)
    } catch (e) {
      console.error('Email failed for', t.email, e)
    }
  }
  return NextResponse.json({ ok: true, count: targets.length })
}
