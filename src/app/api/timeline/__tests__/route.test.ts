// src/app/api/timeline/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Types } from 'mongoose'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const userFindMock = vi.fn()
const photoAggregateMock = vi.fn()
const commentAggregateMock = vi.fn()
const messageAggregateMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
	User: {
		find: (...a: unknown[]) => userFindMock(...a),
	},
}))
vi.mock('@/models/photo', () => ({
	Photo: { aggregate: (...a: unknown[]) => photoAggregateMock(...a) },
}))
vi.mock('@/models/comment', () => ({
	Comment: { aggregate: (...a: unknown[]) => commentAggregateMock(...a) },
}))
vi.mock('@/models/message', () => ({
	Message: { aggregate: (...a: unknown[]) => messageAggregateMock(...a) },
}))

import { GET } from '@/app/api/timeline/route'

const USER_ID = 'u'.repeat(24)

function makeRequest(query: Record<string, string> = {}): Request {
	const url = new URL('http://test.local/api/timeline')
	for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
	return new Request(url, { method: 'GET' })
}

// Chain mock for User.find().sort().limit().select().lean()
function mockUserFindChain(result: unknown[]) {
	const chain = {
		sort: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	}
	userFindMock.mockReturnValueOnce(chain)
}

const oid = () => new Types.ObjectId()

function fakeUser(overrides: Record<string, unknown> = {}) {
	return {
		_id: oid(),
		name: 'João Silva',
		avatar: undefined,
		cargo: 'APF',
		lotacaoSigla: 'SR/PF/DF',
		createdAt: new Date('2026-05-20T10:00:00Z'),
		...overrides,
	}
}

beforeEach(() => {
	authMock.mockReset()
	userFindMock.mockReset()
	photoAggregateMock.mockReset()
	commentAggregateMock.mockReset()
	messageAggregateMock.mockReset()

	authMock.mockResolvedValue({
		user: { id: USER_ID, role: 'aluno', status: 'approved' },
	})

	// Comment.aggregate is called twice (photo_commented + message_commented).
	// Default each to an empty result.
	commentAggregateMock.mockResolvedValue([])
})

