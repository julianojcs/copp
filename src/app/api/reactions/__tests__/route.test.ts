// src/app/api/reactions/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const photoFindByIdMock = vi.fn()

const reactionFindOneAndUpdateMock = vi.fn()
const reactionDeleteOneMock = vi.fn()
const reactionFindOneMock = vi.fn()
const reactionAggregateMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/photo', () => ({
	Photo: {
		findById: (...a: unknown[]) => ({
			select: () => ({ lean: () => photoFindByIdMock(...a) }),
		}),
	},
}))
vi.mock('@/models/reaction', () => ({
	Reaction: {
		findOneAndUpdate: (...a: unknown[]) =>
			reactionFindOneAndUpdateMock(...a),
		deleteOne: (...a: unknown[]) => reactionDeleteOneMock(...a),
		findOne: (...a: unknown[]) => ({
			lean: () => reactionFindOneMock(...a),
		}),
		aggregate: (...a: unknown[]) => reactionAggregateMock(...a),
	},
}))

import { POST, DELETE, GET } from '@/app/api/reactions/route'

const VALID_TARGET_ID = 'a'.repeat(24)
const VALID_USER_ID = 'b'.repeat(24)

function makeRequest(
	method: 'POST' | 'DELETE' | 'GET',
	options: { body?: unknown; query?: Record<string, string> } = {},
): Request {
	const url = new URL('http://test.local/api/reactions')
	if (options.query) {
		for (const [k, v] of Object.entries(options.query)) {
			url.searchParams.set(k, v)
		}
	}
	const init: RequestInit = {
		method,
		headers: { 'content-type': 'application/json' },
	}
	if (options.body !== undefined) {
		init.body = JSON.stringify(options.body)
	}
	return new Request(url, init)
}

const sessionApproved = {
	user: { id: VALID_USER_ID, role: 'aluno', status: 'approved' },
}

beforeEach(() => {
	authMock.mockReset()
	photoFindByIdMock.mockReset()
	reactionFindOneAndUpdateMock.mockReset()
	reactionDeleteOneMock.mockReset()
	reactionFindOneMock.mockReset()
	reactionAggregateMock.mockReset()

	// defaults
	authMock.mockResolvedValue(sessionApproved)
	photoFindByIdMock.mockResolvedValue({ _id: VALID_TARGET_ID })
	reactionFindOneAndUpdateMock.mockResolvedValue({
		_id: 'r1',
		userId: VALID_USER_ID,
		targetType: 'photo',
		targetId: VALID_TARGET_ID,
		type: 'like',
	})
	reactionDeleteOneMock.mockResolvedValue({ deletedCount: 1 })
	reactionFindOneMock.mockResolvedValue(null)
	reactionAggregateMock.mockResolvedValue([])
})

describe('POST /api/reactions', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, type: 'like' },
			}) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 when targetType is invalid', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'comment', targetId: VALID_TARGET_ID, type: 'like' },
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(reactionFindOneAndUpdateMock).not.toHaveBeenCalled()
	})

	it('returns 400 when type is invalid', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, type: 'thumbsup' },
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(reactionFindOneAndUpdateMock).not.toHaveBeenCalled()
	})

	it('returns 400 when targetId is not a valid ObjectId', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: 'not-an-id', type: 'like' },
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(reactionFindOneAndUpdateMock).not.toHaveBeenCalled()
	})

	it('returns 404 when target photo does not exist', async () => {
		photoFindByIdMock.mockResolvedValueOnce(null)
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, type: 'like' },
			}) as never,
		)
		expect(res.status).toBe(404)
		expect(reactionFindOneAndUpdateMock).not.toHaveBeenCalled()
	})

	it('returns 404 for message target (Message model not yet implemented — issue #10)', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'message', targetId: VALID_TARGET_ID, type: 'love' },
			}) as never,
		)
		expect(res.status).toBe(404)
		expect(reactionFindOneAndUpdateMock).not.toHaveBeenCalled()
	})

	it('upserts the reaction by (userId, targetType, targetId)', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, type: 'love' },
			}) as never,
		)
		expect(res.status).toBe(200)
		const [filter, update, options] = reactionFindOneAndUpdateMock.mock.calls[0]
		expect(filter).toEqual({
			userId: VALID_USER_ID,
			targetType: 'photo',
			targetId: VALID_TARGET_ID,
		})
		expect(update).toEqual({ $set: { type: 'love' } })
		expect(options).toMatchObject({ upsert: true })
	})
})

describe('DELETE /api/reactions', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await DELETE(
			makeRequest('DELETE', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid payload', async () => {
		const res = await DELETE(
			makeRequest('DELETE', {
				body: { targetType: 'photo' },
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(reactionDeleteOneMock).not.toHaveBeenCalled()
	})

	it('deletes the reaction for the authenticated user', async () => {
		const res = await DELETE(
			makeRequest('DELETE', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
		expect(reactionDeleteOneMock).toHaveBeenCalledWith({
			userId: VALID_USER_ID,
			targetType: 'photo',
			targetId: VALID_TARGET_ID,
		})
	})

	it('is idempotent — succeeds even if the reaction did not exist', async () => {
		reactionDeleteOneMock.mockResolvedValueOnce({ deletedCount: 0 })
		const res = await DELETE(
			makeRequest('DELETE', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
	})
})

describe('GET /api/reactions', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 when query params are missing/invalid', async () => {
		const res = await GET(
			makeRequest('GET', { query: { targetType: 'photo' } }) as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns aggregated counts and the user current reaction', async () => {
		reactionAggregateMock.mockResolvedValueOnce([
			{ _id: 'like', count: 12 },
			{ _id: 'love', count: 3 },
		])
		reactionFindOneMock.mockResolvedValueOnce({ type: 'like' })

		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			counts: Record<string, number>
			total: number
			userReaction: string | null
		}
		expect(body.counts.like).toBe(12)
		expect(body.counts.love).toBe(3)
		expect(body.total).toBe(15)
		expect(body.userReaction).toBe('like')
	})

	it('returns userReaction=null when the caller has not reacted', async () => {
		reactionAggregateMock.mockResolvedValueOnce([
			{ _id: 'like', count: 5 },
		])
		reactionFindOneMock.mockResolvedValueOnce(null)

		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { userReaction: string | null }
		expect(body.userReaction).toBeNull()
	})

	it('returns zero counts when the target has no reactions', async () => {
		reactionAggregateMock.mockResolvedValueOnce([])
		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			counts: Record<string, number>
			total: number
		}
		expect(body.total).toBe(0)
		expect(Object.values(body.counts).every((c) => c === 0)).toBe(true)
	})
})
