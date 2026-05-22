// src/app/api/auth/complete-profile/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const findOneUserMock = vi.fn()
const createUserMock = vi.fn()
const findByIdLotacaoMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findOne: (...args: unknown[]) => findOneUserMock(...args),
    create: (...args: unknown[]) => createUserMock(...args),
  },
}))
vi.mock('@/models/lotacao', () => ({
  Lotacao: {
    findById: (...args: unknown[]) => ({ lean: () => findByIdLotacaoMock(...args) }),
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

const VALID_ID = 'a'.repeat(24)

const validBody = {
  email: 'novo@pf.gov.br',
  name: 'Maria Souza',
  googleId: 'google-abc',
  lotacaoId: VALID_ID,
  whatsapp: '(11) 99999-9999',
  cargo: 'EPF',
}

const sampleLotacao = {
  _id: VALID_ID,
  sigla: 'SR/PF/SP',
  nome: 'Superintendência Regional em São Paulo',
  tipo: 'Superintendência Regional',
  uf: 'SP',
  cidade: 'São Paulo',
}

describe('POST /api/auth/complete-profile', () => {
  beforeEach(() => {
    findOneUserMock.mockReset()
    createUserMock.mockReset()
    findByIdLotacaoMock.mockReset()
    findByIdLotacaoMock.mockResolvedValue(sampleLotacao)
  })

  it('rejects missing lotacaoId', async () => {
    const res = await POST(makeRequest({ ...validBody, lotacaoId: '' }) as never)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/lota/i)
  })

  it('rejects invalid lotacaoId format', async () => {
    const res = await POST(makeRequest({ ...validBody, lotacaoId: 'not-valid' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when lotacao is not found', async () => {
    findByIdLotacaoMock.mockResolvedValueOnce(null)
    const res = await POST(makeRequest(validBody) as never)
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

  it('creates user denormalizing lotacao and deriving state/city', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: { toString: () => 'u1' } })
    const res = await POST(makeRequest(validBody) as never)
    expect(res.status).toBe(201)
    expect(createUserMock.mock.calls[0][0]).toMatchObject({
      lotacaoSigla: 'SR/PF/SP',
      lotacaoNome: 'Superintendência Regional em São Paulo',
      lotacaoTipo: 'Superintendência Regional',
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
})
