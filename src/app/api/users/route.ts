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
		const lotacaoSigla = searchParams.get('lotacaoSigla') || ''
		const cargo = searchParams.get('cargo') || ''
		const role = searchParams.get('role') || ''
		const uf = searchParams.get('uf') || ''
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

		if (lotacaoSigla) {
			query.lotacaoSigla = { $regex: lotacaoSigla, $options: 'i' }
		}

		if (cargo) {
			query.cargo = cargo
		}

		if (role) {
			query.role = role
		}

		if (uf) {
			query.state = uf.toUpperCase()
		}

		const skip = (page - 1) * limit

		const [users, total] = await Promise.all([
			User.find(query)
				.select(
					'name email avatar role cargo whatsapp linkedin instagram twitter bio ' +
					'lotacaoId lotacaoSigla lotacaoNome lotacaoTipo state city ' +
					'emailVerified isActive createdAt'
				)
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
