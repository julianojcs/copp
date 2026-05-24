// src/app/api/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Photo } from '@/models/photo'
import { Comment } from '@/models/comment'
import { Message } from '@/models/message'
import { USER_STATUS } from '@/lib/constants'
import { timelineQuerySchema } from '@/lib/validations'
import {
	TIMELINE_DEFAULT_LIMIT,
	TIMELINE_CANDIDATE_MULTIPLIER,
	MESSAGE_EXCERPT_MAX_LENGTH,
	computeScore,
	type TimelineEvent,
	type TimelineUser,
} from '@/lib/timeline-types'

/**
 * Safe author projection for $lookup pipelines.
 * Drops email / whatsapp / password / status / etc.
 */
const SAFE_AUTHOR_PROJECT = {
	_id: 1,
	name: 1,
	avatar: 1,
	cargo: 1,
	lotacaoSigla: 1,
} as const

interface RawUser {
	_id: Types.ObjectId
	name: string
	avatar?: string
	cargo?: string
	lotacaoSigla?: string
	createdAt: Date
}

interface RawPhotoPosted {
	_id: Types.ObjectId
	author: RawUser
	url: string
	thumbnailUrl?: string
	title?: string
	description?: string
	location?: string
	createdAt: Date
	reactionsCount?: number
	commentsCount?: number
}

interface RawPhotoCommented {
	_id: Types.ObjectId
	body: string
	deletedAt?: Date | null
	createdAt: Date
	author: RawUser
	photo: {
		_id: Types.ObjectId
		url: string
		thumbnailUrl?: string
		title?: string
	}
}

interface RawMessagePosted {
	_id: Types.ObjectId
	body: string
	image?: {
		url: string
		width: number
		height: number
	} | null
	editedAt?: Date | null
	deletedAt?: Date | null
	createdAt: Date
	author: RawUser
	reactionsCount?: number
	commentsCount?: number
}

interface RawMessageCommented {
	_id: Types.ObjectId
	body: string
	deletedAt?: Date | null
	createdAt: Date
	author: RawUser
	message: {
		_id: Types.ObjectId
		body: string
		author: RawUser
	}
}

function userPayload(u: RawUser): TimelineUser {
	return {
		_id: u._id.toString(),
		name: u.name,
		avatar: u.avatar ?? null,
		cargo: u.cargo ?? null,
		lotacaoSigla: u.lotacaoSigla ?? null,
	}
}

function excerpt(s: string, max = MESSAGE_EXCERPT_MAX_LENGTH): string {
	if (s.length <= max) return s
	return s.slice(0, max - 1).trimEnd() + '…'
}

