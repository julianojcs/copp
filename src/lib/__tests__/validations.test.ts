// src/lib/__tests__/validations.test.ts
import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  profileSchema,
  whatsappSchema,
  fullNameSchema,
} from '@/lib/validations'

describe('whatsappSchema', () => {
  it('accepts (11) 99999-9999', () => {
    expect(whatsappSchema.safeParse('(11) 99999-9999').success).toBe(true)
  })
  it('accepts 11999999999', () => {
    expect(whatsappSchema.safeParse('11999999999').success).toBe(true)
  })
  it('accepts +55 11 99999-9999', () => {
    expect(whatsappSchema.safeParse('+55 11 99999-9999').success).toBe(true)
  })
  it('rejects empty', () => {
    expect(whatsappSchema.safeParse('').success).toBe(false)
  })
  it('rejects garbage', () => {
    expect(whatsappSchema.safeParse('abc').success).toBe(false)
  })
})

describe('fullNameSchema', () => {
  it('requires at least one space (nome + sobrenome)', () => {
    expect(fullNameSchema.safeParse('Joao').success).toBe(false)
    expect(fullNameSchema.safeParse('Joao Silva').success).toBe(true)
  })
  it('rejects too short', () => {
    expect(fullNameSchema.safeParse('Jo').success).toBe(false)
  })
  it('rejects too long', () => {
    expect(fullNameSchema.safeParse('a'.repeat(101)).success).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    name: 'Joao Silva',
    email: 'joao@pf.gov.br',
    password: 'Senha123',
    confirmPassword: 'Senha123',
    whatsapp: '(61) 99999-9999',
    lotacao: 'SR/DF',
    cargo: 'APF',
  }

  it('accepts a valid aluno registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects missing whatsapp', () => {
    expect(registerSchema.safeParse({ ...valid, whatsapp: '' }).success).toBe(false)
  })
  it('rejects missing lotacao', () => {
    expect(registerSchema.safeParse({ ...valid, lotacao: '' }).success).toBe(false)
  })
  it('rejects missing cargo for aluno', () => {
    expect(registerSchema.safeParse({ ...valid, cargo: undefined }).success).toBe(false)
  })
  it('rejects invalid cargo enum', () => {
    expect(registerSchema.safeParse({ ...valid, cargo: 'XYZ' }).success).toBe(false)
  })
  it('rejects mismatched passwords', () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: 'other' }).success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('does not require cargo for admin role', () => {
    const data = {
      name: 'Admin Coord',
      email: 'admin@pf.gov.br',
      role: 'admin',
      lotacao: 'ANP',
      whatsapp: '(61) 99999-9999',
    }
    const result = profileSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
  it('requires cargo for non-admin role', () => {
    const data = {
      name: 'Aluno X',
      email: 'aluno@pf.gov.br',
      role: 'aluno',
      lotacao: 'SR/DF',
      whatsapp: '(61) 99999-9999',
    }
    expect(profileSchema.safeParse(data).success).toBe(false)
  })
})
