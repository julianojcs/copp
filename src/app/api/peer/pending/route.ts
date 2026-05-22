import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { USER_STATUS } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const items = await User.find({ status: USER_STATUS.PENDING }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      cargo: u.cargo,
      lotacaoSigla: u.lotacaoSigla,
      lotacaoNome: u.lotacaoNome,
      createdAt: u.createdAt,
    })),
  })
}
