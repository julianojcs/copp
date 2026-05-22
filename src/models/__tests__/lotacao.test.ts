// src/models/__tests__/lotacao.test.ts
import { describe, it, expect } from 'vitest'
import { Lotacao, LOTACAO_TIPOS } from '@/models/lotacao'

function buildDoc(overrides: Record<string, unknown> = {}) {
  return new Lotacao({
    sigla: 'SR/PF/DF',
    nome: 'Superintendência Regional no Distrito Federal',
    tipo: LOTACAO_TIPOS.SUPERINTENDENCIA_REGIONAL,
    uf: 'DF',
    cidade: 'Brasília',
    ...overrides,
  })
}

describe('Lotacao model', () => {
  it('accepts a valid document', () => {
    const doc = buildDoc()
    const err = doc.validateSync()
    expect(err).toBeUndefined()
  })

  it('normalizes sigla to uppercase', () => {
    const doc = buildDoc({ sigla: 'sr/pf/sp' })
    doc.validateSync()
    expect(doc.sigla).toBe('SR/PF/SP')
  })

  it('normalizes uf to uppercase', () => {
    const doc = buildDoc({ uf: 'sp' })
    doc.validateSync()
    expect(doc.uf).toBe('SP')
  })

  it('rejects an invalid UF (not in VALID_UFS)', () => {
    const doc = buildDoc({ uf: 'XX' })
    const err = doc.validateSync()
    expect(err?.errors?.uf).toBeDefined()
    expect(err?.errors?.uf?.message).toMatch(/UF inválida/i)
  })

  it('rejects a tipo outside the enum', () => {
    const doc = buildDoc({ tipo: 'Departamento Inventado' })
    const err = doc.validateSync()
    expect(err?.errors?.tipo).toBeDefined()
  })

  it('requires sigla', () => {
    const doc = buildDoc({ sigla: undefined })
    const err = doc.validateSync()
    expect(err?.errors?.sigla).toBeDefined()
  })

  it('requires nome', () => {
    const doc = buildDoc({ nome: undefined })
    const err = doc.validateSync()
    expect(err?.errors?.nome).toBeDefined()
  })

  it('requires tipo', () => {
    const doc = buildDoc({ tipo: undefined })
    const err = doc.validateSync()
    expect(err?.errors?.tipo).toBeDefined()
  })

  it('requires uf', () => {
    const doc = buildDoc({ uf: undefined })
    const err = doc.validateSync()
    expect(err?.errors?.uf).toBeDefined()
  })

  it('requires cidade', () => {
    const doc = buildDoc({ cidade: undefined })
    const err = doc.validateSync()
    expect(err?.errors?.cidade).toBeDefined()
  })

  it('accepts each known LOTACAO_TIPOS value', () => {
    for (const tipo of Object.values(LOTACAO_TIPOS)) {
      const doc = buildDoc({ tipo })
      expect(doc.validateSync()).toBeUndefined()
    }
  })
})
