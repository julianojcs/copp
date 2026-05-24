// src/app/api/messages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Message } from '@/models/message'
import { USER_ROLES } from '@/lib/constants'
import { messageUpdateSchema } from '@/lib/validations'

interface RouteParams {
	params: Promise<{ id: string }>
}

// Same safe author projection used by the feed list.
const AUTHOR_PROJECTION = 'name avatar cargo lotacaoSigla'

/**
 * GET /api/messages/[id]
 *
 * Returns the message with the author populated (safe fields only).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const { id } = await params
		await connectDB()

		const message = await Message.findById(id)
			.populate('authorId', AUTHOR_PROJECTION)
			.lean()

		if (!message) {
			return NextResponse.json(
				{ error: 'Mensagem não encontrada' },
				{ status: 404 },
			)
		}

		return NextResponse.json({ message }, { status: 200 })
	} catch (err) {
		console.error('Message detail error:', err)
		return NextResponse.json(
			{ error: 'Erro ao carregar mensagem. Tente novamente.' },
			{ status: 500 },
		)
	}
}

/**
 * PATCH /api/messages/[id]
 *
 * Edits the body of a message. Author-only — admins cannot rewrite
 * someone else's words. Sets `editedAt`. Returns 410 if the message
 * was already soft-deleted.
 *
 * Replacing the attached image is not exposed here: clients should
 * upload via `/api/upload` and either delete + re-create the message,
 * or wait for a future dedicated endpoint.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const json = await req.json().catch(() => null)
		const parsed = messageUpdateSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		const { id } = await params
		await connectDB()

		const message = await Message.findById(id)
		if (!message) {
			return NextResponse.json(
				{ error: 'Mensagem não encontrada' },
				{ status: 404 },
			)
		}

		if (message.deletedAt) {
			return NextResponse.json(
				{ error: 'Mensagem foi removida e não pode ser editada' },
				{ status: 410 },
			)
		}

		if (message.authorId.toString() !== session.user.id) {
			return NextResponse.json(
				{ error: 'Apenas o autor pode editar a mensagem' },
				{ status: 403 },
			)
		}

		message.body = parsed.data.body
		message.editedAt = new Date()
		await message.save()

		return NextResponse.json({ message }, { status: 200 })
	} catch (err) {
		console.error('Message update error:', err)
		return NextResponse.json(
			{ error: 'Erro ao editar mensagem. Tente novamente.' },
			{ status: 500 },
		)
	}
}

/**
 * DELETE /api/messages/[id]
 *
 * Soft-deletes by setting `deletedAt`. Author can delete their own;
 * admin can delete any. Idempotent on already-deleted messages.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const { id } = await params
		await connectDB()

		const message = await Message.findById(id)
		if (!message) {
			return NextResponse.json(
				{ error: 'Mensagem não encontrada' },
				{ status: 404 },
			)
		}

		if (message.deletedAt) {
			return NextResponse.json({ success: true }, { status: 200 })
		}

		const isAuthor = message.authorId.toString() === session.user.id
		const isAdmin = session.user.role === USER_ROLES.ADMIN
		if (!isAuthor && !isAdmin) {
			return NextResponse.json(
				{
					error:
						'Apenas o autor ou um administrador pode remover a mensagem',
				},
				{ status: 403 },
			)
		}

		message.deletedAt = new Date()
		await message.save()

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.error('Message delete error:', err)
		return NextResponse.json(
			{ error: 'Erro ao remover mensagem. Tente novamente.' },
			{ status: 500 },
		)
	}
}
