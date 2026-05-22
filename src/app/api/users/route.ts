import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { auth } from '@/lib/auth'
import { createError, formatErrorResponse } from '@/lib/errors'
import { USER_STATUS } from '@/lib/constants'

export async function GET(req: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user) {
			const error = createError.unauthorized()
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		await connectDB()

		const { searchParams } = new URL(req.url)
		const search = searchParams.get('search') || ''
		const lotacao = searchParams.get('lotacao') || ''
		const cargo = searchParams.get('cargo') || ''
		const role = searchParams.get('role') || ''
		const page = parseInt(searchParams.get('page') || '1')
		const limit = parseInt(searchParams.get('limit') || '12')

		// Apenas usuários aprovados e ativos são visíveis no diretório
		const query: Record<string, unknown> = {
			isActive: true,
			status: USER_STATUS.APPROVED,
		}

		if (search) {
			query.$text = { $search: search }
		}

		if (lotacao) {
			query.lotacao = { $regex: lotacao, $options: 'i' }
		}

		if (cargo) {
			query.cargo = cargo
		}

		if (role) {
			query.role = role
		}

		const skip = (page - 1) * limit

		const [users, total] = await Promise.all([
			User.find(query)
				.select('name email avatar role cargo lotacao whatsapp linkedin instagram twitter bio state city emailVerified isActive createdAt')
				.sort({ name: 1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			User.countDocuments(query),
		])

		return NextResponse.json({
			users,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})
	} catch (err) {
		const { body, status } = formatErrorResponse(err, 'GET /api/users')
		return NextResponse.json(body, { status })
	}
}
