// src/models/__tests__/message.test.ts
import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { Message } from '@/models/message'
import { MESSAGE_BODY_MAX_LENGTH } from '@/lib/constants'

function buildDoc(overrides: Record<string, unknown> = {}) {
	return new Message({
		authorId: new Types.ObjectId(),
		body: 'Bom dia, turma!',
		...overrides,
	})
}

describe('Message model', () => {
	it('accepts a valid text-only document', () => {
		expect(buildDoc().validateSync()).toBeUndefined()
	})

	it('accepts a document with an attached image', () => {
		const doc = buildDoc({
			image: {
				url: 'https://res.cloudinary.com/x/y.jpg',
				publicId: 'copp/messages/abc',
				width: 1080,
				height: 1350,
			},
		})
		expect(doc.validateSync()).toBeUndefined()
	})

	it('requires authorId', () => {
		expect(buildDoc({ authorId: undefined }).validateSync()?.errors?.authorId).toBeDefined()
	})

	it('requires body', () => {
		expect(buildDoc({ body: undefined }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects empty body after trim (text required even with image)', () => {
		expect(buildDoc({ body: '   ' }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects body longer than MESSAGE_BODY_MAX_LENGTH', () => {
		const longBody = 'a'.repeat(MESSAGE_BODY_MAX_LENGTH + 1)
		expect(buildDoc({ body: longBody }).validateSync()?.errors?.body).toBeDefined()
	})

	it('rejects an image without url/publicId/dimensions', () => {
		const doc = buildDoc({ image: { url: 'https://x' } })
		const err = doc.validateSync()
		expect(err).toBeDefined()
	})

	it('declares index for chronological listing', () => {
		const indexes = Message.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const chronological = indexes.find(
			([f]) => Object.keys(f).length === 1 && f.createdAt === -1,
		)
		expect(chronological).toBeDefined()
	})

	it('declares index for author history', () => {
		const indexes = Message.schema.indexes() as Array<
			[Record<string, number>, Record<string, unknown>]
		>
		const authorIndex = indexes.find(
			([f]) => f.authorId === 1 && f.createdAt === -1,
		)
		expect(authorIndex).toBeDefined()
	})

	it('declares text index on body for future search', () => {
		const indexes = Message.schema.indexes() as Array<
			[Record<string, string | number>, Record<string, unknown>]
		>
		const textIndex = indexes.find(([f]) => f.body === 'text')
		expect(textIndex).toBeDefined()
	})

	it('has editedAt and deletedAt fields for soft delete + edit metadata', () => {
		const paths = Object.keys(buildDoc().schema.paths)
		expect(paths).toContain('editedAt')
		expect(paths).toContain('deletedAt')
	})
})
