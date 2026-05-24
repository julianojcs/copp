// src/app/api/comments/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const photoFindByIdMock = vi.fn()
const messageFindByIdMock = vi.fn()
const commentCreateMock = vi.fn()
const commentFindMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/photo', () => ({
	Photo: {
		findById: (...a: unknown[]) => ({
			select: () => ({ lean: () => photoFindByIdMock(...a) }),
		}),
	},
}))
vi.mock('@/models/message', () => ({
	Message: {
		findById: (...a: unknown[]) => ({
			select: () => ({ lean: () => messageFindByIdMock(...a) }),
		}),
	},
}))
vi.mock('@/models/comment', () => ({
	Comment: {
		create: (...a: unknown[]) => commentCreateMock(...a),
		find: (...a: unknown[]) => commentFindMock(...a),
	},
}))

import { POST, GET } from '@/app/api/comments/route'

const VALID_TARGET_ID = 'a'.repeat(24)
const VALID_USER_ID = 'b'.repeat(24)
const VALID_COMMENT_ID = 'c'.repeat(24)

function makeRequest(
	method: 'POST' | 'GET',
	options: { body?: unknown; query?: Record<string, string> } = {},
): Request {
	const url = new URL('http://test.local/api/comments')
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

interface MockComment {
	_id: string
	userId: { _id: string; name: string; avatar?: string; cargo?: string; lotacaoSigla?: string }
	body: string
	createdAt: Date
	editedAt?: Date | null
	deletedAt?: Date | null
}

// chainable find().sort().limit().populate().lean() mock
function mockFindChain(result: MockComment[]) {
	const chain = {
		sort: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue({
				populate: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	}
	commentFindMock.mockReturnValueOnce(chain)
	return chain
}

beforeEach(() => {
	authMock.mockReset()
	photoFindByIdMock.mockReset()
	messageFindByIdMock.mockReset()
	commentCreateMock.mockReset()
	commentFindMock.mockReset()

	authMock.mockResolvedValue(sessionApproved)
	photoFindByIdMock.mockResolvedValue({ _id: VALID_TARGET_ID })
	messageFindByIdMock.mockResolvedValue({ _id: VALID_TARGET_ID })
	commentCreateMock.mockResolvedValue({
		_id: VALID_COMMENT_ID,
		userId: VALID_USER_ID,
		targetType: 'photo',
		targetId: VALID_TARGET_ID,
		body: 'Foto incrível!',
		createdAt: new Date('2026-05-24T12:00:00Z'),
	})
})

describe('POST /api/comments', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, body: 'oi' },
			}) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 when body is empty after trim', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, body: '   ' },
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(commentCreateMock).not.toHaveBeenCalled()
	})

	it('returns 400 when body exceeds 1000 chars', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: {
					targetType: 'photo',
					targetId: VALID_TARGET_ID,
					body: 'a'.repeat(1001),
				},
			}) as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns 400 when targetId is not an ObjectId', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: 'nope', body: 'oi' },
			}) as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns 404 when target photo does not exist', async () => {
		photoFindByIdMock.mockResolvedValueOnce(null)
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, body: 'oi' },
			}) as never,
		)
		expect(res.status).toBe(404)
		expect(commentCreateMock).not.toHaveBeenCalled()
	})

	it('returns 404 when target message does not exist', async () => {
		messageFindByIdMock.mockResolvedValueOnce(null)
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'message', targetId: VALID_TARGET_ID, body: 'oi' },
			}) as never,
		)
		expect(res.status).toBe(404)
		expect(commentCreateMock).not.toHaveBeenCalled()
	})

	it('returns 404 when target message is soft-deleted', async () => {
		messageFindByIdMock.mockResolvedValueOnce({
			_id: VALID_TARGET_ID,
			deletedAt: new Date(),
		})
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'message', targetId: VALID_TARGET_ID, body: 'oi' },
			}) as never,
		)
		expect(res.status).toBe(404)
	})

	it('creates a comment targeting a message', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'message', targetId: VALID_TARGET_ID, body: 'top!' },
			}) as never,
		)
		expect(res.status).toBe(201)
		expect(commentCreateMock).toHaveBeenCalled()
	})

	it('creates the comment and returns 201 with the populated record', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { targetType: 'photo', targetId: VALID_TARGET_ID, body: '  Foto incrível!  ' },
			}) as never,
		)
		expect(res.status).toBe(201)
		const [payload] = commentCreateMock.mock.calls[0]
		expect(payload).toMatchObject({
			userId: VALID_USER_ID,
			targetType: 'photo',
			targetId: VALID_TARGET_ID,
			body: 'Foto incrível!', // trimmed
		})
	})
})

