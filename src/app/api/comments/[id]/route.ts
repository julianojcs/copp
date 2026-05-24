// src/app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Comment } from '@/models/comment'
import { USER_ROLES } from '@/lib/constants'
import { commentUpdateSchema } from '@/lib/validations'

interface RouteParams {
	params: Promise<{ id: string }>
}

/**
 * PATCH /api/comments/[id]
 *
 * Edits the body of an existing comment. Author-only — admins cannot
 * rewrite someone else's words. Sets `editedAt`. Returns 410 if the
 * comment was already soft-deleted.
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
		const parsed = commentUpdateSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		const { id } = await params

		await connectDB()

		const comment = await Comment.findById(id)
		if (!comment) {
			return NextResponse.json(
				{ error: 'Comentário não encontrado' },
				{ status: 404 },
			)
		}

		if (comment.deletedAt) {
			return NextResponse.json(
				{ error: 'Comentário foi removido e não pode ser editado' },
				{ status: 410 },
			)
		}

		// Edit is author-only — even admins cannot rewrite someone else's words.
		if (comment.userId.toString() !== session.user.id) {
			return NextResponse.json(
				{ error: 'Apenas o autor pode editar o comentário' },
				{ status: 403 },
			)
		}

		comment.body = parsed.data.body
		comment.editedAt = new Date()
		await comment.save()

		return NextResponse.json({ comment }, { status: 200 })
	} catch (err) {
		console.error('Comment update error:', err)
		return NextResponse.json(
			{ error: 'Erro ao editar comentário. Tente novamente.' },
			{ status: 500 },
		)
	}
}

/**
 * DELETE /api/comments/[id]
 *
 * Soft-deletes the comment by setting `deletedAt`. The author can
 * delete their own comments; admins can delete any. Idempotent —
 * deleting an already-deleted comment returns 200 without writing.
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

		const comment = await Comment.findById(id)
		if (!comment) {
			return NextResponse.json(
				{ error: 'Comentário não encontrado' },
				{ status: 404 },
			)
		}

		if (comment.deletedAt) {
			return NextResponse.json({ success: true }, { status: 200 })
		}

		const isAuthor = comment.userId.toString() === session.user.id
		const isAdmin = session.user.role === USER_ROLES.ADMIN
		if (!isAuthor && !isAdmin) {
			return NextResponse.json(
				{
					error:
						'Apenas o autor ou um administrador pode remover o comentário',
				},
				{ status: 403 },
			)
		}

		comment.deletedAt = new Date()
		await comment.save()

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.error('Comment delete error:', err)
		return NextResponse.json(
			{ error: 'Erro ao remover comentário. Tente novamente.' },
			{ status: 500 },
		)
	}
}
