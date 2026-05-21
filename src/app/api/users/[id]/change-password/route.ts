import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { auth } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validations'
import { createError, formatErrorResponse, ErrorCode } from '@/lib/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      const error = createError.unauthorized()
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    const { id } = await params

    // User can only change their own password
    if (session.user.id !== id) {
      const error = createError.forbidden()
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    const body = await req.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0].message,
          code: ErrorCode.VALIDATION_FAILED,
        },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    await connectDB()
    const user = await User.findById(id).select('+password')
    if (!user) {
      const error = createError.notFound('User')
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    if (!user.password) {
      return NextResponse.json(
        { error: 'Esta conta não usa senha (login via OAuth).' },
        { status: 400 }
      )
    }

    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) {
      return NextResponse.json(
        { error: 'Senha atual incorreta.' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    user.password = hashed
    await user.save()

    return NextResponse.json({ message: 'Senha alterada com sucesso.' })
  } catch (err) {
    const { body, status } = formatErrorResponse(err, 'POST /api/users/[id]/change-password')
    return NextResponse.json(body, { status })
  }
}
