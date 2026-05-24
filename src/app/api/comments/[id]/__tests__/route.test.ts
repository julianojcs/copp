// src/app/api/comments/[id]/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

const commentFindByIdMock = vi.fn()
const commentSaveMock = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/comment', () => ({
	Comment: {
		findById: (...a: unknown[]) => commentFindByIdMock(...a),
	},
}))

import { PATCH, DELETE } from '@/app/api/comments/[id]/route'

const COMMENT_ID = 'c'.repeat(24)
const AUTHOR_ID = 'a'.repeat(24)
const OTHER_USER_ID = 'b'.repeat(24)
const ADMIN_ID = 'd'.repeat(24)

function makeRequest(method: 'PATCH' | 'DELETE', body?: unknown): Request {
	return new Request(`http://test.local/api/comments/${COMMENT_ID}`, {
		method,
		headers: { 'content-type': 'application/json' },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
}

const params = Promise.resolve({ id: COMMENT_ID })

function fakeComment(overrides: Record<string, unknown> = {}) {
	return {
		_id: COMMENT_ID,
		userId: { toString: () => AUTHOR_ID },
		targetType: 'photo',
		targetId: 'a'.repeat(24),
		body: 'original',
		editedAt: null,
		deletedAt: null,
		createdAt: new Date(),
		save: commentSaveMock,
		...overrides,
	}
}

beforeEach(() => {
	authMock.mockReset()
	commentFindByIdMock.mockReset()
	commentSaveMock.mockReset()
	commentSaveMock.mockResolvedValue(undefined)
})

describe('PATCH /api/comments/[id]', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await PATCH(
			makeRequest('PATCH', { body: 'editado' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid body', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const res = await PATCH(
			makeRequest('PATCH', { body: '   ' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(400)
	})

	it('returns 404 when comment does not exist', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(null)
		const res = await PATCH(
			makeRequest('PATCH', { body: 'editado' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(404)
	})

	it('returns 410 when comment is soft-deleted', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(
			fakeComment({ deletedAt: new Date() }),
		)
		const res = await PATCH(
			makeRequest('PATCH', { body: 'editado' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(410)
		expect(commentSaveMock).not.toHaveBeenCalled()
	})

	it('returns 403 when caller is not the author (admin also cannot edit)', async () => {
		authMock.mockResolvedValue({ user: { id: OTHER_USER_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(fakeComment())
		const res = await PATCH(
			makeRequest('PATCH', { body: 'editado' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(403)
		expect(commentSaveMock).not.toHaveBeenCalled()
	})

	it('returns 403 even when caller is admin (edit is author-only)', async () => {
		authMock.mockResolvedValue({ user: { id: ADMIN_ID, role: 'admin' } })
		commentFindByIdMock.mockResolvedValueOnce(fakeComment())
		const res = await PATCH(
			makeRequest('PATCH', { body: 'editado' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(403)
	})

	it('updates body and sets editedAt when author edits', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const comment = fakeComment()
		commentFindByIdMock.mockResolvedValueOnce(comment)

		const res = await PATCH(
			makeRequest('PATCH', { body: '  novo conteúdo  ' }) as never,
			{ params } as never,
		)
		expect(res.status).toBe(200)
		expect(comment.body).toBe('novo conteúdo') // trimmed
		expect(comment.editedAt).toBeInstanceOf(Date)
		expect(commentSaveMock).toHaveBeenCalledTimes(1)
	})
})

describe('DELETE /api/comments/[id]', () => {
	it('returns 401 when unauthenticated', async () => {
		authMock.mockResolvedValue(null)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(401)
	})

	it('returns 404 when comment does not exist', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(null)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(404)
	})

	it('returns 200 (idempotent) when comment already soft-deleted', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(
			fakeComment({ deletedAt: new Date() }),
		)
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(commentSaveMock).not.toHaveBeenCalled()
	})

	it('returns 403 when caller is neither author nor admin', async () => {
		authMock.mockResolvedValue({ user: { id: OTHER_USER_ID, role: 'aluno' } })
		commentFindByIdMock.mockResolvedValueOnce(fakeComment())
		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(403)
	})

	it('soft-deletes when caller is the author', async () => {
		authMock.mockResolvedValue({ user: { id: AUTHOR_ID, role: 'aluno' } })
		const comment = fakeComment()
		commentFindByIdMock.mockResolvedValueOnce(comment)

		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(comment.deletedAt).toBeInstanceOf(Date)
		expect(commentSaveMock).toHaveBeenCalledTimes(1)
	})

	it('soft-deletes when caller is admin (even if not author)', async () => {
		authMock.mockResolvedValue({ user: { id: ADMIN_ID, role: 'admin' } })
		const comment = fakeComment()
		commentFindByIdMock.mockResolvedValueOnce(comment)

		const res = await DELETE(makeRequest('DELETE') as never, { params } as never)
		expect(res.status).toBe(200)
		expect(comment.deletedAt).toBeInstanceOf(Date)
		expect(commentSaveMock).toHaveBeenCalledTimes(1)
	})
})
