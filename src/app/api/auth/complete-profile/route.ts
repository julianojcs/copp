import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { email, name, googleId, avatar, lotacao, whatsapp, cargo, role } = body

		if (!email || !name || !googleId || !lotacao || !whatsapp) {
			return NextResponse.json(
				{ error: 'Os campos nome, e-mail, Google ID, lotação e WhatsApp são obrigatórios.' },
				{ status: 400 }
			)
		}

		// cargo é obrigatório para quem não é admin
		const resolvedRole = role || USER_ROLES.ALUNO
		if (resolvedRole !== USER_ROLES.ADMIN && !cargo) {
			return NextResponse.json(
				{ error: 'O cargo é obrigatório para alunos, instrutores e coordenadores.' },
				{ status: 400 }
			)
		}

		await connectDB()

		const existingUser = await User.findOne({
			$or: [{ email: email.toLowerCase() }, { googleId }],
		})

		if (existingUser) {
			return NextResponse.json(
				{ error: 'Já existe uma conta com este e-mail ou conta Google.' },
				{ status: 409 }
			)
		}

		const user = await User.create({
			name,
			email: email.toLowerCase(),
			googleId,
			avatar,
			lotacao,
			whatsapp,
			cargo: resolvedRole !== USER_ROLES.ADMIN ? cargo : undefined,
			role: resolvedRole,
			status: USER_STATUS.PENDING,
			emailVerified: true,
			isActive: true,
			profileCompleted: true,
			// lotacao is required in schema — courseName is set via admin later
			courseName: '',
		})

		return NextResponse.json(
			{
				message: 'Cadastro concluído! Aguarde a aprovação da coordenação.',
				userId: user._id.toString(),
			},
			{ status: 201 }
		)
	} catch (err) {
		console.error('Complete profile error:', err)
		return NextResponse.json(
			{ error: 'Ocorreu um erro inesperado. Tente novamente.' },
			{ status: 500 }
		)
	}
}
