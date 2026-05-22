// src/lib/__tests__/validations.test.ts
import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  profileSchema,
  whatsappSchema,
  fullNameSchema,
  stateSchema,
  citySchema,
  changePasswordSchema,
  passwordSchema,
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

describe('stateSchema (UF/IBGE)', () => {
  it('accepts uppercase UF (DF)', () => {
    expect(stateSchema.safeParse('DF').success).toBe(true)
  })
  it('accepts lowercase UF (sp) — normalized internally', () => {
    expect(stateSchema.safeParse('sp').success).toBe(true)
  })
  it('rejects empty', () => {
    expect(stateSchema.safeParse('').success).toBe(false)
  })
  it('rejects invalid UF (XX)', () => {
    expect(stateSchema.safeParse('XX').success).toBe(false)
  })
  it('rejects 3-letter codes', () => {
    expect(stateSchema.safeParse('BRA').success).toBe(false)
  })
})

describe('citySchema', () => {
  it('accepts empty string (optional)', () => {
    expect(citySchema.safeParse('').success).toBe(true)
  })
  it('accepts a normal city name', () => {
    expect(citySchema.safeParse('Brasília').success).toBe(true)
  })
  it('rejects city longer than 100 chars', () => {
    expect(citySchema.safeParse('a'.repeat(101)).success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('Senha123').success).toBe(true)
  })
  it('rejects when missing uppercase', () => {
    expect(passwordSchema.safeParse('senha123').success).toBe(false)
  })
  it('rejects when missing digit', () => {
    expect(passwordSchema.safeParse('SenhaSenha').success).toBe(false)
  })
  it('rejects when shorter than 8', () => {
    expect(passwordSchema.safeParse('Senh1').success).toBe(false)
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
    state: 'DF',
    city: 'Brasília',
  }

  it('accepts a valid aluno registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })
  it('accepts registration without city (optional)', () => {
    expect(registerSchema.safeParse({ ...valid, city: '' }).success).toBe(true)
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
  it('rejects missing state', () => {
    expect(registerSchema.safeParse({ ...valid, state: '' }).success).toBe(false)
  })
  it('rejects invalid state', () => {
    expect(registerSchema.safeParse({ ...valid, state: 'XX' }).success).toBe(false)
  })
})

describe('profileSchema', () => {
  const adminBase = {
    name: 'Admin Coord',
    email: 'admin@pf.gov.br',
    role: 'admin',
    lotacao: 'ANP',
    whatsapp: '(61) 99999-9999',
    state: 'DF',
    city: 'Brasília',
  }
  const alunoBase = {
    name: 'Aluno X',
    email: 'aluno@pf.gov.br',
    role: 'aluno',
    cargo: 'APF',
    lotacao: 'SR/DF',
    whatsapp: '(61) 99999-9999',
    state: 'DF',
    city: 'Brasília',
  }

  it('does not require cargo for admin role', () => {
    expect(profileSchema.safeParse(adminBase).success).toBe(true)
  })
  it('requires cargo for non-admin role', () => {
    expect(profileSchema.safeParse({ ...alunoBase, cargo: undefined }).success).toBe(false)
  })
  it('accepts valid aluno profile with cargo', () => {
    expect(profileSchema.safeParse(alunoBase).success).toBe(true)
  })
  it('rejects missing state', () => {
    expect(profileSchema.safeParse({ ...adminBase, state: '' }).success).toBe(false)
  })
  it('rejects invalid state UF', () => {
    expect(profileSchema.safeParse({ ...adminBase, state: 'ZZ' }).success).toBe(false)
  })
})

describe('changePasswordSchema', () => {
  const base = {
    currentPassword: 'Antiga123',
    newPassword: 'Nova456A',
    confirmPassword: 'Nova456A',
  }

  it('accepts a valid change-password payload', () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true)
  })
  it('rejects missing currentPassword', () => {
    expect(changePasswordSchema.safeParse({ ...base, currentPassword: '' }).success).toBe(false)
  })
  it('rejects weak newPassword', () => {
    expect(
      changePasswordSchema.safeParse({ ...base, newPassword: 'fraca', confirmPassword: 'fraca' })
        .success
    ).toBe(false)
  })
  it('rejects mismatched confirmation', () => {
    expect(
      changePasswordSchema.safeParse({ ...base, confirmPassword: 'OutraSenha1' }).success
    ).toBe(false)
  })
  it('rejects when newPassword equals currentPassword', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'Senha123',
        newPassword: 'Senha123',
        confirmPassword: 'Senha123',
      }).success
    ).toBe(false)
  })
})
