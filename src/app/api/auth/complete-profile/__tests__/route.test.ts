// src/app/api/auth/complete-profile/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const findOneUserMock = vi.fn()
const createUserMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findOne: (...args: unknown[]) => findOneUserMock(...args),
    create: (...args: unknown[]) => createUserMock(...args),
  },
}))

import { POST } from '@/app/api/auth/complete-profile/route'

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/auth/complete-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  email: 'novo@pf.gov.br',
  name: 'Maria Souza',
  googleId: 'google-abc',
  lotacao: 'SR/SP',
  whatsapp: '(11) 99999-9999',
  cargo: 'EPF',
  state: 'SP',
  city: 'São Paulo',
}

describe('POST /api/auth/complete-profile', () => {
  beforeEach(() => {
    findOneUserMock.mockReset()
    createUserMock.mockReset()
  })

  it('rejects missing state', async () => {
    const res = await POST(makeRequest({ ...validBody, state: '' }) as never)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/estado/i)
  })

  it('rejects invalid state UF', async () => {
    const res = await POST(makeRequest({ ...validBody, state: 'XX' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejects missing cargo for non-admin', async () => {
    const res = await POST(makeRequest({ ...validBody, cargo: undefined }) as never)
    expect(res.status).toBe(400)
  })

  it('omits cargo for admin role', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: { toString: () => 'admin-id' } })
    const res = await POST(
      makeRequest({ ...validBody, role: 'admin', cargo: undefined }) as never
    )
    expect(res.status).toBe(201)
    expect(createUserMock.mock.calls[0][0].cargo).toBeUndefined()
    expect(createUserMock.mock.calls[0][0].role).toBe('admin')
  })

  it('creates user with uppercased state and trimmed city', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: { toString: () => 'u1' } })
    const res = await POST(
      makeRequest({ ...validBody, state: 'sp', city: '   São Paulo   ' }) as never
    )
    expect(res.status).toBe(201)
    expect(createUserMock.mock.calls[0][0]).toMatchObject({
      state: 'SP',
      city: 'São Paulo',
    })
  })

  it('returns 409 when email/googleId already exists', async () => {
    findOneUserMock.mockResolvedValue({ _id: 'existing' })
    const res = await POST(makeRequest(validBody) as never)
    expect(res.status).toBe(409)
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('persists city as undefined when only whitespace', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: { toString: () => 'u1' } })
    await POST(makeRequest({ ...validBody, city: '   ' }) as never)
    expect(createUserMock.mock.calls[0][0].city).toBeUndefined()
  })
})
