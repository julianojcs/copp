// src/components/profile/__tests__/state-select.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateSelect } from '@/components/profile/state-select'
import type { IBGEState } from '@/hooks/use-ibge'

const states: IBGEState[] = [
  { id: 53, sigla: 'DF', nome: 'Distrito Federal' },
  { id: 35, sigla: 'SP', nome: 'São Paulo' },
]

describe('StateSelect', () => {
  it('shows default placeholder when no value and not loading', () => {
    render(<StateSelect value="" onValueChange={vi.fn()} states={states} />)
    expect(screen.getByText('Selecione o estado')).toBeTruthy()
  })

  it('shows loading placeholder while loading', () => {
    render(<StateSelect value="" onValueChange={vi.fn()} states={[]} loading />)
    expect(screen.getByText('Carregando estados…')).toBeTruthy()
  })

  it('is disabled when loading', () => {
    render(<StateSelect value="" onValueChange={vi.fn()} states={[]} loading />)
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).not.toBeNull()
  })

  it('is disabled when states list is empty', () => {
    render(<StateSelect value="" onValueChange={vi.fn()} states={[]} />)
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).not.toBeNull()
  })

  it('is enabled when states are loaded', () => {
    render(<StateSelect value="" onValueChange={vi.fn()} states={states} />)
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).toBeNull()
  })

  it('honors a custom placeholder', () => {
    render(
      <StateSelect
        value=""
        onValueChange={vi.fn()}
        states={states}
        placeholder="Escolha sua UF"
      />
    )
    expect(screen.getByText('Escolha sua UF')).toBeTruthy()
  })
})
