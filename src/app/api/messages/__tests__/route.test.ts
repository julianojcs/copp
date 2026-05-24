// src/app/api/messages/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const messageCreateMock = vi.fn()
const messageAggregateMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/message', () => ({
	Message: {
		create: (...a: unknown[]) => messageCreateMock(...a),
		aggregate: (...a: unknown[]) => messageAggregateMock(...a),
	},
}))

import { POST, GET } from '@/app/api/messages/route'

const VALID_USER_ID = 'a'.repeat(24)
const VALID_MESSAGE_ID = 'b'.repeat(24)

function makeRequest(
	method: 'POST' | 'GET',
	options: { body?: unknown; query?: Record<string, string> } = {},
): Request {
	const url = new URL('http://test.local/api/messages')
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

const validImage = {
	url: 'https://res.cloudinary.com/x/y.jpg',
	publicId: 'copp/messages/abc',
	width: 1080,
	height: 1350,
}

beforeEach(() => {
	authMock.mockReset()
	messageCreateMock.mockReset()
	messageAggregateMock.mockReset()

	authMock.mockResolvedValue(sessionApproved)
	messageCreateMock.mockResolvedValue({
		_id: VALID_MESSAGE_ID,
		authorId: VALID_USER_ID,
		body: 'Bom dia!',
		createdAt: new Date('2026-05-24T12:00:00Z'),
	})
	messageAggregateMock.mockResolvedValue([])
})

describe('POST /api/messages', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await POST(
			makeRequest('POST', { body: { body: 'Oi turma' } }) as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 when body is empty after trim', async () => {
		const res = await POST(
			makeRequest('POST', { body: { body: '   ' } }) as never,
		)
		expect(res.status).toBe(400)
		expect(messageCreateMock).not.toHaveBeenCalled()
	})

	it('returns 400 when body exceeds 2000 chars', async () => {
		const res = await POST(
			makeRequest('POST', { body: { body: 'a'.repeat(2001) } }) as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns 400 when image is partial (missing publicId)', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: {
					body: 'com imagem',
					image: { url: 'https://x/y.jpg', width: 100, height: 100 },
				},
			}) as never,
		)
		expect(res.status).toBe(400)
	})

	it('creates a text-only message and returns 201', async () => {
		const res = await POST(
			makeRequest('POST', { body: { body: '  Bom dia turma  ' } }) as never,
		)
		expect(res.status).toBe(201)
		const [payload] = messageCreateMock.mock.calls[0]
		expect(payload).toMatchObject({
			authorId: VALID_USER_ID,
			body: 'Bom dia turma', // trimmed
		})
		expect(payload).not.toHaveProperty('image')
	})

	it('creates a message with attached image', async () => {
		const res = await POST(
			makeRequest('POST', {
				body: { body: 'Olha essa foto', image: validImage },
			}) as never,
		)
		expect(res.status).toBe(201)
		const [payload] = messageCreateMock.mock.calls[0]
		expect(payload.image).toEqual(validImage)
	})
})

describe('GET /api/messages', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await GET(makeRequest('GET') as never)
		expect(res.status).toBe(401)
	})

	it('returns 400 when limit is too large', async () => {
		const res = await GET(makeRequest('GET', { query: { limit: '999' } }) as never)
		expect(res.status).toBe(400)
	})

	it('returns paginated messages with author + counts (one aggregation, no N+1)', async () => {
		const fakeMessage = {
			_id: VALID_MESSAGE_ID,
			author: {
				_id: VALID_USER_ID,
				name: 'Maria',
				avatar: null,
				cargo: 'APF',
				lotacaoSigla: 'SR/PF/SP',
			},
			body: 'Olá!',
			image: null,
			createdAt: new Date('2026-05-24T12:00:00Z'),
			editedAt: null,
			deletedAt: null,
			reactionsCount: 3,
			commentsCount: 1,
		}
		messageAggregateMock.mockResolvedValueOnce([fakeMessage])

		const res = await GET(makeRequest('GET') as never)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			items: typeof fakeMessage[]
			nextCursor: string | null
		}
		expect(body.items).toHaveLength(1)
		expect(body.items[0].reactionsCount).toBe(3)
		expect(body.items[0].commentsCount).toBe(1)

		// Single aggregation call (no N+1)
		expect(messageAggregateMock).toHaveBeenCalledTimes(1)

		// The pipeline must select only safe author fields
		const [pipeline] = messageAggregateMock.mock.calls[0]
		const pipelineStr = JSON.stringify(pipeline)
		expect(pipelineStr).toMatch(/name/)
		expect(pipelineStr).not.toMatch(/email|whatsapp|password/)
	})

	it('masks body of soft-deleted messages and drops attached image', async () => {
		const fakeMessage = {
			_id: VALID_MESSAGE_ID,
			author: { _id: VALID_USER_ID, name: 'M' },
			body: 'segredo',
			image: validImage,
			deletedAt: new Date(),
			createdAt: new Date(),
			editedAt: null,
			reactionsCount: 0,
			commentsCount: 0,
		}
		messageAggregateMock.mockResolvedValueOnce([fakeMessage])

		const res = await GET(makeRequest('GET') as never)
		const body = (await res.json()) as {
			items: { body: string; image: unknown }[]
		}
		expect(body.items[0].body).toBe('Mensagem removida')
		expect(body.items[0].image).toBeNull()
	})

	it('returns nextCursor when limit+1 items are fetched', async () => {
		const olderDate = new Date('2026-05-20T10:00:00Z')
		const fake = Array.from({ length: 21 }, (_, i) => ({
			_id: `m-${i}`,
			author: { _id: VALID_USER_ID, name: 'X' },
			body: `body ${i}`,
			image: null,
			createdAt: i === 0 ? new Date() : olderDate,
			editedAt: null,
			deletedAt: null,
			reactionsCount: 0,
			commentsCount: 0,
		}))
		messageAggregateMock.mockResolvedValueOnce(fake)

		const res = await GET(makeRequest('GET', { query: { limit: '20' } }) as never)
		const body = (await res.json()) as {
			items: unknown[]
			nextCursor: string | null
		}
		expect(body.items).toHaveLength(20)
		expect(body.nextCursor).not.toBeNull()
	})
})
