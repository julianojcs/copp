// src/lib/constants/__tests__/brazilian-states.test.ts
import { describe, it, expect } from 'vitest'
import {
  BRAZILIAN_STATES,
  VALID_UFS,
  getStateName,
} from '@/lib/constants/brazilian-states'

describe('BRAZILIAN_STATES', () => {
  it('contains exactly 27 federative units (26 + DF)', () => {
    expect(Object.keys(BRAZILIAN_STATES)).toHaveLength(27)
  })
  it('maps every UF to a non-empty state name', () => {
    for (const [uf, name] of Object.entries(BRAZILIAN_STATES)) {
      expect(uf).toMatch(/^[A-Z]{2}$/)
      expect(name.length).toBeGreaterThan(0)
    }
  })
  it('preserves diacritics in pt-BR names (Espírito Santo, São Paulo, Rondônia)', () => {
    expect(BRAZILIAN_STATES.ES).toBe('Espírito Santo')
    expect(BRAZILIAN_STATES.SP).toBe('São Paulo')
    expect(BRAZILIAN_STATES.RO).toBe('Rondônia')
  })
})

describe('VALID_UFS', () => {
  it('matches BRAZILIAN_STATES keys', () => {
    expect(VALID_UFS.size).toBe(Object.keys(BRAZILIAN_STATES).length)
  })
  it('accepts known UFs', () => {
    expect(VALID_UFS.has('DF')).toBe(true)
    expect(VALID_UFS.has('SP')).toBe(true)
    expect(VALID_UFS.has('AC')).toBe(true)
  })
  it('rejects unknown codes', () => {
    expect(VALID_UFS.has('XX')).toBe(false)
    expect(VALID_UFS.has('df')).toBe(false)
  })
})

describe('getStateName', () => {
  it('resolves uppercase UF', () => {
    expect(getStateName('DF')).toBe('Distrito Federal')
  })
  it('normalizes lowercase input', () => {
    expect(getStateName('sp')).toBe('São Paulo')
  })
  it('trims whitespace', () => {
    expect(getStateName('  RJ  ')).toBe('Rio de Janeiro')
  })
  it('returns undefined for invalid input', () => {
    expect(getStateName('XX')).toBeUndefined()
    expect(getStateName('')).toBeUndefined()
  })
})
