// src/app/api/auth/register/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const findOneUserMock = vi.fn()
const createUserMock = vi.fn()
const findOneSettingsMock = vi.fn()
const findOneCourseMock = vi.fn()
const findByIdCourseMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})
const sendWelcomeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/user', () => ({
  User: {
    findOne: (...args: unknown[]) => findOneUserMock(...args),
    create: (...args: unknown[]) => createUserMock(...args),
  },
}))
vi.mock('@/models/course', () => ({
  Course: {
    findById: (...args: unknown[]) => ({ lean: () => findByIdCourseMock(...args) }),
    findOne: (...args: unknown[]) => ({
      sort: () => ({ lean: () => findOneCourseMock(...args) }),
    }),
  },
}))
vi.mock('@/models/app-settings', () => ({
  AppSettings: { findOne: () => ({ lean: () => findOneSettingsMock() }) },
}))
vi.mock('@/lib/email', () => ({ sendWelcomePendingEmail: (...a: unknown[]) => sendWelcomeMock(...a) }))

import { POST } from '@/app/api/auth/register/route'

function makeRequest(body: unknown): Request {
  return new Request('http://test.local/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: 'Joao Silva',
  email: 'joao@pf.gov.br',
  password: 'Senha123',
  confirmPassword: 'Senha123',
  whatsapp: '(61) 99999-9999',
  lotacao: 'SR/DF',
  cargo: 'APF',
  state: 'DF',
  city: 'Brasília',
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    findOneUserMock.mockReset()
    createUserMock.mockReset()
    findOneSettingsMock.mockReset()
    findOneCourseMock.mockReset()
    findByIdCourseMock.mockReset()
    sendWelcomeMock.mockClear()
    findOneSettingsMock.mockResolvedValue(null)
    findOneCourseMock.mockResolvedValue({
      _id: 'course-id',
      name: 'V COPP',
      isActive: true,
    })
  })

  it('rejects missing state with 400', async () => {
    findOneUserMock.mockResolvedValue(null)
    const res = await POST(makeRequest({ ...validBody, state: '' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejects invalid state UF with 400', async () => {
    findOneUserMock.mockResolvedValue(null)
    const res = await POST(makeRequest({ ...validBody, state: 'XX' }) as never)
    expect(res.status).toBe(400)
  })

  it('creates a user with normalized uppercase state', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: 'new-user-id', email: validBody.email, name: validBody.name })

    const res = await POST(makeRequest({ ...validBody, state: 'df' }) as never)
    expect(res.status).toBe(201)
    expect(createUserMock).toHaveBeenCalledTimes(1)
    expect(createUserMock.mock.calls[0][0]).toMatchObject({
      email: 'joao@pf.gov.br',
      state: 'DF',
      city: 'Brasília',
      role: 'aluno',
      status: 'pending',
    })
  })

  it('returns 409 when email already exists', async () => {
    findOneUserMock.mockResolvedValue({ _id: 'existing' })
    const res = await POST(makeRequest(validBody) as never)
    expect(res.status).toBe(409)
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('does not fail registration when welcome email fails', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: 'id', email: 'a@b', name: 'A B' })
    sendWelcomeMock.mockRejectedValueOnce(new Error('smtp down'))
    const res = await POST(makeRequest(validBody) as never)
    expect(res.status).toBe(201)
  })

  it('persists city as undefined when empty', async () => {
    findOneUserMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ _id: 'id', email: 'a@b', name: 'A B' })
    await POST(makeRequest({ ...validBody, city: '' }) as never)
    expect(createUserMock.mock.calls[0][0].city).toBeUndefined()
  })
})
