// src/app/api/admin/users/[id]/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const findByIdMock = vi.fn()
const findByIdAndUpdateMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findById: (...a: unknown[]) => findByIdMock(...a),
    findByIdAndUpdate: (...a: unknown[]) => findByIdAndUpdateMock(...a),
  },
}))
vi.mock('@/lib/permissions', () => ({
  canEditUser: (u: { role: string }) => u.role === 'admin' || u.role === 'coordenador',
  canAssignAdminRole: (u: { role: string }) => u.role === 'admin',
}))

import { PATCH } from '@/app/api/admin/users/[id]/route'

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/admin/users/u1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'u1' })

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    authMock.mockReset()
    findByIdMock.mockReset()
    findByIdAndUpdateMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ state: 'DF' }) as never, { params } as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller lacks edit permission', async () => {
    authMock.mockResolvedValue({ user: { role: 'aluno' } })
    const res = await PATCH(makeRequest({ state: 'DF' }) as never, { params } as never)
    expect(res.status).toBe(403)
  })

  it('whitelists only editable fields (state/city included; bogus dropped)', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdAndUpdateMock.mockResolvedValue({ _id: 'u1' })

    const res = await PATCH(
      makeRequest({
        state: 'SP',
        city: 'São Paulo',
        rejectedReason: 'should-be-ignored',
        password: 'should-be-ignored',
        bogus: true,
      }) as never,
      { params } as never
    )
    expect(res.status).toBe(200)
    const update = findByIdAndUpdateMock.mock.calls[0][1] as Record<string, unknown>
    expect(update.state).toBe('SP')
    expect(update.city).toBe('São Paulo')
    expect('password' in update).toBe(false)
    expect('rejectedReason' in update).toBe(false)
    expect('bogus' in update).toBe(false)
  })

  it('returns 404 when user not found', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdAndUpdateMock.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ state: 'DF' }) as never, { params } as never)
    expect(res.status).toBe(404)
  })

  it('forbids coordenador from assigning admin role', async () => {
    authMock.mockResolvedValue({ user: { role: 'coordenador' } })
    findByIdMock.mockResolvedValue({ role: 'aluno' })
    const res = await PATCH(
      makeRequest({ role: 'admin' }) as never,
      { params } as never
    )
    expect(res.status).toBe(403)
  })

  it('forbids coordenador from demoting an admin', async () => {
    authMock.mockResolvedValue({ user: { role: 'coordenador' } })
    findByIdMock.mockResolvedValue({ role: 'admin' })
    const res = await PATCH(
      makeRequest({ role: 'aluno' }) as never,
      { params } as never
    )
    expect(res.status).toBe(403)
  })

  it('allows admin to assign admin role', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdMock.mockResolvedValue({ role: 'aluno' })
    findByIdAndUpdateMock.mockResolvedValue({ _id: 'u1' })
    const res = await PATCH(
      makeRequest({ role: 'admin' }) as never,
      { params } as never
    )
    expect(res.status).toBe(200)
  })
})
