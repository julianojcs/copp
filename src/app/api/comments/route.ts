// src/app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Comment } from '@/models/comment'
import { Photo } from '@/models/photo'
import { Message } from '@/models/message'
import {
	COMMENT_TARGET_TYPES,
	COMMENT_LIST_DEFAULT_LIMIT,
	type CommentTargetType,
} from '@/lib/constants'
import {
	commentCreateSchema,
	commentListQuerySchema,
} from '@/lib/validations'

/**
 * Verifies that the polymorphic target exists and is commentable.
 *
 * - `photo`: looks up the Photo collection.
 * - `message`: looks up the Message collection and rejects soft-deleted ones.
 */
async function targetExists(
	targetType: CommentTargetType,
	targetId: string,
): Promise<boolean> {
	if (targetType === COMMENT_TARGET_TYPES.PHOTO) {
		const photo = await Photo.findById(targetId).select('_id').lean()
		return photo !== null
	}
	if (targetType === COMMENT_TARGET_TYPES.MESSAGE) {
		const message = await Message.findById(targetId)
			.select('_id deletedAt')
			.lean<{ _id: unknown; deletedAt?: Date } | null>()
		return message !== null && !message.deletedAt
	}
	return false
}

// Only safe author fields — no email, whatsapp, contact data.
const AUTHOR_PROJECTION = 'name avatar cargo lotacaoSigla'
const DELETED_MASK = 'Comentário removido'

interface PopulatedAuthor {
	_id: unknown
	name: string
	avatar?: string
	cargo?: string
	lotacaoSigla?: string
}

interface RawComment {
	_id: unknown
	userId: PopulatedAuthor
	targetType: CommentTargetType
	targetId: unknown
	body: string
	editedAt?: Date | null
	deletedAt?: Date | null
	createdAt: Date
	updatedAt: Date
}

/**
 * POST /api/comments
 *
 * Body: `{ targetType, targetId, body }`. Creates a comment authored
 * by the current session user. Target must exist or 404 is returned.
 */
export async function POST(req: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const json = await req.json().catch(() => null)
		const parsed = commentCreateSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		const { targetType, targetId, body } = parsed.data

		await connectDB()

		const exists = await targetExists(
			targetType as CommentTargetType,
			targetId,
		)
		if (!exists) {
			return NextResponse.json(
				{ error: 'Alvo não encontrado' },
				{ status: 404 },
			)
		}

		const created = await Comment.create({
			userId: session.user.id,
			targetType,
			targetId,
			body,
		})

		return NextResponse.json({ comment: created }, { status: 201 })
	} catch (err) {
		console.error('Comment create error:', err)
		return NextResponse.json(
			{ error: 'Erro ao criar comentário. Tente novamente.' },
			{ status: 500 },
		)
	}
}

/**
 * GET /api/comments?targetType=&targetId=&cursor=&limit=&includeDeleted=
 *
 * Paginated comments for a target, newest first, cursor-based.
 * Soft-deleted comments are excluded unless `includeDeleted=true`,
 * in which case their body is masked as "Comentário removido".
 */
export async function GET(req: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const { searchParams } = new URL(req.url)
		const parsed = commentListQuerySchema.safeParse({
			targetType: searchParams.get('targetType'),
			targetId: searchParams.get('targetId'),
			cursor: searchParams.get('cursor') ?? undefined,
			limit: searchParams.get('limit') ?? undefined,
			includeDeleted: searchParams.get('includeDeleted') ?? undefined,
		})
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
				{ status: 400 },
			)
		}

		const {
			targetType,
			targetId,
			cursor,
			includeDeleted,
		} = parsed.data
		const limit = parsed.data.limit ?? COMMENT_LIST_DEFAULT_LIMIT

		await connectDB()

		const filter: Record<string, unknown> = { targetType, targetId }
		if (!includeDeleted) {
			filter.deletedAt = { $exists: false }
		}
		if (cursor) {
			filter.createdAt = { $lt: new Date(cursor) }
		}

		// Fetch limit+1 to determine if there's a next page.
		const docs = (await Comment.find(filter)
			.sort({ createdAt: -1 })
			.limit(limit + 1)
			.populate('userId', AUTHOR_PROJECTION)
			.lean()) as unknown as RawComment[]

		const hasMore = docs.length > limit
		const pageDocs = hasMore ? docs.slice(0, limit) : docs

		const items = pageDocs.map((c) => ({
			...c,
			body: c.deletedAt ? DELETED_MASK : c.body,
		}))

		const nextCursor = hasMore
			? pageDocs[pageDocs.length - 1].createdAt.toISOString()
			: null

		return NextResponse.json({ items, nextCursor }, { status: 200 })
	} catch (err) {
		console.error('Comment list error:', err)
		return NextResponse.json(
			{ error: 'Erro ao carregar comentários. Tente novamente.' },
			{ status: 500 },
		)
	}
}
