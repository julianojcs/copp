import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { sendVerificationEmail } from '@/lib/email'
import { formatErrorResponse, ErrorCode } from '@/lib/errors'

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json()

		if (!email) {
			return NextResponse.json(
				{ error: 'Email is required', code: ErrorCode.VALIDATION_REQUIRED_FIELD },
				{ status: 400 }
			)
		}

		await connectDB()

		const user = await User.findOne({
			email: email.toLowerCase(),
		}).select('+verificationToken +verificationTokenExpires')

		if (!user) {
			// Return success even if user not found to prevent email enumeration
			return NextResponse.json(
				{ message: 'If this email exists in our system, a verification email has been sent.' },
				{ status: 200 }
			)
		}

		// If already verified, return success message
		if (user.emailVerified) {
			return NextResponse.json(
				{ message: 'Your email is already verified. You can sign in now.' },
				{ status: 200 }
			)
		}

		// Check if account uses Google
		if (!user.password && user.googleId) {
			return NextResponse.json(
				{ message: 'This account uses Google Sign-In and does not require email verification.' },
				{ status: 200 }
			)
		}

		// Generate new verification token
		const verificationToken = crypto.randomBytes(32).toString('hex')
		const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		await User.findByIdAndUpdate(user._id, {
			verificationToken,
			verificationTokenExpires,
		})

		try {
			await sendVerificationEmail(user.email, verificationToken)
		} catch (emailError) {
			console.error('Failed to send verification email:', emailError)
			return NextResponse.json(
				{ error: 'Failed to send verification email. Please try again later.', code: ErrorCode.INTERNAL_ERROR },
				{ status: 500 }
			)
		}

		return NextResponse.json(
			{ message: 'Verification email sent successfully! Please check your inbox.' },
			{ status: 200 }
		)
	} catch (err) {
		const { body, status } = formatErrorResponse(err, 'POST /api/auth/resend-verification')
		return NextResponse.json(body, { status })
	}
}
