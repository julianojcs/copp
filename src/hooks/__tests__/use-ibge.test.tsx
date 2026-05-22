// src/hooks/__tests__/use-ibge.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useIBGE } from '@/hooks/use-ibge'

type FetchMock = ReturnType<typeof vi.fn>

const stateFixture = [
  { id: 53, sigla: 'DF', nome: 'Distrito Federal' },
  { id: 35, sigla: 'SP', nome: 'São Paulo' },
]
const cityFixture = [
  { id: 5300108, nome: 'Brasília' },
]

function mockFetchOK(): FetchMock {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/estados/') && url.includes('/municipios')) {
      return new Response(JSON.stringify(cityFixture), { status: 200 })
    }
    if (url.endsWith('/estados?orderBy=nome')) {
      return new Response(JSON.stringify(stateFixture), { status: 200 })
    }
    return new Response('not found', { status: 404 })
  }) as FetchMock
}

describe('useIBGE', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = mockFetchOK()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches states on mount', async () => {
    const { result } = renderHook(() => useIBGE())
    await waitFor(() => expect(result.current.loadingStates).toBe(false))
    expect(result.current.states).toEqual(stateFixture)
    expect(result.current.statesError).toBeNull()
  })

  it('does not fetch cities until a UF is selected', async () => {
    const { result } = renderHook(() => useIBGE())
    await waitFor(() => expect(result.current.loadingStates).toBe(false))
    expect(result.current.cities).toEqual([])
    const cityCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/municipios'))
    expect(cityCalls).toHaveLength(0)
  })

  it('fetches cities when UF is set', async () => {
    const { result } = renderHook(() => useIBGE())
    await waitFor(() => expect(result.current.loadingStates).toBe(false))

    act(() => result.current.setSelectedUF('DF'))

    await waitFor(() => expect(result.current.loadingCities).toBe(false))
    expect(result.current.cities).toEqual(cityFixture)
    expect(result.current.citiesError).toBeNull()
  })

  it('preloads cities when initialUF is provided', async () => {
    const { result } = renderHook(() => useIBGE('DF'))
    await waitFor(() => expect(result.current.loadingCities).toBe(false))
    expect(result.current.cities).toEqual(cityFixture)
  })

  it('clears cities when UF is cleared', async () => {
    const { result } = renderHook(() => useIBGE('DF'))
    await waitFor(() => expect(result.current.cities).toEqual(cityFixture))

    act(() => result.current.setSelectedUF(''))

    await waitFor(() => expect(result.current.cities).toEqual([]))
  })

  it('exposes a friendly error when /estados fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 }))
    )
    const { result } = renderHook(() => useIBGE())
    await waitFor(() => expect(result.current.loadingStates).toBe(false))
    expect(result.current.statesError).toMatch(/não foi possível carregar os estados/i)
  })

  it('exposes a friendly error when /municipios network throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/municipios')) throw new Error('network down')
        return new Response(JSON.stringify(stateFixture), { status: 200 })
      })
    )
    const { result } = renderHook(() => useIBGE())
    await waitFor(() => expect(result.current.loadingStates).toBe(false))
    act(() => result.current.setSelectedUF('DF'))
    await waitFor(() => expect(result.current.loadingCities).toBe(false))
    expect(result.current.citiesError).toMatch(/falha ao consultar a api do ibge/i)
  })
})
