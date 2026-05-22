// src/app/api/users/[id]/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = vi.fn()
const findByIdMock = vi.fn()
const findByIdAndUpdateMock = vi.fn()
const findOneUserMock = vi.fn()
const findByIdLotacaoMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})
const sendEmailChangeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findById: (...a: unknown[]) => findByIdMock(...a),
    findOne: (...a: unknown[]) => findOneUserMock(...a),
    findByIdAndUpdate: (...a: unknown[]) => ({
      select: () => findByIdAndUpdateMock(...a),
    }),
  },
}))
vi.mock('@/models/lotacao', () => ({
  Lotacao: {
    findById: (...a: unknown[]) => ({ lean: () => findByIdLotacaoMock(...a) }),
  },
}))
vi.mock('@/lib/email', () => ({
  sendEmailChangeVerification: (...a: unknown[]) => sendEmailChangeMock(...a),
}))

import { PUT } from '@/app/api/users/[id]/route'

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/users/u1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'u1' })
const VALID_LOTACAO_ID = 'a'.repeat(24)

const sampleLotacao = {
  _id: VALID_LOTACAO_ID,
  sigla: 'SR/PF/DF',
  nome: 'Superintendência Regional no Distrito Federal',
  tipo: 'Superintendência Regional',
  uf: 'DF',
  cidade: 'Brasília',
}

const validBody = {
  name: 'Joao Silva',
  email: 'joao@pf.gov.br',
  role: 'aluno',
  cargo: 'APF',
  lotacaoId: VALID_LOTACAO_ID,
  whatsapp: '(61) 99999-9999',
}

const currentUserDoc = {
  _id: 'u1',
  email: 'joao@pf.gov.br',
  name: 'Joao Silva',
  role: 'aluno',
}

describe('PUT /api/users/[id]', () => {
  beforeEach(() => {
    authMock.mockReset()
    findByIdMock.mockReset()
    findByIdAndUpdateMock.mockReset()
    findOneUserMock.mockReset()
    findByIdLotacaoMock.mockReset()
    sendEmailChangeMock.mockClear()
    findByIdLotacaoMock.mockResolvedValue(sampleLotacao)
    findByIdMock.mockResolvedValue(currentUserDoc)
    findByIdAndUpdateMock.mockResolvedValue({ _id: 'u1', email: 'joao@pf.gov.br', name: 'Joao Silva' })
  })

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null)
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is neither owner nor moderator', async () => {
    authMock.mockResolvedValue({ user: { id: 'someone-else', role: 'aluno' } })
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(403)
  })

  it('allows the user to edit their own profile', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(200)
  })

  it('allows admin to edit any profile', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-id', role: 'admin' } })
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(200)
  })

  it('returns 400 on invalid payload (zod validation)', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    const res = await PUT(
      makeRequest({ ...validBody, lotacaoId: 'not-an-id' }) as never,
      { params } as never,
    )
    expect(res.status).toBe(400)
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when lotacao is not found in the DB', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    findByIdLotacaoMock.mockResolvedValueOnce(null)
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(400)
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the user being edited does not exist', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    findByIdMock.mockResolvedValueOnce(null)
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(404)
  })

  it('derives state/city/lotacaoSigla/lotacaoNome/lotacaoTipo from the resolved lotacao', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })

    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(200)

    const update = findByIdAndUpdateMock.mock.calls[0][1] as { $set: Record<string, unknown> }
    expect(update.$set).toMatchObject({
      lotacaoSigla: 'SR/PF/DF',
      lotacaoNome: 'Superintendência Regional no Distrito Federal',
      lotacaoTipo: 'Superintendência Regional',
      state: 'DF',
      city: 'Brasília',
    })
  })

  it('marks profileCompleted=true when whatsapp + lotacaoId + cargo are present', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    const res = await PUT(makeRequest(validBody) as never, { params } as never)
    expect(res.status).toBe(200)
    const update = findByIdAndUpdateMock.mock.calls[0][1] as { $set: Record<string, unknown> }
    expect(update.$set.profileCompleted).toBe(true)
  })

  it('returns 409 when changing email to one already taken', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    findOneUserMock.mockResolvedValueOnce({ _id: 'other-user' })
    const res = await PUT(
      makeRequest({ ...validBody, email: 'outro@pf.gov.br' }) as never,
      { params } as never,
    )
    expect(res.status).toBe(409)
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('issues a verification token and sends email when email is changed to a free one', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'aluno' } })
    findOneUserMock.mockResolvedValueOnce(null)
    const res = await PUT(
      makeRequest({ ...validBody, email: 'novo@pf.gov.br' }) as never,
      { params } as never,
    )
    expect(res.status).toBe(200)
    const update = findByIdAndUpdateMock.mock.calls[0][1] as { $set: Record<string, unknown> }
    expect(update.$set.emailVerified).toBe(false)
    expect(typeof update.$set.verificationToken).toBe('string')
    expect(sendEmailChangeMock).toHaveBeenCalledTimes(1)
  })
})
