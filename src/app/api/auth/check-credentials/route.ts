import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'

/**
 * API to check user credentials and return detailed status
 * This helps distinguish between invalid credentials and unverified email
 */
export async function POST(req: NextRequest) {
	try {
		const { email, password } = await req.json()

		if (!email || !password) {
			return NextResponse.json(
				{
					success: false,
					reason: 'missing_credentials',
					message: 'Email and password are required.'
				},
				{ status: 400 }
			)
		}

		await connectDB()

		const user = await User.findOne({
			email: email.toLowerCase(),
		}).select('+password')

		if (!user) {
			return NextResponse.json(
				{
					success: false,
					reason: 'invalid_credentials',
					message: 'Invalid email or password.'
				},
				{ status: 401 }
			)
		}

		// Check if it's a Google-only account
		if (!user.password && user.googleId) {
			return NextResponse.json(
				{
					success: false,
					reason: 'google_account',
					message: 'This account uses Google Sign-In. Please use the "Sign in with Google" button.'
				},
				{ status: 401 }
			)
		}

		if (!user.password) {
			return NextResponse.json(
				{
					success: false,
					reason: 'invalid_credentials',
					message: 'Invalid email or password.'
				},
				{ status: 401 }
			)
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			return NextResponse.json(
				{
					success: false,
					reason: 'invalid_credentials',
					message: 'Invalid email or password.'
				},
				{ status: 401 }
			)
		}

		// Password is valid, now check additional conditions
		if (!user.emailVerified) {
			return NextResponse.json(
				{
					success: false,
					reason: 'email_not_verified',
					email: user.email,
					message: 'Please verify your email address before signing in.'
				},
				{ status: 403 }
			)
		}

		if (!user.isActive) {
			return NextResponse.json(
				{
					success: false,
					reason: 'account_deactivated',
					message: 'Your account has been deactivated. Please contact support.'
				},
				{ status: 403 }
			)
		}

		// All checks passed
		return NextResponse.json(
			{
				success: true,
				message: 'Credentials valid. Proceed with sign in.'
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Check email error:', error)

		const isDbUnavailable =
			error instanceof Error &&
			(error.name === 'MongooseServerSelectionError' ||
				error.name === 'MongoServerSelectionError' ||
				error.name === 'MongoNetworkError' ||
				/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|querySrv/i.test(error.message))

		if (isDbUnavailable) {
			return NextResponse.json(
				{
					success: false,
					reason: 'service_unavailable',
					message: 'Service is temporarily unavailable. Please try again in a few minutes.'
				},
				{ status: 503 }
			)
		}

		return NextResponse.json(
			{
				success: false,
				reason: 'server_error',
				message: 'An unexpected error occurred. Please try again.'
			},
			{ status: 500 }
		)
	}
}
