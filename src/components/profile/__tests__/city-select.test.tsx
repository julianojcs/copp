// src/components/profile/__tests__/city-select.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitySelect } from '@/components/profile/city-select'
import type { IBGECity } from '@/hooks/use-ibge'

const cities: IBGECity[] = [{ id: 5300108, nome: 'Brasília' }]

describe('CitySelect', () => {
  it('asks user to pick a state first when hasState=false', () => {
    render(
      <CitySelect value="" onValueChange={vi.fn()} cities={[]} hasState={false} />
    )
    expect(screen.getByText('Selecione o estado primeiro')).toBeTruthy()
  })

  it('shows loading placeholder while loading cities', () => {
    render(
      <CitySelect
        value=""
        onValueChange={vi.fn()}
        cities={[]}
        loading
        hasState
      />
    )
    expect(screen.getByText('Carregando cidades…')).toBeTruthy()
  })

  it('is disabled when no state was selected', () => {
    render(
      <CitySelect value="" onValueChange={vi.fn()} cities={cities} hasState={false} />
    )
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).not.toBeNull()
  })

  it('is disabled when cities are empty', () => {
    render(<CitySelect value="" onValueChange={vi.fn()} cities={[]} hasState />)
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).not.toBeNull()
  })

  it('is enabled when state is selected and cities are loaded', () => {
    render(<CitySelect value="" onValueChange={vi.fn()} cities={cities} hasState />)
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).toBeNull()
  })

  it('shows the default placeholder when no value', () => {
    render(<CitySelect value="" onValueChange={vi.fn()} cities={cities} hasState />)
    expect(screen.getByText('Selecione a cidade')).toBeTruthy()
  })
})
