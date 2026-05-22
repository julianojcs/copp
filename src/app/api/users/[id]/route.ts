import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Lotacao } from '@/models/lotacao'
import { auth } from '@/lib/auth'
import { profileSchema } from '@/lib/validations'
import { createError, formatErrorResponse, ErrorCode } from '@/lib/errors'
import { sendEmailChangeVerification } from '@/lib/email'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()

		if (!session?.user) {
			const error = createError.unauthorized()
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		const { id } = await params

		await connectDB()

		const user = await User.findById(id)
			.select('-password -verificationToken -resetPasswordToken')
			.lean()

		if (!user) {
			const error = createError.notFound('User')
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		// Usuários não-admin só podem ver perfis aprovados
		const role = session.user.role
		const isAdmin = role === USER_ROLES.ADMIN || role === USER_ROLES.COORDENADOR
		if (!isAdmin && session.user.id !== id && user.status !== USER_STATUS.APPROVED) {
			const error = createError.notFound('User')
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		return NextResponse.json({ user })
	} catch (err) {
		const { body, status } = formatErrorResponse(err, 'GET /api/users/[id]')
		return NextResponse.json(body, { status })
	}
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()

		if (!session?.user) {
			const error = createError.unauthorized()
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		const { id } = await params

		const canEdit =
			session.user.id === id ||
			session.user.role === USER_ROLES.COORDENADOR ||
			session.user.role === USER_ROLES.ADMIN

		if (!canEdit) {
			const error = createError.forbidden()
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		const body = await req.json()
		const validationResult = profileSchema.safeParse(body)

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

		const currentUser = await User.findById(id)
		if (!currentUser) {
			const error = createError.notFound('User')
			return NextResponse.json(error.toJSON(), { status: error.statusCode })
		}

		const { lotacaoId, ...rest } = validationResult.data
		const updateData: Record<string, unknown> = { ...rest }
		let emailChanged = false

		// Resolve lotação and derive state/city + denormalized fields
		if (lotacaoId) {
			const lotacao = await Lotacao.findById(lotacaoId).lean()
			if (!lotacao) {
				return NextResponse.json(
					{ error: 'Lotação não encontrada.', code: ErrorCode.VALIDATION_FAILED },
					{ status: 400 }
				)
			}
			updateData.lotacaoId = lotacao._id
			updateData.lotacaoSigla = lotacao.sigla
			updateData.lotacaoNome = lotacao.nome
			updateData.lotacaoTipo = lotacao.tipo
			updateData.state = lotacao.uf
			updateData.city = lotacao.cidade
		}

		if (
			updateData.email &&
			(updateData.email as string).toLowerCase() !== currentUser.email.toLowerCase()
		) {
			const emailExists = await User.findOne({
				email: (updateData.email as string).toLowerCase(),
				_id: { $ne: id },
			})
			if (emailExists) {
				const error = createError.emailExists()
				return NextResponse.json(error.toJSON(), { status: error.statusCode })
			}

			emailChanged = true
			updateData.emailVerified = false
			updateData.verificationToken = crypto.randomBytes(32).toString('hex')
			updateData.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
		}

		// Perfil completo quando campos obrigatórios estão preenchidos
		const isAdmin = updateData.role === USER_ROLES.ADMIN
		const profileCompleted =
			Boolean(updateData.whatsapp) &&
			Boolean(updateData.lotacaoId) &&
			(isAdmin || Boolean(updateData.cargo))

		updateData.profileCompleted = profileCompleted

		const user = await User.findByIdAndUpdate(
			id,
			{ $set: updateData },
			{ new: true, runValidators: true }
		).select('-password -verificationToken -resetPasswordToken')

		if (emailChanged && user) {
			try {
				await sendEmailChangeVerification(
					user.email,
					updateData.verificationToken as string,
					user.name
				)
			} catch (emailError) {
				console.error('Failed to send verification email for email change:', emailError)
			}
		}

		return NextResponse.json({
			user,
			message: emailChanged
				? 'Perfil atualizado! Um email de verificação foi enviado para o novo endereço.'
				: 'Perfil atualizado com sucesso!',
		})
	} catch (err) {
		const { body, status } = formatErrorResponse(err, 'PUT /api/users/[id]')
		return NextResponse.json(body, { status })
	}
}