describe('GET /api/comments', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid query', async () => {
		const res = await GET(
			makeRequest('GET', { query: { targetType: 'photo' } }) as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns paginated list with author populated (safe fields only)', async () => {
		const fakeComments: MockComment[] = [
			{
				_id: VALID_COMMENT_ID,
				userId: {
					_id: VALID_USER_ID,
					name: 'João Silva',
					avatar: 'https://x/a.png',
					cargo: 'APF',
					lotacaoSigla: 'SR/PF/DF',
				},
				body: 'Top!',
				createdAt: new Date('2026-05-24T12:00:00Z'),
				editedAt: null,
				deletedAt: null,
			},
		]
		const chain = mockFindChain(fakeComments)

		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID },
			}) as never,
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			items: MockComment[]
			nextCursor: string | null
		}
		expect(body.items).toHaveLength(1)
		expect(body.items[0].body).toBe('Top!')
		expect(body.items[0].userId.name).toBe('João Silva')

		// `find` was called with the right filter (excluding soft-deleted by default)
		const [filter] = commentFindMock.mock.calls[0]
		expect(filter).toMatchObject({
			targetType: 'photo',
			targetId: VALID_TARGET_ID,
			deletedAt: { $exists: false },
		})

		// populate must select only the safe fields (no email/whatsapp)
		const populateChain = chain.sort.mock.results[0].value.limit.mock.results[0].value.populate
		const [populatePath, populateFields] = populateChain.mock.calls[0]
		expect(populatePath).toBe('userId')
		expect(typeof populateFields).toBe('string')
		expect(populateFields).not.toMatch(/email|whatsapp/)
		expect(populateFields).toMatch(/name/)
	})

	it('rejects limit > 50 (Zod cap)', async () => {
		const res = await GET(
			makeRequest('GET', {
				query: {
					targetType: 'photo',
					targetId: VALID_TARGET_ID,
					limit: '999',
				},
			}) as never,
		)
		expect(res.status).toBe(400)
		expect(commentFindMock).not.toHaveBeenCalled()
	})

	it('fetches limit+1 to determine if there is a next page', async () => {
		const chain = mockFindChain([])
		await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID, limit: '10' },
			}) as never,
		)
		const sortResult = chain.sort.mock.results[0].value as {
			limit: ReturnType<typeof vi.fn>
		}
		const [limitArg] = sortResult.limit.mock.calls[0] as [number]
		expect(limitArg).toBe(11)
	})

	it('returns nextCursor when there are more items than the page size', async () => {
		const olderDate = new Date('2026-05-20T10:00:00Z')
		const newest = new Date('2026-05-24T12:00:00Z')
		const fakeComments: MockComment[] = Array.from({ length: 21 }, (_, i) => ({
			_id: `comment-${i}`,
			userId: { _id: VALID_USER_ID, name: 'X' },
			body: `c${i}`,
			createdAt: i === 0 ? newest : olderDate,
			editedAt: null,
			deletedAt: null,
		}))
		mockFindChain(fakeComments)

		const res = await GET(
			makeRequest('GET', {
				query: { targetType: 'photo', targetId: VALID_TARGET_ID, limit: '20' },
			}) as never,
		)
		const body = (await res.json()) as {
			items: MockComment[]
			nextCursor: string | null
		}
		expect(body.items).toHaveLength(20)
		expect(body.nextCursor).not.toBeNull()
	})

	it('masks the body of soft-deleted comments when included', async () => {
		const fakeComments: MockComment[] = [
			{
				_id: VALID_COMMENT_ID,
				userId: { _id: VALID_USER_ID, name: 'X' },
				body: 'segredo',
				createdAt: new Date(),
				editedAt: null,
				deletedAt: new Date(),
			},
		]
		mockFindChain(fakeComments)
		const res = await GET(
			makeRequest('GET', {
				query: {
					targetType: 'photo',
					targetId: VALID_TARGET_ID,
					includeDeleted: 'true',
				},
			}) as never,
		)
		const body = (await res.json()) as { items: MockComment[] }
		expect(body.items[0].body).toBe('Comentário removido')
	})
})
