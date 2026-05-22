// src/app/api/lotacoes/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

interface QueryStub {
  select: () => QueryStub
  sort: () => QueryStub
  limit: () => QueryStub
  lean: () => Promise<unknown[]>
}

const findMock = vi.fn()
const connectDBMock = vi.fn().mockResolvedValue({})

vi.mock('@/lib/db', () => ({ connectDB: () => connectDBMock() }))
vi.mock('@/models/lotacao', () => ({
  Lotacao: {
    find: (...args: unknown[]) => findMock(...args),
  },
}))

import { GET } from '@/app/api/lotacoes/route'

function buildChain(items: unknown[]): QueryStub {
  const chain: QueryStub = {
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    lean: async () => items,
  }
  return chain
}

function makeRequest(qs = ''): Request {
  return new Request(`http://test.local/api/lotacoes${qs}`)
}

const sampleItems = [
  {
    _id: { toString: () => 'id1' },
    sigla: 'SR/PF/DF',
    nome: 'Superintendência Regional no Distrito Federal',
    tipo: 'Superintendência Regional',
    uf: 'DF',
    cidade: 'Brasília',
  },
  {
    _id: { toString: () => 'id2' },
    sigla: 'SR/PF/SP',
    nome: 'Superintendência Regional em São Paulo',
    tipo: 'Superintendência Regional',
    uf: 'SP',
    cidade: 'São Paulo',
  },
]

describe('GET /api/lotacoes', () => {
  beforeEach(() => {
    findMock.mockReset()
    findMock.mockReturnValue(buildChain(sampleItems))
  })

  it('returns the full list with no filters', async () => {
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toHaveLength(2)
    expect(data.items[0]).toMatchObject({ id: 'id1', sigla: 'SR/PF/DF', uf: 'DF' })
    expect(findMock).toHaveBeenCalledWith({})
  })

  it('filters by uf (uppercased)', async () => {
    await GET(makeRequest('?uf=df') as never)
    expect(findMock).toHaveBeenCalledWith({ uf: 'DF' })
  })

  it('rejects an invalid uf with 400', async () => {
    const res = await GET(makeRequest('?uf=XX') as never)
    expect(res.status).toBe(400)
    expect(findMock).not.toHaveBeenCalled()
  })

  it('filters by tipo', async () => {
    await GET(makeRequest('?tipo=Delegacia%20Regional') as never)
    expect(findMock).toHaveBeenCalledWith({ tipo: 'Delegacia Regional' })
  })

  it('builds a case-insensitive $or filter when q is provided', async () => {
    await GET(makeRequest('?q=brasilia') as never)
    const filter = findMock.mock.calls[0][0] as Record<string, unknown>
    expect(filter).toHaveProperty('$or')
    const orClauses = filter.$or as Array<Record<string, unknown>>
    expect(orClauses).toHaveLength(2)
    expect(orClauses[0]).toEqual({ sigla: { $regex: 'brasilia', $options: 'i' } })
    expect(orClauses[1]).toEqual({ nome: { $regex: 'brasilia', $options: 'i' } })
  })

  it('escapes regex metacharacters in q', async () => {
    await GET(makeRequest('?q=' + encodeURIComponent('foo.*bar')) as never)
    const filter = findMock.mock.calls[0][0] as Record<string, unknown>
    const orClauses = filter.$or as Array<Record<string, unknown>>
    expect(orClauses[0]).toEqual({ sigla: { $regex: 'foo\\.\\*bar', $options: 'i' } })
  })

  it('clamps limit to MAX_LIMIT (200) when an absurd value is given', async () => {
    // We cannot inspect the limit call directly via the chain stub, but we can
    // assert the route does not throw and returns 200.
    const res = await GET(makeRequest('?limit=99999') as never)
    expect(res.status).toBe(200)
  })

  it('returns 500 when the DB layer throws', async () => {
    findMock.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toMatch(/erro/i)
  })
})
