import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { resetPasswordSchema } from '@/lib/validations'
import { createError, formatErrorResponse, ErrorCode } from '@/lib/errors'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { token, ...passwordData } = body

		if (!token) {
			return NextResponse.json(
				{ error: 'Reset token is required', code: ErrorCode.VALIDATION_REQUIRED_FIELD },
				{ status: 400 }
			)
		}

		const validationResult = resetPasswordSchema.safeParse(passwordData)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: validationResult.error.issues[0].message,
					code: ErrorCode.VALIDATION_FAILED,
				},
				{ status: 400 }
			)
		}

		await connectDB()

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordTokenExpires: { $gt: new Date() },
		}).select('+resetPasswordToken +resetPasswordTokenExpires')

		if (!user) {
			const error = createError.tokenExpired()
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		const hashedPassword = await bcrypt.hash(validationResult.data.password, 12)

		await User.findByIdAndUpdate(user._id, {
			password: hashedPassword,
			$unset: { resetPasswordToken: 1, resetPasswordTokenExpires: 1 },
		})

		return NextResponse.json(
			{ message: 'Password reset successfully! You can now sign in.' },
			{ status: 200 }
		)
	} catch (err) {
		const { body, status } = formatErrorResponse(err, 'POST /api/auth/reset-password')
		return NextResponse.json(body, { status })
	}
}