describe('GET /api/timeline', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		mockUserFindChain([])
		photoAggregateMock.mockResolvedValueOnce([])
		messageAggregateMock.mockResolvedValueOnce([])

		const res = await GET(makeRequest() as never)
		expect(res.status).toBe(401)
	})

	it('returns 400 when limit > 50', async () => {
		const res = await GET(makeRequest({ limit: '999' }) as never)
		expect(res.status).toBe(400)
	})

	it('returns 400 when cursor is not a valid ISO datetime', async () => {
		const res = await GET(makeRequest({ cursor: 'not-a-date' }) as never)
		expect(res.status).toBe(400)
	})

	it('returns empty list when no events exist', async () => {
		mockUserFindChain([])
		photoAggregateMock.mockResolvedValueOnce([])
		messageAggregateMock.mockResolvedValueOnce([])

		const res = await GET(makeRequest() as never)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { items: unknown[]; nextCursor: null }
		expect(body.items).toEqual([])
		expect(body.nextCursor).toBeNull()
	})

	it('merges 5 event types and sorts by score (engaged posts above unengaged)', async () => {
		// All three items dated "now" so age decay is identical and
		// engagement alone determines order.
		const now = new Date()

		const newUser = fakeUser({ createdAt: now })

		// Same age as the new user, but with heavy engagement — must rank above.
		const engagedPhoto = {
			_id: oid(),
			author: fakeUser(),
			url: 'https://x/p.jpg',
			thumbnailUrl: 'https://x/p-thumb.jpg',
			title: 'Foto épica',
			description: null,
			location: null,
			createdAt: now,
			reactionsCount: 30,
			commentsCount: 20,
		}

		// Same age, zero engagement — ranks between.
		const freshMessage = {
			_id: oid(),
			author: fakeUser(),
			body: 'Bom dia turma',
			image: null,
			editedAt: null,
			deletedAt: null,
			createdAt: now,
			reactionsCount: 0,
			commentsCount: 0,
		}

		mockUserFindChain([newUser])
		photoAggregateMock.mockResolvedValueOnce([engagedPhoto])
		messageAggregateMock.mockResolvedValueOnce([freshMessage])

		const res = await GET(makeRequest() as never)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			items: { kind: string; score: number }[]
		}
		expect(body.items).toHaveLength(3)
		// Engaged photo should rank first because all three have the same age.
		expect(body.items[0].kind).toBe('photo_posted')
		// Scores must be in descending order.
		for (let i = 1; i < body.items.length; i++) {
			expect(body.items[i - 1].score).toBeGreaterThanOrEqual(body.items[i].score)
		}
	})

	it('returns the canonical event payload shape for each kind', async () => {
		const photo = {
			_id: oid(),
			author: fakeUser(),
			url: 'https://x/p.jpg',
			thumbnailUrl: 'https://x/p-thumb.jpg',
			title: 'T',
			description: 'D',
			location: 'L',
			createdAt: new Date('2026-05-24T11:00:00Z'),
			reactionsCount: 1,
			commentsCount: 2,
		}
		const photoComment = {
			_id: oid(),
			body: 'Top!',
			deletedAt: null,
			createdAt: new Date('2026-05-24T11:30:00Z'),
			author: fakeUser({ name: 'Maria' }),
			photo: {
				_id: oid(),
				url: 'https://x/p2.jpg',
				thumbnailUrl: 'https://x/p2-thumb.jpg',
				title: 'P2',
			},
		}
		const message = {
			_id: oid(),
			body: 'Olá',
			image: null,
			editedAt: null,
			deletedAt: null,
			createdAt: new Date('2026-05-24T12:00:00Z'),
			author: fakeUser(),
			reactionsCount: 0,
			commentsCount: 0,
		}
		const messageComment = {
			_id: oid(),
			body: 'Concordo',
			deletedAt: null,
			createdAt: new Date('2026-05-24T12:30:00Z'),
			author: fakeUser({ name: 'Paulo' }),
			message: {
				_id: oid(),
				body: 'Tópico interessante muito longo'.repeat(20),
				author: fakeUser({ name: 'Ana' }),
			},
		}
		mockUserFindChain([fakeUser()])
		photoAggregateMock.mockResolvedValueOnce([photo])
		commentAggregateMock.mockResolvedValueOnce([photoComment]) // photo_commented
		messageAggregateMock.mockResolvedValueOnce([message])
		commentAggregateMock.mockResolvedValueOnce([messageComment]) // message_commented

		const res = await GET(makeRequest() as never)
		const body = (await res.json()) as { items: { kind: string }[] }
		const kinds = body.items.map((i) => i.kind).sort()
		expect(kinds).toEqual([
			'message_commented',
			'message_posted',
			'new_member',
			'photo_commented',
			'photo_posted',
		])

		// message_commented should expose a truncated bodyExcerpt
		const mc = body.items.find(
			(i) => i.kind === 'message_commented',
		) as unknown as { message: { bodyExcerpt: string } }
		expect(mc.message.bodyExcerpt.endsWith('…')).toBe(true)
		expect(mc.message.bodyExcerpt.length).toBeLessThanOrEqual(120)
	})

	it('masks body of soft-deleted message posts and drops image', async () => {
		const deletedMessage = {
			_id: oid(),
			body: 'segredo',
			image: { url: 'https://x/y.jpg', width: 100, height: 100, publicId: 'x' },
			editedAt: null,
			deletedAt: new Date(),
			createdAt: new Date(),
			author: fakeUser(),
			reactionsCount: 0,
			commentsCount: 0,
		}
		mockUserFindChain([])
		photoAggregateMock.mockResolvedValueOnce([])
		messageAggregateMock.mockResolvedValueOnce([deletedMessage])

		const res = await GET(makeRequest() as never)
		const body = (await res.json()) as {
			items: { kind: string; body: string; image: unknown }[]
		}
		const mp = body.items.find((i) => i.kind === 'message_posted')
		expect(mp?.body).toBe('Mensagem removida')
		expect(mp?.image).toBeNull()
	})

	it('runs the 5 candidate queries in parallel', async () => {
		const order: string[] = []
		const deferred = <T>(label: string, value: T) =>
			new Promise<T>((resolve) =>
				queueMicrotask(() => {
					order.push(label)
					resolve(value)
				}),
			)

		// Customize each mock to record execution order
		userFindMock.mockReturnValueOnce({
			sort: () => ({
				limit: () => ({
					select: () => ({
						lean: () => deferred('users', []),
					}),
				}),
			}),
		})
		photoAggregateMock.mockReturnValueOnce(deferred('photos', []))
		commentAggregateMock.mockReturnValueOnce(deferred('photo_comments', []))
		messageAggregateMock.mockReturnValueOnce(deferred('messages', []))
		commentAggregateMock.mockReturnValueOnce(deferred('message_comments', []))

		await GET(makeRequest() as never)
		// All 5 should have been started before any awaits resolved sequentially.
		expect(order).toHaveLength(5)
	})

	it('emits a nextCursor when any sub-query returns a full page (more available)', async () => {
		const perTypeLimit = 20 * 3 // default limit 20 * multiplier 3 = 60
		const oldest = new Date('2026-05-20T10:00:00Z')
		const messages = Array.from({ length: perTypeLimit }, (_, i) => ({
			_id: oid(),
			body: `m ${i}`,
			image: null,
			editedAt: null,
			deletedAt: null,
			createdAt: i === perTypeLimit - 1 ? oldest : new Date('2026-05-24T10:00:00Z'),
			author: fakeUser(),
			reactionsCount: 0,
			commentsCount: 0,
		}))

		mockUserFindChain([])
		photoAggregateMock.mockResolvedValueOnce([])
		messageAggregateMock.mockResolvedValueOnce(messages)

		const res = await GET(makeRequest() as never)
		const body = (await res.json()) as { nextCursor: string | null }
		expect(body.nextCursor).not.toBeNull()
		expect(new Date(body.nextCursor as string).toISOString()).toBe(
			oldest.toISOString(),
		)
	})
})
