// src/models/__tests__/reaction.test.ts
import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { Reaction } from '@/models/reaction'
import {
	REACTION_TYPES,
	REACTION_TARGET_TYPES,
} from '@/lib/constants'

function buildDoc(overrides: Record<string, unknown> = {}) {
	return new Reaction({
		userId: new Types.ObjectId(),
		targetType: REACTION_TARGET_TYPES.PHOTO,
		targetId: new Types.ObjectId(),
		type: REACTION_TYPES.LIKE,
		...overrides,
	})
}

describe('Reaction model', () => {
	it('accepts a valid document', () => {
		const doc = buildDoc()
		const err = doc.validateSync()
		expect(err).toBeUndefined()
	})

	it('requires userId', () => {
		const doc = buildDoc({ userId: undefined })
		const err = doc.validateSync()
		expect(err?.errors?.userId).toBeDefined()
	})

	it('requires targetType', () => {
		const doc = buildDoc({ targetType: undefined })
		const err = doc.validateSync()
		expect(err?.errors?.targetType).toBeDefined()
	})

	it('requires targetId', () => {
		const doc = buildDoc({ targetId: undefined })
		const err = doc.validateSync()
		expect(err?.errors?.targetId).toBeDefined()
	})

	it('requires type', () => {
		const doc = buildDoc({ type: undefined })
		const err = doc.validateSync()
		expect(err?.errors?.type).toBeDefined()
	})

	it('rejects targetType outside enum', () => {
		const doc = buildDoc({ targetType: 'comment' })
		const err = doc.validateSync()
		expect(err?.errors?.targetType).toBeDefined()
	})

	it('rejects type outside enum', () => {
		const doc = buildDoc({ type: 'thumbs-up' })
		const err = doc.validateSync()
		expect(err?.errors?.type).toBeDefined()
	})

	it('accepts each known REACTION_TYPES value', () => {
		for (const type of Object.values(REACTION_TYPES)) {
			const err = buildDoc({ type }).validateSync()
			expect(err).toBeUndefined()
		}
	})

	it('accepts each known REACTION_TARGET_TYPES value', () => {
		for (const targetType of Object.values(REACTION_TARGET_TYPES)) {
			const err = buildDoc({ targetType }).validateSync()
			expect(err).toBeUndefined()
		}
	})

	it('declares a unique compound index on (userId, targetType, targetId)', () => {
		const indexes = Reaction.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const uniqueIndex = indexes.find(
			([, opts]) => (opts as { unique?: boolean })?.unique === true,
		)
		expect(uniqueIndex).toBeDefined()
		expect(uniqueIndex?.[0]).toEqual({
			userId: 1,
			targetType: 1,
			targetId: 1,
		})
	})

	it('declares an index for listing by target', () => {
		const indexes = Reaction.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const listingIndex = indexes.find(([fields]) => {
			return (
				fields.targetType === 1 &&
				fields.targetId === 1 &&
				fields.createdAt === -1
			)
		})
		expect(listingIndex).toBeDefined()
	})
})
