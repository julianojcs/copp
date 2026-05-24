// src/lib/timeline-types.ts

/**
 * Shared timeline event types used by both the API and the UI.
 *
 * Each event is a discriminated union by `kind`. Keeping the union here
 * (separate from the route handler) lets the client render items
 * without re-declaring the shape.
 */

export interface TimelineUser {
	_id: string
	name: string
	avatar?: string | null
	cargo?: string | null
	lotacaoSigla?: string | null
}

export interface NewMemberEvent {
	kind: 'new_member'
	_id: string
	createdAt: string
	score: number
	user: TimelineUser
}

export interface PhotoPostedEvent {
	kind: 'photo_posted'
	_id: string
	createdAt: string
	score: number
	author: TimelineUser
	photo: {
		_id: string
		url: string
		thumbnailUrl?: string | null
		title?: string | null
		description?: string | null
		location?: string | null
	}
	reactionsCount: number
	commentsCount: number
}

export interface PhotoCommentedEvent {
	kind: 'photo_commented'
	_id: string
	createdAt: string
	score: number
	body: string
	deletedAt?: string | null
	author: TimelineUser
	photo: {
		_id: string
		url: string
		thumbnailUrl?: string | null
		title?: string | null
	}
}

export interface MessagePostedEvent {
	kind: 'message_posted'
	_id: string
	createdAt: string
	editedAt?: string | null
	deletedAt?: string | null
	score: number
	author: TimelineUser
	body: string
	image?: {
		url: string
		width: number
		height: number
	} | null
	reactionsCount: number
	commentsCount: number
}

export interface MessageCommentedEvent {
	kind: 'message_commented'
	_id: string
	createdAt: string
	score: number
	body: string
	deletedAt?: string | null
	author: TimelineUser
	message: {
		_id: string
		bodyExcerpt: string
		author: TimelineUser
	}
}

export type TimelineEvent =
	| NewMemberEvent
	| PhotoPostedEvent
	| PhotoCommentedEvent
	| MessagePostedEvent
	| MessageCommentedEvent

export interface TimelinePage {
	items: TimelineEvent[]
	nextCursor: string | null
}

/**
 * Score formula. Higher = ranked first.
 *
 * For posts with engagement (photo_posted, message_posted) we boost
 * by a logarithmic engagement signal; everything decays with age.
 * Other event types use age-only.
 */
export function computeScore(args: {
	createdAt: Date
	reactionsCount?: number
	commentsCount?: number
	now?: Date
}): number {
	const now = args.now ?? new Date()
	const hoursOld = (now.getTime() - args.createdAt.getTime()) / 3_600_000
	const decay = hoursOld / 12
	const engagement =
		(args.reactionsCount ?? 0) + (args.commentsCount ?? 0) * 2
	const score = engagement === 0
		? -decay
		: Math.log10(engagement + 1) - decay
	// Normalize -0 → 0 so equality checks on the zero score behave predictably.
	return score === 0 ? 0 : score
}

export const TIMELINE_DEFAULT_LIMIT = 20
export const TIMELINE_MAX_LIMIT = 50

/**
 * Per-type candidate pool size = `limit * CANDIDATE_MULTIPLIER`.
 * Bigger pool → more accurate ranking, more DB cost. v1 starts at 3.
 */
export const TIMELINE_CANDIDATE_MULTIPLIER = 3

export const MESSAGE_EXCERPT_MAX_LENGTH = 120
