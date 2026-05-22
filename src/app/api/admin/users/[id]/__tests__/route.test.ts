// src/app/api/admin/users/[id]/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const findByIdMock = vi.fn()
const findByIdAndUpdateMock = vi.fn()
const findByIdLotacaoMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findById: (...a: unknown[]) => findByIdMock(...a),
    findByIdAndUpdate: (...a: unknown[]) => findByIdAndUpdateMock(...a),
  },
}))
vi.mock('@/models/lotacao', () => ({
  Lotacao: {
    findById: (...a: unknown[]) => ({ lean: () => findByIdLotacaoMock(...a) }),
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

const VALID_LOTACAO_ID = 'a'.repeat(24)
const sampleLotacao = {
  _id: VALID_LOTACAO_ID,
  sigla: 'SR/PF/SP',
  nome: 'Superintendência Regional em São Paulo',
  tipo: 'Superintendência Regional',
  uf: 'SP',
  cidade: 'São Paulo',
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    authMock.mockReset()
    findByIdMock.mockReset()
    findByIdAndUpdateMock.mockReset()
    findByIdLotacaoMock.mockReset()
    findByIdLotacaoMock.mockResolvedValue(sampleLotacao)
  })

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: 'X' }) as never, { params } as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller lacks edit permission', async () => {
    authMock.mockResolvedValue({ user: { role: 'aluno' } })
    const res = await PATCH(makeRequest({ name: 'X' }) as never, { params } as never)
    expect(res.status).toBe(403)
  })

  it('whitelists only editable fields (drops state/city/password/bogus)', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdAndUpdateMock.mockResolvedValue({ _id: 'u1' })

    const res = await PATCH(
      makeRequest({
        name: 'Alice',
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
    expect(update.name).toBe('Alice')
    expect('state' in update).toBe(false)
    expect('city' in update).toBe(false)
    expect('password' in update).toBe(false)
    expect('rejectedReason' in update).toBe(false)
    expect('bogus' in update).toBe(false)
  })

  it('resolves lotacaoId and derives state/city + denormalized fields', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdAndUpdateMock.mockResolvedValue({ _id: 'u1' })

    const res = await PATCH(
      makeRequest({ lotacaoId: VALID_LOTACAO_ID }) as never,
      { params } as never
    )
    expect(res.status).toBe(200)
    const update = findByIdAndUpdateMock.mock.calls[0][1] as Record<string, unknown>
    expect(update.lotacaoSigla).toBe('SR/PF/SP')
    expect(update.lotacaoNome).toBe('Superintendência Regional em São Paulo')
    expect(update.lotacaoTipo).toBe('Superintendência Regional')
    expect(update.state).toBe('SP')
    expect(update.city).toBe('São Paulo')
  })

  it('returns 400 when lotacaoId format is invalid', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    const res = await PATCH(
      makeRequest({ lotacaoId: 'not-a-valid-id' }) as never,
      { params } as never
    )
    expect(res.status).toBe(400)
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when lotacao is not found', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdLotacaoMock.mockResolvedValueOnce(null)
    const res = await PATCH(
      makeRequest({ lotacaoId: VALID_LOTACAO_ID }) as never,
      { params } as never
    )
    expect(res.status).toBe(400)
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when user not found', async () => {
    authMock.mockResolvedValue({ user: { role: 'admin' } })
    findByIdAndUpdateMock.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: 'X' }) as never, { params } as never)
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
