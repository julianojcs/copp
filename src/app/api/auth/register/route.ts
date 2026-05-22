// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Course } from '@/models/course'
import { AppSettings } from '@/models/app-settings'
import { sendWelcomePendingEmail } from '@/lib/email'
import { registerSchema } from '@/lib/validations'
import { createError, formatErrorResponse, ErrorCode } from '@/lib/errors'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
      return NextResponse.json(
        { error: fieldErrors[0].message, code: ErrorCode.VALIDATION_FAILED, fields: fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, whatsapp, lotacao, cargo, bio, state, city } =
      validationResult.data

    await connectDB()

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      const error = createError.emailExists()
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    // Resolve active course from settings (fallback: most recent active Course)
    const settings = await AppSettings.findOne().lean()
    let activeCourse = settings?.activeCourseId
      ? await Course.findById(settings.activeCourseId).lean()
      : null
    if (!activeCourse) {
      activeCourse = await Course.findOne({ isActive: true }).sort({ createdAt: -1 }).lean()
    }
    const courseName = activeCourse?.name || DEFAULT_APP_SETTINGS.brandName

    const hashedPassword = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      whatsapp,
      lotacao,
      cargo,
      role: USER_ROLES.ALUNO,                // backend forces aluno
      status: USER_STATUS.PENDING,           // requires moderator approval
      courseId: activeCourse?._id,
      courseName,
      state: state.toUpperCase(),
      city: city || undefined,
      bio: bio || undefined,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerified: true,                   // email verification is disabled in this app
      isActive: true,
      profileCompleted: true,                // 4 required fields are collected at register
    })

    try {
      await sendWelcomePendingEmail(user.email, user.name)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
    }

    return NextResponse.json(
      {
        message:
          'Cadastro realizado! Sua conta está em análise pela coordenação.',
        userId: user._id,
      },
      { status: 201 }
    )
  } catch (err) {
    const { body, status } = formatErrorResponse(err, 'POST /api/auth/register')
    return NextResponse.json(body, { status })
  }
}
