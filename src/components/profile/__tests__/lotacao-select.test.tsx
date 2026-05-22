// src/components/profile/__tests__/lotacao-select.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LotacaoSelect, type LotacaoOption } from '@/components/profile/lotacao-select'

const items: LotacaoOption[] = [
  { id: 'id-df', sigla: 'SR/PF/DF', nome: 'Superintendência Regional no Distrito Federal', tipo: 'Superintendência Regional', uf: 'DF', cidade: 'Brasília' },
  { id: 'id-sp', sigla: 'SR/PF/SP', nome: 'Superintendência Regional em São Paulo', tipo: 'Superintendência Regional', uf: 'SP', cidade: 'São Paulo' },
  { id: 'id-rj', sigla: 'SR/PF/RJ', nome: 'Superintendência Regional no Rio de Janeiro', tipo: 'Superintendência Regional', uf: 'RJ', cidade: 'Rio de Janeiro' },
]

function mockFetchOk() {
  return vi.fn(async () => new Response(JSON.stringify({ items, total: items.length }), { status: 200 }))
}

describe('LotacaoSelect', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchOk())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the placeholder when nothing is selected', () => {
    render(<LotacaoSelect value={null} onChange={() => {}} placeholder="Selecione a lotação" />)
    expect(screen.getByText('Selecione a lotação')).toBeTruthy()
  })

  it('renders the selected lotação label when value matches an option', async () => {
    render(<LotacaoSelect value="id-df" onChange={() => {}} />)
    await waitFor(() => expect(screen.queryByText('SR/PF/DF')).toBeTruthy())
    expect(screen.getByText(/Distrito Federal/)).toBeTruthy()
  })

  it('opens a search dialog when the trigger is clicked', async () => {
    render(<LotacaoSelect value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeTruthy())
    expect(screen.getByPlaceholderText(/buscar por sigla/i)).toBeTruthy()
  })

  it('filters items by sigla through the search input', async () => {
    render(<LotacaoSelect value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(3))

    fireEvent.change(screen.getByPlaceholderText(/buscar por sigla/i), { target: { value: 'SP' } })

    await waitFor(
      () => expect(screen.getAllByRole('option').length).toBe(1),
      { timeout: 2000 },
    )
    expect(screen.getByRole('option').textContent).toMatch(/SR\/PF\/SP/)
  })

  it('calls onChange with the selected option', async () => {
    const onChange = vi.fn()
    render(<LotacaoSelect value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(3))

    const target = screen.getByText('SR/PF/RJ').closest('button')
    expect(target).toBeTruthy()
    fireEvent.click(target!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({ id: 'id-rj', sigla: 'SR/PF/RJ' })
  })

  it('exposes a clear control that calls onChange(null)', async () => {
    const onChange = vi.fn()
    render(<LotacaoSelect value="id-df" onChange={onChange} />)

    await waitFor(() => expect(screen.queryByText('SR/PF/DF')).toBeTruthy())

    const clearButton = screen.getByRole('button', { name: /limpar lota/i })
    fireEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows a friendly error when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))

    render(<LotacaoSelect value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(
      () => expect(screen.queryByText(/falha ao carregar/i)).toBeTruthy(),
      { timeout: 2000 },
    )
  })

  it('shows empty state when filter has no matches', async () => {
    render(<LotacaoSelect value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(3))

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), {
      target: { value: 'zzzzzzzz' },
    })

    await waitFor(
      () => expect(screen.queryByText(/nenhuma lota.*encontrada/i)).toBeTruthy(),
      { timeout: 2000 },
    )
  })

  it('respects disabled prop', () => {
    render(<LotacaoSelect value={null} onChange={() => {}} disabled />)
    const trigger = screen.getByRole('button')
    expect(trigger.hasAttribute('disabled')).toBe(true)
  })
})
