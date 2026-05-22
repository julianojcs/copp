import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Lotacao } from '@/models/lotacao'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { email, name, googleId, avatar, lotacaoId, whatsapp, cargo, role } = body

		if (!email || !name || !googleId || !whatsapp) {
			return NextResponse.json(
				{ error: 'Os campos nome, e-mail, Google ID e WhatsApp são obrigatórios.' },
				{ status: 400 }
			)
		}

		if (!lotacaoId || typeof lotacaoId !== 'string' || !OBJECT_ID_RE.test(lotacaoId)) {
			return NextResponse.json(
				{ error: 'Lotação é obrigatória e deve ser um identificador válido.' },
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

		const lotacao = await Lotacao.findById(lotacaoId).lean()
		if (!lotacao) {
			return NextResponse.json(
				{ error: 'Lotação não encontrada.' },
				{ status: 400 }
			)
		}

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
			whatsapp,
			cargo: resolvedRole !== USER_ROLES.ADMIN ? cargo : undefined,
			role: resolvedRole,
			status: USER_STATUS.PENDING,
			lotacaoId: lotacao._id,
			lotacaoSigla: lotacao.sigla,
			lotacaoNome: lotacao.nome,
			lotacaoTipo: lotacao.tipo,
			state: lotacao.uf,
			city: lotacao.cidade,
			emailVerified: true,
			isActive: true,
			profileCompleted: true,
			// courseName is set via admin later
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
