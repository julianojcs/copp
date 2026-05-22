// src/app/api/users/[id]/change-password/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const findByIdMock = vi.fn()
const compareMock = vi.fn()
const hashMock = vi.fn()
const saveMock = vi.fn().mockResolvedValue(undefined)
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: { findById: (...a: unknown[]) => ({ select: () => findByIdMock(...a) }) },
}))
vi.mock('bcryptjs', () => ({
  default: {
    compare: (...a: unknown[]) => compareMock(...a),
    hash: (...a: unknown[]) => hashMock(...a),
  },
}))

import { POST } from '@/app/api/users/[id]/change-password/route'

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/users/u1/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  currentPassword: 'Antiga123',
  newPassword: 'Nova456A',
  confirmPassword: 'Nova456A',
}

const params = Promise.resolve({ id: 'u1' })

describe('POST /api/users/[id]/change-password', () => {
  beforeEach(() => {
    authMock.mockReset()
    findByIdMock.mockReset()
    compareMock.mockReset()
    hashMock.mockReset()
    saveMock.mockClear()
  })

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when changing another user password', async () => {
    authMock.mockResolvedValue({ user: { id: 'other' } })
    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 on validation failure (weak password)', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      makeRequest({ ...validBody, newPassword: 'fraca', confirmPassword: 'fraca' }) as never,
      { params } as never
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    findByIdMock.mockResolvedValue(null)
    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(404)
  })

  it('returns 400 when account has no password (OAuth-only)', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    findByIdMock.mockResolvedValue({ password: undefined, save: saveMock })
    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(400)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('returns 400 when current password is incorrect', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    findByIdMock.mockResolvedValue({ password: 'hashed', save: saveMock })
    compareMock.mockResolvedValue(false)
    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(400)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('changes password successfully with valid input', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    const user = { password: 'hashedOld', save: saveMock }
    findByIdMock.mockResolvedValue(user)
    compareMock.mockResolvedValue(true)
    hashMock.mockResolvedValue('hashedNew')

    const res = await POST(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(200)
    expect(user.password).toBe('hashedNew')
    expect(saveMock).toHaveBeenCalledTimes(1)
  })
})
