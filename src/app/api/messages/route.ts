// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Message } from '@/models/message'
import { MESSAGE_LIST_DEFAULT_LIMIT } from '@/lib/constants'
import {
	messageCreateSchema,
	messageListQuerySchema,
} from '@/lib/validations'

const DELETED_BODY_MASK = 'Mensagem removida'

/**
 * POST /api/messages
 *
 * Body: `{ body, image? }`. Creates a new message authored by the
 * current session user. Text is required even when an image is
 * attached — image-only posts are rejected at the schema level.
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
		const parsed = messageCreateSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		await connectDB()

		const message = await Message.create({
			authorId: session.user.id,
			body: parsed.data.body,
			...(parsed.data.image ? { image: parsed.data.image } : {}),
		})

		return NextResponse.json({ message }, { status: 201 })
	} catch (err) {
		console.error('Message create error:', err)
		return NextResponse.json(
			{ error: 'Erro ao publicar mensagem. Tente novamente.' },
			{ status: 500 },
		)
	}
}

interface AggregatedMessage {
	_id: Types.ObjectId
	author: {
		_id: Types.ObjectId
		name: string
		avatar?: string | null
		cargo?: string | null
		lotacaoSigla?: string | null
	}
	body: string
	image?: {
		url: string
		publicId: string
		width: number
		height: number
	} | null
	editedAt: Date | null
	deletedAt: Date | null
	createdAt: Date
	updatedAt: Date
	reactionsCount: number
	commentsCount: number
}

/**
 * GET /api/messages?cursor=&limit=
 *
 * Paginated newest-first feed of messages. The author is joined and
 * projected to safe fields only (no email/whatsapp). Reaction and
 * comment counts are aggregated in a single pipeline — no N+1.
 *
 * Soft-deleted messages are kept in the list (so threads stay
 * coherent), but their `body` is masked and `image` is stripped.
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
		const parsed = messageListQuerySchema.safeParse({
			cursor: searchParams.get('cursor') ?? undefined,
			limit: searchParams.get('limit') ?? undefined,
		})
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
				{ status: 400 },
			)
		}

		const limit = parsed.data.limit ?? MESSAGE_LIST_DEFAULT_LIMIT
		const cursor = parsed.data.cursor

		await connectDB()

		const matchStage: Record<string, unknown> = {}
		if (cursor) matchStage.createdAt = { $lt: new Date(cursor) }

		const docs = (await Message.aggregate([
			{ $match: matchStage },
			{ $sort: { createdAt: -1 } },
			{ $limit: limit + 1 },
			{
				$lookup: {
					from: 'users',
					localField: 'authorId',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								name: 1,
								avatar: 1,
								cargo: 1,
								lotacaoSigla: 1,
							},
						},
					],
					as: 'author',
				},
			},
			{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
			{
				$lookup: {
					from: 'reactions',
					let: { msgId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$targetType', 'message'] },
										{ $eq: ['$targetId', '$$msgId'] },
									],
								},
							},
						},
						{ $count: 'count' },
					],
					as: 'reactionsAgg',
				},
			},
			{
				$lookup: {
					from: 'comments',
					let: { msgId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$targetType', 'message'] },
										{ $eq: ['$targetId', '$$msgId'] },
										{ $not: ['$deletedAt'] },
									],
								},
							},
						},
						{ $count: 'count' },
					],
					as: 'commentsAgg',
				},
			},
			{
				$addFields: {
					reactionsCount: {
						$ifNull: [{ $arrayElemAt: ['$reactionsAgg.count', 0] }, 0],
					},
					commentsCount: {
						$ifNull: [{ $arrayElemAt: ['$commentsAgg.count', 0] }, 0],
					},
				},
			},
			{
				$project: {
					authorId: 0,
					reactionsAgg: 0,
					commentsAgg: 0,
					updatedAt: 0,
				},
			},
		])) as unknown as AggregatedMessage[]

		const hasMore = docs.length > limit
		const pageDocs = hasMore ? docs.slice(0, limit) : docs

		const items = pageDocs.map((m) => {
			if (m.deletedAt) {
				return { ...m, body: DELETED_BODY_MASK, image: null }
			}
			return m
		})

		const nextCursor = hasMore
			? pageDocs[pageDocs.length - 1].createdAt.toISOString()
			: null

		return NextResponse.json({ items, nextCursor }, { status: 200 })
	} catch (err) {
		console.error('Message list error:', err)
		return NextResponse.json(
			{ error: 'Erro ao carregar mensagens. Tente novamente.' },
			{ status: 500 },
		)
	}
}
