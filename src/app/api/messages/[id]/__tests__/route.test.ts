// src/app/api/messages/[id]/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const messageFindByIdMock = vi.fn()
const messageFindByIdPopulatedMock = vi.fn()
const messageSaveMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/message', () => ({
	Message: {
		findById: (...a: unknown[]) => ({
			// PromiseLike — `await Message.findById(id)` resolves through the doc mock.
			then: (
				resolve: (v: unknown) => unknown,
				reject?: (err: unknown) => unknown,
			) => Promise.resolve(messageFindByIdMock(...a)).then(resolve, reject),
			populate: vi.fn().mockReturnValue({
				lean: vi.fn().mockImplementation(() => messageFindByIdPopulatedMock(...a)),
			}),
		}),
	},
}))

import { GET, PATCH, DELETE } from '@/app/api/messages/[id]/route'

const MESSAGE_ID = 'm'.repeat(24)
const AUTHOR_ID = 'a'.repeat(24)
const OTHER_USER_ID = 'b'.repeat(24)
const ADMIN_ID = 'd'.repeat(24)

function makeRequest(method: 'GET' | 'PATCH' | 'DELETE', body?: unknown): Request {
	return new Request(`http://test.local/api/messages/${MESSAGE_ID}`, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
}

const params = Promise.resolve({ id: MESSAGE_ID })

function fakeMessage(overrides: Record<string, unknown> = {}) {
	return {
		_id: MESSAGE_ID,
		authorId: { toString: () => AUTHOR_ID },
		body: 'original',
		editedAt: null,
		deletedAt: null,
		createdAt: new Date(),
		save: messageSaveMock,
		...overrides,
	}
}

beforeEach(() => {
	authMock.mockReset()
	messageFindByIdMock.mockReset()
	messageFindByIdPopulatedMock.mockReset()
	messageSaveMock.mockReset()
	messageSaveMock.mockResolvedValue(undefined)
})

describe('GET /api/messages/[id]', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await GET(makeRequest('GET') as never, { params } as never)
		expect(res.status).toBe(401)
	})

	it('returns 404 when message not found', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdPopulatedMock.mockResolvedValueOnce(null)
		const res = await GET(makeRequest('GET') as never, { params } as never)
		expect(res.status).toBe(404)
	})

	it('returns the populated message', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdPopulatedMock.mockResolvedValueOnce({
			_id: MESSAGE_ID,
			authorId: { _id: AUTHOR_ID, name: 'M', cargo: 'APF' },
			body: 'oi',
			createdAt: new Date(),
		})
		const res = await GET(makeRequest('GET') as never, { params } as never)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { message: { body: string } }
		expect(body.message.body).toBe('oi')
	})
})

describe('PATCH /api/messages/[id]', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await PATCH(makeRequest('PATCH', { body: 'novo' }) as never, { params } as never)
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid body', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const res = await PATCH(makeRequest('PATCH', { body: '  ' }) as never, { params } as never)
		expect(res.status).toBe(400)
	})

	it('returns 404 when message not found', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdMock.mockResolvedValueOnce(null)
		const res = await PATCH(makeRequest('PATCH', { body: 'novo' }) as never, { params } as never)
		expect(res.status).toBe(404)
	})

	it('returns 410 when message is soft-deleted', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdMock.mockResolvedValueOnce(fakeMessage({ deletedAt: new Date() }))
		const res = await PATCH(makeRequest('PATCH', { body: 'novo' }) as never, { params } as never)
		expect(res.status).toBe(410)
		expect(messageSaveMock).not.toHaveBeenCalled()
	})

	it('returns 403 when caller is not author (even admin)', async () => {
		authMock.mockResolvedValue({ user: { id: ADMIN_ID, role: 'admin' } })
		messageFindByIdMock.mockResolvedValueOnce(fakeMessage())
		const res = await PATCH(makeRequest('PATCH', { body: 'novo' }) as never, { params } as never)
		expect(res.status).toBe(403)
	})

	it('updates body, sets editedAt, returns 200', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const msg = fakeMessage()
		messageFindByIdMock.mockResolvedValueOnce(msg)
		const res = await PATCH(
			makeRequest('PATCH', { body: '  novo conteúdo  ' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(200)
		expect(msg.body).toBe('novo conteúdo')
		expect(msg.editedAt).toBeInstanceOf(Date)
		expect(messageSaveMock).toHaveBeenCalledTimes(1)
	})
})

describe('DELETE /api/messages/[id]', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(401)
	})

	it('returns 404 when not found', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdMock.mockResolvedValueOnce(null)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(404)
	})

	it('returns 200 (idempotent) when already soft-deleted', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		messageFindByIdMock.mockResolvedValueOnce(fakeMessage({ deletedAt: new Date() }))
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(messageSaveMock).not.toHaveBeenCalled()
	})

	it('returns 403 when caller is neither author nor admin', async () => {
		authMock.mockResolvedValue({ user: { id: OTHER_USER_ID, role: 'aluno' } })
		messageFindByIdMock.mockResolvedValueOnce(fakeMessage())
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(403)
	})

	it('soft-deletes when caller is author', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const msg = fakeMessage()
		messageFindByIdMock.mockResolvedValueOnce(msg)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(msg.deletedAt).toBeInstanceOf(Date)
		expect(messageSaveMock).toHaveBeenCalledTimes(1)
	})

	it('soft-deletes when caller is admin (not author)', async () => {
		authMock.mockResolvedValue({ user: { id: ADMIN_ID, role: 'admin' } })
		const msg = fakeMessage()
		messageFindByIdMock.mockResolvedValueOnce(msg)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(msg.deletedAt).toBeInstanceOf(Date)
	})
})
