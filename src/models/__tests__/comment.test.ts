// src/models/__tests__/comment.test.ts
import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { Comment } from '@/models/comment'
import {
	COMMENT_TARGET_TYPES,
	COMMENT_BODY_MAX_LENGTH,
} from '@/lib/constants'

function buildDoc(overrides: Record<string, unknown> = {}) {
	return new Comment({
		userId: new Types.ObjectId(),
		targetType: COMMENT_TARGET_TYPES.PHOTO,
		targetId: new Types.ObjectId(),
		body: 'Foto incrível!',
		...overrides,
	})
}

describe('Comment model', () => {
	it('accepts a valid document', () => {
		expect(buildDoc().validateSync()).toBeUndefined()
	})

	it('requires userId', () => {
		expect(buildDoc({ userId: undefined }).validateSync()?.errors?.userId).toBeDefined()
	})

	it('requires targetType', () => {
		expect(buildDoc({ targetType: undefined }).validateSync()?.errors?.targetType).toBeDefined()
	})

	it('requires targetId', () => {
		expect(buildDoc({ targetId: undefined }).validateSync()?.errors?.targetId).toBeDefined()
	})

	it('requires body', () => {
		expect(buildDoc({ body: undefined }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects empty body after trim', () => {
		expect(buildDoc({ body: '   ' }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects body longer than COMMENT_BODY_MAX_LENGTH', () => {
		const longBody = 'a'.repeat(COMMENT_BODY_MAX_LENGTH + 1)
		expect(buildDoc({ body: longBody }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects targetType outside enum', () => {
		expect(buildDoc({ targetType: 'event' }).validateSync()?.errors?.targetType).toBeDefined()
	})

	it('accepts each known COMMENT_TARGET_TYPES value', () => {
		for (const t of Object.values(COMMENT_TARGET_TYPES)) {
			expect(buildDoc({ targetType: t }).validateSync()).toBeUndefined()
		}
	})

	it('declares an index for listing by target newest-first', () => {
		const indexes = Comment.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const listingIndex = indexes.find(
			([f]) =>
				f.targetType === 1 && f.targetId === 1 && f.createdAt === -1,
		)
		expect(listingIndex).toBeDefined()
	})

	it('declares an index for listing by author newest-first', () => {
		const indexes = Comment.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const authorIndex = indexes.find(
			([f]) => f.userId === 1 && f.createdAt === -1,
		)
		expect(authorIndex).toBeDefined()
	})

	it('has editedAt and deletedAt fields for soft-delete + edit metadata', () => {
		const doc = buildDoc()
		const paths = Object.keys(doc.schema.paths)
		expect(paths).toContain('editedAt')
		expect(paths).toContain('deletedAt')
	})
})
