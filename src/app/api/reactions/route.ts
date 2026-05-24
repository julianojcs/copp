// src/app/api/reactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Reaction } from '@/models/reaction'
import { Photo } from '@/models/photo'
import { Message } from '@/models/message'
import {
	REACTION_TYPES,
	REACTION_TARGET_TYPES,
	type ReactionType,
	type ReactionTargetType,
} from '@/lib/constants'
import {
	reactionUpsertSchema,
	reactionDeleteSchema,
	reactionQuerySchema,
} from '@/lib/validations'

/**
 * Verifies that the polymorphic target exists and is reactable.
 *
 * - `photo`: looks up the Photo collection.
 * - `message`: looks up the Message collection and rejects soft-deleted ones.
 */
async function targetExists(
	targetType: ReactionTargetType,
	targetId: string,
): Promise<boolean> {
	if (targetType === REACTION_TARGET_TYPES.PHOTO) {
		const photo = await Photo.findById(targetId).select('_id').lean()
		return photo !== null
	}
	if (targetType === REACTION_TARGET_TYPES.MESSAGE) {
		const message = await Message.findById(targetId)
			.select('_id deletedAt')
			.lean<{ _id: unknown; deletedAt?: Date } | null>()
		return message !== null && !message.deletedAt
	}
	return false
}

function zeroCounts(): Record<ReactionType, number> {
	const counts = {} as Record<ReactionType, number>
	for (const t of Object.values(REACTION_TYPES)) counts[t] = 0
	return counts
}

/**
 * POST /api/reactions
 *
 * Body: `{ targetType, targetId, type }`.
 * Upserts the reaction for the authenticated user on the given target,
 * enforcing one reaction per (user, target). Switching emoji is a
 * substitution, not an append.
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
		const parsed = reactionUpsertSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		const { targetType, targetId, type } = parsed.data

		await connectDB()

		const exists = await targetExists(
			targetType as ReactionTargetType,
			targetId,
		)
		if (!exists) {
			return NextResponse.json(
				{ error: 'Alvo não encontrado' },
				{ status: 404 },
			)
		}

		const reaction = await Reaction.findOneAndUpdate(
			{
				userId: session.user.id,
				targetType,
				targetId,
			},
			{ $set: { type } },
			{
				upsert: true,
				new: true,
				runValidators: true,
				setDefaultsOnInsert: true,
			},
		)

		return NextResponse.json({ reaction }, { status: 200 })
	} catch (err) {
		console.error('Reaction upsert error:', err)
		return NextResponse.json(
			{ error: 'Erro ao registrar reação. Tente novamente.' },
			{ status: 500 },
		)
	}
}

/**
 * DELETE /api/reactions
 *
 * Body: `{ targetType, targetId }`.
 * Removes the authenticated user's reaction on the given target.
 * Idempotent: no error if no reaction exists.
 */
export async function DELETE(req: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json(
				{ error: 'Não autenticado' },
				{ status: 401 },
			)
		}

		const json = await req.json().catch(() => null)
		const parsed = reactionDeleteSchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
				{ status: 400 },
			)
		}

		const { targetType, targetId } = parsed.data

		await connectDB()

		await Reaction.deleteOne({
			userId: session.user.id,
			targetType,
			targetId,
		})

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.error('Reaction delete error:', err)
		return NextResponse.json(
			{ error: 'Erro ao remover reação. Tente novamente.' },
			{ status: 500 },
		)
	}
}

interface AggregateBucket {
	_id: ReactionType
	count: number
}

/**
 * GET /api/reactions?targetType=&targetId=
 *
 * Returns aggregated reaction counts for the target plus the
 * authenticated user's current reaction (if any).
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
		const parsed = reactionQuerySchema.safeParse({
			targetType: searchParams.get('targetType'),
			targetId: searchParams.get('targetId'),
		})
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
				{ status: 400 },
			)
		}

		const { targetType, targetId } = parsed.data

		await connectDB()

		const [buckets, userReactionDoc] = await Promise.all([
			Reaction.aggregate([
				{ $match: { targetType, targetId } },
				{ $group: { _id: '$type', count: { $sum: 1 } } },
			]) as Promise<AggregateBucket[]>,
			Reaction.findOne({
				userId: session.user.id,
				targetType,
				targetId,
			}).lean<{ type: ReactionType } | null>(),
		])

		const counts = zeroCounts()
		let total = 0
		for (const b of buckets) {
			if (b._id in counts) {
				counts[b._id] = b.count
				total += b.count
			}
		}

		return NextResponse.json(
			{
				counts,
				total,
				userReaction: userReactionDoc?.type ?? null,
			},
			{ status: 200 },
		)
	} catch (err) {
		console.error('Reaction list error:', err)
		return NextResponse.json(
			{ error: 'Erro ao carregar reações. Tente novamente.' },
			{ status: 500 },
		)
	}
}