/**
 * GET /api/timeline?cursor=&limit=
 *
 * Runs five parallel candidate queries (one per event type), merges
 * them, scores each item with `computeScore`, sorts by score, and
 * returns the top `limit` items.
 *
 * Pagination uses a `createdAt` cursor: the next page starts strictly
 * before the oldest createdAt in this page's *candidate pool* (so
 * items skipped due to ranking won't reappear).
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
		const parsed = timelineQuerySchema.safeParse({
			cursor: searchParams.get('cursor') ?? undefined,
			limit: searchParams.get('limit') ?? undefined,
		})
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
				{ status: 400 },
			)
		}

		const limit = parsed.data.limit ?? TIMELINE_DEFAULT_LIMIT
		const cursor = parsed.data.cursor
		const beforeDate = cursor ? new Date(cursor) : null
		const perTypeLimit = limit * TIMELINE_CANDIDATE_MULTIPLIER

		await connectDB()

		const dateFilter: Record<string, unknown> = beforeDate
			? { createdAt: { $lt: beforeDate } }
			: {}

		const [
			newMembersRaw,
			photosPostedRaw,
			photoCommentsRaw,
			messagesPostedRaw,
			messageCommentsRaw,
		] = await Promise.all([
			fetchNewMembers(dateFilter, perTypeLimit),
			fetchPhotosPosted(dateFilter, perTypeLimit),
			fetchPhotoComments(dateFilter, perTypeLimit),
			fetchMessagesPosted(dateFilter, perTypeLimit),
			fetchMessageComments(dateFilter, perTypeLimit),
		])

		const now = new Date()
		const candidates: TimelineEvent[] = [
			...newMembersRaw.map((u) =>
				toNewMemberEvent(u, now),
			),
			...photosPostedRaw.map((p) =>
				toPhotoPostedEvent(p, now),
			),
			...photoCommentsRaw.map((c) =>
				toPhotoCommentedEvent(c, now),
			),
			...messagesPostedRaw.map((m) =>
				toMessagePostedEvent(m, now),
			),
			...messageCommentsRaw.map((c) =>
				toMessageCommentedEvent(c, now),
			),
		]

		candidates.sort((a, b) => b.score - a.score)
		const items = candidates.slice(0, limit)

		// Next cursor: oldest createdAt across ALL candidates (so we don't
		// loop back to items skipped by ranking).
		let nextCursor: string | null = null
		const fullPool =
			newMembersRaw.length === perTypeLimit ||
			photosPostedRaw.length === perTypeLimit ||
			photoCommentsRaw.length === perTypeLimit ||
			messagesPostedRaw.length === perTypeLimit ||
			messageCommentsRaw.length === perTypeLimit
		if (fullPool && candidates.length > 0) {
			let oldest = candidates[0].createdAt
			for (const c of candidates) {
				if (c.createdAt < oldest) oldest = c.createdAt
			}
			nextCursor = oldest
		}

		return NextResponse.json({ items, nextCursor }, { status: 200 })
	} catch (err) {
		console.error('Timeline error:', err)
		return NextResponse.json(
			{ error: 'Erro ao carregar timeline. Tente novamente.' },
			{ status: 500 },
		)
	}
}

async function fetchNewMembers(
	dateFilter: Record<string, unknown>,
	perTypeLimit: number,
): Promise<RawUser[]> {
	return (await User.find({
		...dateFilter,
		status: USER_STATUS.APPROVED,
		isActive: true,
	})
		.sort({ createdAt: -1 })
		.limit(perTypeLimit)
		.select('_id name avatar cargo lotacaoSigla createdAt')
		.lean()) as unknown as RawUser[]
}

async function fetchPhotosPosted(
	dateFilter: Record<string, unknown>,
	perTypeLimit: number,
): Promise<RawPhotoPosted[]> {
	return (await Photo.aggregate([
		{ $match: { ...dateFilter, isPublic: true } },
		{ $sort: { createdAt: -1 } },
		{ $limit: perTypeLimit },
		{
			$lookup: {
				from: 'users',
				localField: 'uploadedBy',
				foreignField: '_id',
				pipeline: [{ $project: SAFE_AUTHOR_PROJECT }],
				as: 'author',
			},
		},
		{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'reactions',
				let: { pid: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $eq: ['$targetType', 'photo'] },
									{ $eq: ['$targetId', '$$pid'] },
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
				let: { pid: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $eq: ['$targetType', 'photo'] },
									{ $eq: ['$targetId', '$$pid'] },
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
				_id: 1,
				url: 1,
				thumbnailUrl: 1,
				title: 1,
				description: 1,
				location: 1,
				createdAt: 1,
				author: 1,
				reactionsCount: 1,
				commentsCount: 1,
			},
		},
	])) as unknown as RawPhotoPosted[]
}

async function fetchPhotoComments(
	dateFilter: Record<string, unknown>,
	perTypeLimit: number,
): Promise<RawPhotoCommented[]> {
	return (await Comment.aggregate([
		{
			$match: {
				...dateFilter,
				targetType: 'photo',
				deletedAt: { $exists: false },
			},
		},
		{ $sort: { createdAt: -1 } },
		{ $limit: perTypeLimit },
		{
			$lookup: {
				from: 'users',
				localField: 'userId',
				foreignField: '_id',
				pipeline: [{ $project: SAFE_AUTHOR_PROJECT }],
				as: 'author',
			},
		},
		{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'photos',
				localField: 'targetId',
				foreignField: '_id',
				pipeline: [
					{ $project: { _id: 1, url: 1, thumbnailUrl: 1, title: 1 } },
				],
				as: 'photo',
			},
		},
		{ $unwind: { path: '$photo', preserveNullAndEmptyArrays: true } },
		{
			$project: {
				_id: 1,
				body: 1,
				deletedAt: 1,
				createdAt: 1,
				author: 1,
				photo: 1,
			},
		},
	])) as unknown as RawPhotoCommented[]
}

async function fetchMessagesPosted(
	dateFilter: Record<string, unknown>,
	perTypeLimit: number,
): Promise<RawMessagePosted[]> {
	return (await Message.aggregate([
		{ $match: { ...dateFilter } },
		{ $sort: { createdAt: -1 } },
		{ $limit: perTypeLimit },
		{
			$lookup: {
				from: 'users',
				localField: 'authorId',
				foreignField: '_id',
				pipeline: [{ $project: SAFE_AUTHOR_PROJECT }],
				as: 'author',
			},
		},
		{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'reactions',
				let: { mid: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $eq: ['$targetType', 'message'] },
									{ $eq: ['$targetId', '$$mid'] },
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
				let: { mid: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $eq: ['$targetType', 'message'] },
									{ $eq: ['$targetId', '$$mid'] },
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
				_id: 1,
				body: 1,
				image: 1,
				editedAt: 1,
				deletedAt: 1,
				createdAt: 1,
				author: 1,
				reactionsCount: 1,
				commentsCount: 1,
			},
		},
	])) as unknown as RawMessagePosted[]
}

async function fetchMessageComments(
	dateFilter: Record<string, unknown>,
	perTypeLimit: number,
): Promise<RawMessageCommented[]> {
	return (await Comment.aggregate([
		{
			$match: {
				...dateFilter,
				targetType: 'message',
				deletedAt: { $exists: false },
			},
		},
		{ $sort: { createdAt: -1 } },
		{ $limit: perTypeLimit },
		{
			$lookup: {
				from: 'users',
				localField: 'userId',
				foreignField: '_id',
				pipeline: [{ $project: SAFE_AUTHOR_PROJECT }],
				as: 'author',
			},
		},
		{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'messages',
				localField: 'targetId',
				foreignField: '_id',
				pipeline: [
					{
						$lookup: {
							from: 'users',
							localField: 'authorId',
							foreignField: '_id',
							pipeline: [{ $project: SAFE_AUTHOR_PROJECT }],
							as: 'author',
						},
					},
					{ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
					{ $project: { _id: 1, body: 1, author: 1 } },
				],
				as: 'message',
			},
		},
		{ $unwind: { path: '$message', preserveNullAndEmptyArrays: true } },
		{
			$project: {
				_id: 1,
				body: 1,
				deletedAt: 1,
				createdAt: 1,
				author: 1,
				message: 1,
			},
		},
	])) as unknown as RawMessageCommented[]
}

function toNewMemberEvent(u: RawUser, now: Date): TimelineEvent {
	return {
		kind: 'new_member',
		_id: u._id.toString(),
		createdAt: u.createdAt.toISOString(),
		score: computeScore({ createdAt: u.createdAt, now }),
		user: userPayload(u),
	}
}

function toPhotoPostedEvent(p: RawPhotoPosted, now: Date): TimelineEvent {
	return {
		kind: 'photo_posted',
		_id: p._id.toString(),
		createdAt: p.createdAt.toISOString(),
		score: computeScore({
			createdAt: p.createdAt,
			reactionsCount: p.reactionsCount,
			commentsCount: p.commentsCount,
			now,
		}),
		author: userPayload(p.author),
		photo: {
			_id: p._id.toString(),
			url: p.url,
			thumbnailUrl: p.thumbnailUrl ?? null,
			title: p.title ?? null,
			description: p.description ?? null,
			location: p.location ?? null,
		},
		reactionsCount: p.reactionsCount ?? 0,
		commentsCount: p.commentsCount ?? 0,
	}
}

function toPhotoCommentedEvent(c: RawPhotoCommented, now: Date): TimelineEvent {
	return {
		kind: 'photo_commented',
		_id: c._id.toString(),
		createdAt: c.createdAt.toISOString(),
		score: computeScore({ createdAt: c.createdAt, now }),
		body: c.deletedAt ? 'Comentário removido' : c.body,
		deletedAt: c.deletedAt?.toISOString() ?? null,
		author: userPayload(c.author),
		photo: {
			_id: c.photo._id.toString(),
			url: c.photo.url,
			thumbnailUrl: c.photo.thumbnailUrl ?? null,
			title: c.photo.title ?? null,
		},
	}
}

function toMessagePostedEvent(m: RawMessagePosted, now: Date): TimelineEvent {
	return {
		kind: 'message_posted',
		_id: m._id.toString(),
		createdAt: m.createdAt.toISOString(),
		editedAt: m.editedAt?.toISOString() ?? null,
		deletedAt: m.deletedAt?.toISOString() ?? null,
		score: computeScore({
			createdAt: m.createdAt,
			reactionsCount: m.reactionsCount,
			commentsCount: m.commentsCount,
			now,
		}),
		author: userPayload(m.author),
		body: m.deletedAt ? 'Mensagem removida' : m.body,
		image: m.deletedAt
			? null
			: m.image
				? { url: m.image.url, width: m.image.width, height: m.image.height }
				: null,
		reactionsCount: m.reactionsCount ?? 0,
		commentsCount: m.commentsCount ?? 0,
	}
}

function toMessageCommentedEvent(
	c: RawMessageCommented,
	now: Date,
): TimelineEvent {
	return {
		kind: 'message_commented',
		_id: c._id.toString(),
		createdAt: c.createdAt.toISOString(),
		score: computeScore({ createdAt: c.createdAt, now }),
		body: c.deletedAt ? 'Comentário removido' : c.body,
		deletedAt: c.deletedAt?.toISOString() ?? null,
		author: userPayload(c.author),
		message: {
			_id: c.message._id.toString(),
			bodyExcerpt: excerpt(c.message.body),
			author: userPayload(c.message.author),
		},
	}
}
