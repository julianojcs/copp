// src/lib/validations.ts
import { z } from 'zod'
import { USER_ROLES, PF_CARGOS } from '@/lib/constants'
import { VALID_UFS } from '@/lib/constants/brazilian-states'

export const stateSchema = z
  .string()
  .min(1, 'Estado é obrigatório')
  .refine((v) => VALID_UFS.has(v.toUpperCase()), 'Estado (UF) inválido')

export const citySchema = z
  .string()
  .max(100, 'Cidade não pode exceder 100 caracteres')
  .optional()
  .or(z.literal(''))

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Identificador inválido')

export const lotacaoIdSchema = z
  .string()
  .min(1, 'Lotação é obrigatória')
  .regex(/^[a-fA-F0-9]{24}$/, 'Lotação inválida')

/**
 * Brazilian WhatsApp number — accepts common formats:
 *   "(11) 99999-9999", "11999999999", "+55 11 99999-9999"
 */
export const whatsappSchema = z
  .string()
  .min(1, 'WhatsApp é obrigatório')
  .regex(
    /^(?:\+?55\s?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
    'WhatsApp inválido. Use formato (11) 99999-9999'
  )

/**
 * Full name — requires at least one space (nome + sobrenome).
 */
export const fullNameSchema = z
  .string()
  .min(5, 'Nome completo deve ter ao menos 5 caracteres')
  .max(100, 'Nome completo não pode exceder 100 caracteres')
  .refine((v) => /\s/.test(v.trim()), 'Informe o nome completo (nome e sobrenome)')

export const cargoSchema = z.enum(
  Object.values(PF_CARGOS) as [string, ...string[]],
  { message: 'Cargo inválido' }
)

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Senha deve ter uma maiúscula, uma minúscula e um número'
  )

/**
 * Schema for user registration (public endpoint).
 * Backend forces role='aluno' — client cannot self-promote.
 */
export const registerSchema = z
  .object({
    name: fullNameSchema,
    email: z.string().email('Email inválido'),
    password: passwordSchema,
    confirmPassword: z.string(),
    whatsapp: whatsappSchema,
    lotacaoId: lotacaoIdSchema,
    cargo: cargoSchema,
    bio: z.string().max(500, 'Bio não pode exceder 500 caracteres').optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

/**
 * Schema for profile update.
 * `cargo` is required unless `role === 'admin'`.
 */
export const profileSchema = z
  .object({
    name: fullNameSchema,
    email: z.string().email('Email inválido'),
    role: z.enum(Object.values(USER_ROLES) as [string, ...string[]], { message: 'Função inválida' }),
    cargo: cargoSchema.optional(),
    lotacaoId: lotacaoIdSchema,
    whatsapp: whatsappSchema,
    linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
    instagram: z.string().optional().or(z.literal('')),
    twitter: z.string().optional().or(z.literal('')),
    bio: z.string().max(500, 'Bio não pode exceder 500 caracteres').optional().or(z.literal('')),
  })
  .refine((d) => d.role === USER_ROLES.ADMIN || !!d.cargo, {
    message: 'Cargo é obrigatório',
    path: ['cargo'],
  })

export type ProfileFormData = z.infer<typeof profileSchema>

export const photoSchema = z.object({
  title: z.string().max(100, 'Título não pode exceder 100 caracteres').optional().or(z.literal('')),
  description: z.string().max(500, 'Descrição não pode exceder 500 caracteres').optional().or(z.literal('')),
  location: z.string().max(100, 'Local não pode exceder 100 caracteres').optional().or(z.literal('')),
  takenAt: z.string().optional().or(z.literal('')),
  isPublic: z.boolean().default(true),
})

export type PhotoFormData = z.infer<typeof photoSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
