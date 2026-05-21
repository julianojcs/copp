# V COPP Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o app "IBS London" para "V COPP" — sistema da turma do 5º Curso de Operadores de Proteção a Pessoa (ANP/PF), com novos cargos (APF/DPF/EPF/PPF), aprovação por administração, peer approval opcional e branding gerenciado em DB.

**Architecture:** Next.js 16 App Router + MongoDB/Mongoose + NextAuth v5. Branding e turma ativa em uma collection singleton `AppSettings` (TTL cache 60s). User schema estendido com `cargo`, `lotacao`, `status`. Painel admin em group route `(admin)`. Peer approval condicionado por flag em `AppSettings`.

**Tech Stack:** Next.js 16, React 19, MongoDB/Mongoose, NextAuth v5, Zod, shadcn/ui, Tailwind 4, Cloudinary, Nodemailer, Vitest (novo).

**Spec:** [`docs/superpowers/specs/2026-05-21-v-copp-refactor-design.md`](../specs/2026-05-21-v-copp-refactor-design.md)

---

## File Structure

### Arquivos novos

```
src/
├── app/
│   ├── (admin)/layout.tsx
│   ├── (admin)/admin/page.tsx
│   ├── (admin)/admin/usuarios/page.tsx
│   ├── (admin)/admin/usuarios/[id]/page.tsx
│   ├── (admin)/admin/configuracoes/page.tsx
│   ├── (admin)/admin/turmas/page.tsx
│   ├── (admin)/admin/turmas/[id]/page.tsx
│   ├── aprovar-colegas/page.tsx
│   ├── aguardando-aprovacao/page.tsx
│   ├── api/admin/users/route.ts
│   ├── api/admin/users/[id]/route.ts
│   ├── api/admin/users/[id]/approve/route.ts
│   ├── api/admin/users/[id]/reject/route.ts
│   ├── api/admin/users/bulk-approve/route.ts
│   ├── api/admin/settings/route.ts
│   ├── api/admin/courses/route.ts
│   ├── api/admin/courses/[id]/route.ts
│   ├── api/peer/pending/route.ts
│   └── api/peer/users/[id]/approve/route.ts
│
├── components/
│   ├── admin/users-table.tsx
│   ├── admin/user-edit-form.tsx
│   ├── admin/moderation-actions.tsx
│   ├── admin/settings-form.tsx
│   ├── admin/course-form.tsx
│   ├── admin/pending-badge.tsx
│   ├── admin/admin-header.tsx
│   ├── peer-approval/pending-list.tsx
│   └── ui/table.tsx              (shadcn add)
│   └── ui/alert-dialog.tsx       (shadcn add)
│   └── ui/switch.tsx             (shadcn add)
│
├── lib/
│   ├── app-settings.ts
│   ├── permissions.ts
│   ├── i18n.ts
│   └── default-settings.ts
│
├── hooks/
│   ├── use-app-settings.ts
│   └── use-pending-count.ts
│
├── types/
│   └── index.ts
│
└── models/
    └── app-settings.ts

scripts/
├── reset-db.ts
└── seed.ts

vitest.config.ts
src/lib/__tests__/permissions.test.ts
src/lib/__tests__/validations.test.ts
src/lib/__tests__/app-settings.test.ts
```

### Arquivos modificados

```
src/lib/constants.ts                 — valores PT-BR + PF_CARGOS + USER_STATUS
src/lib/validations.ts               — schemas com cargo/lotacao/whatsapp/role novo
src/lib/auth.ts                      — status check, novos campos na session, tipo compartilhado
src/lib/email.ts                     — templates PT-BR + approval/reject
src/lib/errors.ts                    — mensagens PT-BR
src/models/user.ts                   — novos campos + índices
src/models/index.ts                  — exporta AppSettings
src/middleware.ts                    — proteção /admin/*, /aprovar-colegas
src/app/page.tsx                     — home com branding dinâmica
src/app/layout.tsx                   — metadata dinâmica
src/app/login/page.tsx               — mapping de erros STATUS_*
src/app/register/page.tsx            — novos campos
src/app/forgot-password/page.tsx     — PT-BR
src/app/verify-email/page.tsx        — PT-BR
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/colleagues/page.tsx
src/app/(dashboard)/colleagues/[id]/page.tsx
src/app/(dashboard)/gallery/page.tsx
src/app/(dashboard)/profile/page.tsx
src/app/api/auth/register/route.ts   — cria com status=pending, courseId, cargo, lotacao
src/app/api/auth/complete-profile/route.ts
src/app/api/users/route.ts           — filtros admin
src/app/api/users/[id]/route.ts
src/app/api/courses/route.ts
src/components/auth/register-form.tsx
src/components/auth/login-form.tsx
src/components/auth/forgot-password-form.tsx
src/components/colleagues/colleague-card.tsx
src/components/layout/header.tsx
src/components/layout/footer.tsx
src/components/layout/profile-completion-banner.tsx
src/hooks/use-profile-completion-redirect.ts
package.json                         — vitest, tsx, scripts db:*
.env.local                           — SEED_ADMIN_* vars
README.md                            — instruções V COPP
```

---

## Phases overview

- **Phase 0** — Bootstrap: commit spec, instalar Vitest, instalar `tsx`
- **Phase 1** — Foundation: constants, types compartilhados, validations
- **Phase 2** — Models: AppSettings, User schema atualizado
- **Phase 3** — Helpers: app-settings cache, permissions, i18n
- **Phase 4** — Auth: tipos compartilhados, status check, login error mapping
- **Phase 5** — Middleware: proteção admin/peer
- **Phase 6** — Registro + aprovação: novos campos, status pending, /aguardando-aprovacao
- **Phase 7** — Emails PT-BR: welcome, approved, rejected, reset
- **Phase 8** — Admin: layout, lista usuários, edição, APIs de moderação
- **Phase 9** — Admin: configurações (AppSettings) + turmas (Course)
- **Phase 10** — Peer approval: página + APIs
- **Phase 11** — UI pública: rebrand, PT-BR, branding dinâmica
- **Phase 12** — Scripts: reset-db, seed, package.json, .env
- **Phase 13** — Smoke test end-to-end

---

## Phase 0 — Bootstrap

### Task 0.1: Commit the design spec

**Files:**
- Modify: git index

- [ ] **Step 1: Stage and commit**

```powershell
git add docs/superpowers/specs/2026-05-21-v-copp-refactor-design.md
git commit -m "docs: V COPP refactor design spec"
```

- [ ] **Step 2: Verify**

```powershell
git log -1 --stat
```
Expected: commit shown with the spec file added.

---

### Task 0.2: Install Vitest + tsx

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install deps**

```powershell
npm i -D vitest @vitest/coverage-v8 tsx
```

- [ ] **Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest runs**

```powershell
npm test
```
Expected: "No test files found" (correct — we haven't written any yet).

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest + tsx for unit tests and scripts"
```

---

## Phase 1 — Foundation

### Task 1.1: Update constants with PT-BR roles, PF cargos, statuses

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// src/lib/constants.ts

// User functional roles in the system
export const USER_ROLES = {
  ALUNO: 'aluno',
  INSTRUTOR: 'instrutor',
  COORDENADOR: 'coordenador',
  ADMIN: 'admin',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Police Federal job titles (cargo) — required for everyone except admin
export const PF_CARGOS = {
  APF: 'APF', // Agente de Polícia Federal
  DPF: 'DPF', // Delegado de Polícia Federal
  EPF: 'EPF', // Escrivão de Polícia Federal
  PPF: 'PPF', // Papiloscopista de Polícia Federal
} as const

export type PFCargo = typeof PF_CARGOS[keyof typeof PF_CARGOS]

// User moderation status
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

// Course types (kept for compatibility with Course model)
export const COURSE_TYPES = {
  UNDERGRADUATE: 'undergraduate',
  POSTGRADUATE: 'postgraduate',
  SHORT_COURSE: 'short-course',
} as const

export type CourseType = typeof COURSE_TYPES[keyof typeof COURSE_TYPES]

export const COUNTRIES = [
  'Brazil',
  'Argentina',
  'Australia',
  'Belize',
  'Bolivia',
  'Canada',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'France',
  'French Guiana',
  'Germany',
  'Guatemala',
  'Guyana',
  'Honduras',
  'Italy',
  'Mexico',
  'Nicaragua',
  'Panama',
  'Paraguay',
  'Peru',
  'Portugal',
  'Spain',
  'Suriname',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Venezuela',
  'Other',
] as const
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```
Expected: errors about callers (auth.ts, validations.ts, models) still using old role values — that's fine; we'll fix them next. **Should NOT have errors inside `constants.ts` itself.**

- [ ] **Step 3: Commit**

```powershell
git add src/lib/constants.ts
git commit -m "feat(constants): add PT-BR USER_ROLES, PF_CARGOS, USER_STATUS"
```

---

### Task 1.2: Create shared types file

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create the file**

```ts
// src/types/index.ts
import type { Types } from 'mongoose'
import type { UserRole, PFCargo, UserStatus } from '@/lib/constants'

/**
 * Shape of the user data attached to the session.
 * Used by NextAuth `Session`, `User` (returned from `authorize`), and `JWT` token.
 * Keeping a single source of truth avoids drift between the three.
 */
export interface SessionUser {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  cargo?: PFCargo
  lotacao?: string
  status: UserStatus
  courseId?: string
  courseName?: string
  city?: string
  country?: string
  whatsapp?: string
  linkedin?: string
  instagram?: string
  github?: string
  twitter?: string
  company?: string
  bio?: string
  isEmailVerified: boolean
  profileCompleted: boolean
}

/**
 * Public-facing user data (no secrets), serialized for clients.
 */
export interface PublicUser {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  cargo?: PFCargo
  lotacao?: string
  status: UserStatus
  courseId?: string
  courseName?: string
  whatsapp?: string
  linkedin?: string
  instagram?: string
  github?: string
  twitter?: string
  company?: string
  bio?: string
  isActive: boolean
  createdAt: Date | string
}

/**
 * Pagination envelope used by admin list endpoints.
 */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ObjectIdLike = string | Types.ObjectId
```

- [ ] **Step 2: Verify**

```powershell
npx tsc --noEmit src/types/index.ts
```
Expected: no errors in that file (callers will reference it once we update them).

- [ ] **Step 3: Commit**

```powershell
git add src/types/index.ts
git commit -m "feat(types): add SessionUser and PublicUser shared types"
```

---

### Task 1.3: Write validation tests (TDD — failing tests first)

**Files:**
- Create: `src/lib/__tests__/validations.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run tests — they MUST fail**

```powershell
npm test
```
Expected: imports of `whatsappSchema`, `fullNameSchema` fail because they don't exist yet, and existing schemas don't have the new fields.

- [ ] **Step 3: Commit failing tests**

```powershell
git add src/lib/__tests__/validations.test.ts
git commit -m "test(validations): add failing tests for V COPP register/profile schemas"
```

---

### Task 1.4: Rewrite validations.ts to make the tests pass

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// src/lib/validations.ts
import { z } from 'zod'
import { USER_ROLES, PF_CARGOS } from '@/lib/constants'

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

export const lotacaoSchema = z
  .string()
  .min(1, 'Lotação é obrigatória')
  .max(200, 'Lotação não pode exceder 200 caracteres')

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
    lotacao: lotacaoSchema,
    cargo: cargoSchema,
    bio: z.string().max(500, 'Bio não pode exceder 500 caracteres').optional().or(z.literal('')),
    company: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
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
    lotacao: lotacaoSchema,
    whatsapp: whatsappSchema,
    linkedin: z.string().url('URL inválida').optional().or(z.literal('')),
    instagram: z.string().optional().or(z.literal('')),
    github: z.string().url('URL inválida').optional().or(z.literal('')),
    twitter: z.string().optional().or(z.literal('')),
    company: z.string().optional().or(z.literal('')),
    bio: z.string().max(500, 'Bio não pode exceder 500 caracteres').optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
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
```

- [ ] **Step 2: Run tests — they must pass**

```powershell
npm test
```
Expected: all `validations.test.ts` tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/validations.ts
git commit -m "feat(validations): PT-BR schemas with cargo/lotacao/whatsapp"
```

---

## Phase 2 — Models

### Task 2.1: Create AppSettings model

**Files:**
- Create: `src/models/app-settings.ts`
- Create: `src/lib/default-settings.ts`

- [ ] **Step 1: Create default settings (used as fallback)**

```ts
// src/lib/default-settings.ts
export const DEFAULT_APP_SETTINGS = {
  brandName: 'V COPP',
  brandFullName: '5º Curso de Operadores de Proteção a Pessoa',
  institutionName: 'ANP',
  institutionFullName: 'Academia Nacional de Polícia — Polícia Federal',
  description:
    'Sistema da turma do V COPP — diretório de alunos, perfil e galeria de fotos.',
  peerApprovalEnabled: false,
  developerName: 'Juliano Costa Silva',
  developerLinkedinUrl: 'https://www.linkedin.com/in/julianocsilva/',
} as const
```

- [ ] **Step 2: Create the AppSettings model**

```ts
// src/models/app-settings.ts
import { Schema, model, models, Document, Types } from 'mongoose'

export interface IAppSettings extends Document {
  _id: Types.ObjectId
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  activeCourseId?: Types.ObjectId
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
  createdAt: Date
  updatedAt: Date
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    brandName: { type: String, required: true, trim: true },
    brandFullName: { type: String, required: true, trim: true },
    institutionName: { type: String, required: true, trim: true },
    institutionFullName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    activeCourseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    peerApprovalEnabled: { type: Boolean, default: false },
    developerName: { type: String, required: true, trim: true },
    developerLinkedinUrl: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const AppSettings =
  models.AppSettings || model<IAppSettings>('AppSettings', AppSettingsSchema)
```

- [ ] **Step 3: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors in the two new files (existing callers untouched).

- [ ] **Step 4: Commit**

```powershell
git add src/models/app-settings.ts src/lib/default-settings.ts
git commit -m "feat(models): add AppSettings singleton + default constants"
```

---

### Task 2.2: Update User model with new fields and indices

**Files:**
- Modify: `src/models/user.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// src/models/user.ts
import { Schema, model, models, Document, Types } from 'mongoose'
import {
  USER_ROLES,
  PF_CARGOS,
  USER_STATUS,
  type UserRole,
  type PFCargo,
  type UserStatus,
} from '@/lib/constants'

export interface IUser extends Document {
  _id: Types.ObjectId
  email: string
  password?: string
  emailVerified: boolean
  verificationToken?: string
  verificationTokenExpires?: Date
  resetPasswordToken?: string
  resetPasswordTokenExpires?: Date
  name: string
  avatar?: string

  // V COPP fields
  role: UserRole
  cargo?: PFCargo
  lotacao: string
  whatsapp: string
  courseId?: Types.ObjectId
  courseName: string

  // legacy fields kept
  city?: string
  country?: string

  // moderation
  status: UserStatus
  rejectedReason?: string
  approvedBy?: Types.ObjectId
  approvedAt?: Date

  // optional profile
  linkedin?: string
  instagram?: string
  github?: string
  twitter?: string
  bio?: string
  company?: string

  googleId?: string
  isActive: boolean
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },

    name: { type: String, required: true, trim: true },
    avatar: { type: String },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.ALUNO,
    },
    cargo: {
      type: String,
      enum: Object.values(PF_CARGOS),
    },
    lotacao: { type: String, required: true, trim: true, maxlength: 200 },
    whatsapp: { type: String, required: true, trim: true },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, required: true },

    city: { type: String },
    country: { type: String },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    rejectedReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    linkedin: { type: String },
    instagram: { type: String },
    github: { type: String },
    twitter: { type: String },
    bio: { type: String, maxlength: 500 },
    company: { type: String, trim: true },

    googleId: { type: String, unique: true, sparse: true },

    isActive: { type: Boolean, default: true },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Indices
UserSchema.index({ courseId: 1, role: 1 })
UserSchema.index({ status: 1 })
UserSchema.index({ name: 'text', lotacao: 'text' })

// Application-level invariant: cargo required if role !== 'admin'
UserSchema.pre('validate', function (next) {
  if (this.role !== USER_ROLES.ADMIN && !this.cargo) {
    this.invalidate('cargo', 'Cargo é obrigatório para esta função')
  }
  next()
})

export const User = models.User || model<IUser>('User', UserSchema)
```

> **Note:** If the previous deployment created the old text index on `name` only, MongoDB will refuse to add a new text index. The reset script in Phase 12 drops the collection, which clears all indices.

- [ ] **Step 2: Update models/index.ts to export AppSettings too**

```ts
// src/models/index.ts
export { User } from './user'
export { Course } from './course'
export { Photo } from './photo'
export { AppSettings } from './app-settings'
```

- [ ] **Step 3: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: errors remain in `auth.ts`, register route, etc. (we'll fix them in Phases 4 + 6). The model file itself must be error-free.

- [ ] **Step 4: Commit**

```powershell
git add src/models/user.ts src/models/index.ts
git commit -m "feat(models): User schema with cargo, lotacao, status, courseId"
```

---

## Phase 3 — Helpers (config + permissions + i18n)

### Task 3.1: Write app-settings tests (TDD)

**Files:**
- Create: `src/lib/__tests__/app-settings.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/app-settings.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue({}),
}))

const findOneMock = vi.fn()
vi.mock('@/models/app-settings', () => ({
  AppSettings: { findOne: () => ({ lean: findOneMock }) },
}))

import {
  getAppSettings,
  invalidateAppSettingsCache,
} from '@/lib/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

describe('getAppSettings', () => {
  beforeEach(() => {
    findOneMock.mockReset()
    invalidateAppSettingsCache()
  })

  it('returns DB doc when it exists', async () => {
    findOneMock.mockResolvedValue({ brandName: 'V COPP', peerApprovalEnabled: true })
    const result = await getAppSettings()
    expect(result.brandName).toBe('V COPP')
    expect(result.peerApprovalEnabled).toBe(true)
  })

  it('returns defaults when DB is empty', async () => {
    findOneMock.mockResolvedValue(null)
    const result = await getAppSettings()
    expect(result.brandName).toBe(DEFAULT_APP_SETTINGS.brandName)
  })

  it('caches the value (no second DB call within TTL)', async () => {
    findOneMock.mockResolvedValue({ brandName: 'Cached' })
    await getAppSettings()
    await getAppSettings()
    expect(findOneMock).toHaveBeenCalledTimes(1)
  })

  it('invalidateAppSettingsCache forces a re-fetch', async () => {
    findOneMock.mockResolvedValue({ brandName: 'A' })
    await getAppSettings()
    invalidateAppSettingsCache()
    findOneMock.mockResolvedValue({ brandName: 'B' })
    const result = await getAppSettings()
    expect(result.brandName).toBe('B')
    expect(findOneMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests — they must fail**

```powershell
npm test -- app-settings
```
Expected: fail (`lib/app-settings.ts` doesn't exist).

- [ ] **Step 3: Commit failing tests**

```powershell
git add src/lib/__tests__/app-settings.test.ts
git commit -m "test(app-settings): failing tests for cache + fallback"
```

---

### Task 3.2: Implement app-settings helper

**Files:**
- Create: `src/lib/app-settings.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/app-settings.ts
import { connectDB } from '@/lib/db'
import { AppSettings, type IAppSettings } from '@/models/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

type Resolved = Omit<IAppSettings, keyof Document> & {
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
  activeCourseId?: string
}

const TTL_MS = 60_000
let cached: { value: Resolved; expiresAt: number } | null = null

function buildFallback(): Resolved {
  return { ...DEFAULT_APP_SETTINGS } as Resolved
}

export async function getAppSettings(): Promise<Resolved> {
  if (cached && cached.expiresAt > Date.now()) return cached.value
  await connectDB()
  const doc = (await AppSettings.findOne().lean()) as Resolved | null
  const value = doc ?? buildFallback()
  cached = { value, expiresAt: Date.now() + TTL_MS }
  return value
}

export function invalidateAppSettingsCache(): void {
  cached = null
}
```

> **Type note:** the `Resolved` is loose because `.lean()` strips Mongoose Document methods. We index it by plain field access only.

- [ ] **Step 2: Run tests — must pass**

```powershell
npm test -- app-settings
```
Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/app-settings.ts
git commit -m "feat(app-settings): singleton helper with 60s TTL cache"
```

---

### Task 3.3: Write permissions tests (TDD)

**Files:**
- Create: `src/lib/__tests__/permissions.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/permissions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const getAppSettingsMock = vi.fn()
vi.mock('@/lib/app-settings', () => ({
  getAppSettings: () => getAppSettingsMock(),
}))

import {
  canApprove,
  canReject,
  canEditUser,
  canEditSettings,
  canManageCourses,
  canAssignAdminRole,
} from '@/lib/permissions'

function makeUser(overrides: Partial<{ role: string; status: string }>) {
  return { role: 'aluno', status: 'approved', ...overrides } as never
}

describe('canApprove', () => {
  beforeEach(() => getAppSettingsMock.mockReset())

  it('admin can approve', async () => {
    expect(await canApprove(makeUser({ role: 'admin' }))).toBe(true)
  })
  it('coordenador can approve', async () => {
    expect(await canApprove(makeUser({ role: 'coordenador' }))).toBe(true)
  })
  it('instrutor can approve', async () => {
    expect(await canApprove(makeUser({ role: 'instrutor' }))).toBe(true)
  })
  it('aluno can approve only when flag is on', async () => {
    getAppSettingsMock.mockResolvedValue({ peerApprovalEnabled: true })
    expect(await canApprove(makeUser({ role: 'aluno' }))).toBe(true)
  })
  it('aluno cannot approve when flag is off', async () => {
    getAppSettingsMock.mockResolvedValue({ peerApprovalEnabled: false })
    expect(await canApprove(makeUser({ role: 'aluno' }))).toBe(false)
  })
  it('aluno cannot approve when their own status is pending (even with flag on)', async () => {
    getAppSettingsMock.mockResolvedValue({ peerApprovalEnabled: true })
    expect(await canApprove(makeUser({ role: 'aluno', status: 'pending' }))).toBe(false)
  })
})

describe('canReject', () => {
  it.each(['admin', 'coordenador', 'instrutor'])('%s can reject', (role) => {
    expect(canReject(makeUser({ role }))).toBe(true)
  })
  it('aluno cannot reject', () => {
    expect(canReject(makeUser({ role: 'aluno' }))).toBe(false)
  })
})

describe('canEditUser', () => {
  it('admin can edit users', () => {
    expect(canEditUser(makeUser({ role: 'admin' }))).toBe(true)
  })
  it('coordenador can edit users', () => {
    expect(canEditUser(makeUser({ role: 'coordenador' }))).toBe(true)
  })
  it('instrutor cannot edit users', () => {
    expect(canEditUser(makeUser({ role: 'instrutor' }))).toBe(false)
  })
  it('aluno cannot edit users', () => {
    expect(canEditUser(makeUser({ role: 'aluno' }))).toBe(false)
  })
})

describe('canEditSettings', () => {
  it('only admin can edit settings', () => {
    expect(canEditSettings(makeUser({ role: 'admin' }))).toBe(true)
    expect(canEditSettings(makeUser({ role: 'coordenador' }))).toBe(false)
    expect(canEditSettings(makeUser({ role: 'instrutor' }))).toBe(false)
    expect(canEditSettings(makeUser({ role: 'aluno' }))).toBe(false)
  })
})

describe('canManageCourses', () => {
  it('admin and coordenador can manage courses', () => {
    expect(canManageCourses(makeUser({ role: 'admin' }))).toBe(true)
    expect(canManageCourses(makeUser({ role: 'coordenador' }))).toBe(true)
    expect(canManageCourses(makeUser({ role: 'instrutor' }))).toBe(false)
    expect(canManageCourses(makeUser({ role: 'aluno' }))).toBe(false)
  })
})

describe('canAssignAdminRole', () => {
  it('only admin can assign admin role', () => {
    expect(canAssignAdminRole(makeUser({ role: 'admin' }))).toBe(true)
    expect(canAssignAdminRole(makeUser({ role: 'coordenador' }))).toBe(false)
    expect(canAssignAdminRole(makeUser({ role: 'instrutor' }))).toBe(false)
    expect(canAssignAdminRole(makeUser({ role: 'aluno' }))).toBe(false)
  })
})
```

- [ ] **Step 2: Run — must fail**

```powershell
npm test -- permissions
```
Expected: imports fail (no `lib/permissions.ts` yet).

- [ ] **Step 3: Commit failing tests**

```powershell
git add src/lib/__tests__/permissions.test.ts
git commit -m "test(permissions): failing tests for moderation guards"
```

---

### Task 3.4: Implement permissions module

**Files:**
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/permissions.ts
import { USER_ROLES, USER_STATUS } from '@/lib/constants'
import { getAppSettings } from '@/lib/app-settings'

interface Actor {
  role: string
  status: string
}

const MODERATORS = [
  USER_ROLES.ADMIN,
  USER_ROLES.COORDENADOR,
  USER_ROLES.INSTRUTOR,
] as readonly string[]

const ADMINS = [USER_ROLES.ADMIN, USER_ROLES.COORDENADOR] as readonly string[]

export async function canApprove(actor: Actor): Promise<boolean> {
  if (MODERATORS.includes(actor.role)) return true
  if (actor.role === USER_ROLES.ALUNO && actor.status === USER_STATUS.APPROVED) {
    const settings = await getAppSettings()
    return Boolean(settings.peerApprovalEnabled)
  }
  return false
}

export function canReject(actor: Actor): boolean {
  return MODERATORS.includes(actor.role)
}

export function canEditUser(actor: Actor): boolean {
  return ADMINS.includes(actor.role)
}

export function canEditSettings(actor: Actor): boolean {
  return actor.role === USER_ROLES.ADMIN
}

export function canManageCourses(actor: Actor): boolean {
  return ADMINS.includes(actor.role)
}

export function canAssignAdminRole(actor: Actor): boolean {
  return actor.role === USER_ROLES.ADMIN
}
```

- [ ] **Step 2: Run — must pass**

```powershell
npm test -- permissions
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/permissions.ts
git commit -m "feat(permissions): guards for moderation, settings, admin promotion"
```

---

### Task 3.5: Create i18n labels module

**Files:**
- Create: `src/lib/i18n.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/i18n.ts
import { USER_ROLES, PF_CARGOS, USER_STATUS } from '@/lib/constants'
import type { UserRole, PFCargo, UserStatus } from '@/lib/constants'

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ALUNO]: 'Aluno',
  [USER_ROLES.INSTRUTOR]: 'Instrutor',
  [USER_ROLES.COORDENADOR]: 'Coordenador',
  [USER_ROLES.ADMIN]: 'Administrador',
}

export const CARGO_LABELS: Record<PFCargo, string> = {
  [PF_CARGOS.APF]: 'Agente de Polícia Federal (APF)',
  [PF_CARGOS.DPF]: 'Delegado de Polícia Federal (DPF)',
  [PF_CARGOS.EPF]: 'Escrivão de Polícia Federal (EPF)',
  [PF_CARGOS.PPF]: 'Papiloscopista de Polícia Federal (PPF)',
}

export const CARGO_SHORT_LABELS: Record<PFCargo, string> = {
  [PF_CARGOS.APF]: 'APF',
  [PF_CARGOS.DPF]: 'DPF',
  [PF_CARGOS.EPF]: 'EPF',
  [PF_CARGOS.PPF]: 'PPF',
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.PENDING]: 'Aguardando aprovação',
  [USER_STATUS.APPROVED]: 'Aprovado',
  [USER_STATUS.REJECTED]: 'Rejeitado',
}

export const MESSAGES = {
  auth: {
    invalidCredentials: 'Email ou senha inválidos.',
    pendingApproval:
      'Sua conta está aguardando aprovação da coordenação. Você receberá um email assim que for liberada.',
    rejected:
      'Seu cadastro foi rejeitado. Entre em contato com a coordenação do curso.',
    inactive: 'Conta desativada. Entre em contato com a coordenação.',
    sessionExpired: 'Sessão expirada. Faça login novamente.',
    unauthorized: 'Você não tem permissão para acessar esta página.',
  },
  registration: {
    success:
      'Cadastro realizado! Sua conta está em análise pela coordenação. Você receberá um email assim que for liberada.',
    emailExists: 'Este email já está cadastrado.',
  },
  moderation: {
    approved: 'Aluno aprovado com sucesso.',
    rejected: 'Aluno rejeitado.',
    reactivated: 'Aluno reativado para nova análise.',
    bulkApproved: (n: number) => `${n} aluno(s) aprovado(s).`,
  },
  validation: {
    required: 'Campo obrigatório.',
    invalidEmail: 'Email inválido.',
  },
  forms: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    approve: 'Aprovar',
    reject: 'Rejeitar',
    edit: 'Editar',
    back: 'Voltar',
  },
} as const
```

- [ ] **Step 2: Verify TypeScript**

```powershell
npx tsc --noEmit src/lib/i18n.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/i18n.ts
git commit -m "feat(i18n): PT-BR labels for roles, cargos, status, messages"
```

---

## Phase 4 — Auth

### Task 4.1: Update auth.ts with shared SessionUser type and new fields

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import type { SessionUser } from '@/types'
import { USER_STATUS } from '@/lib/constants'

declare module 'next-auth' {
  interface Session {
    user: SessionUser
  }
  interface User extends SessionUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends Omit<SessionUser, 'id'> {
    id: string
  }
}

const SESSION_KEYS: ReadonlyArray<keyof SessionUser> = [
  'id', 'email', 'name', 'avatar', 'role', 'cargo', 'lotacao', 'status',
  'courseId', 'courseName', 'city', 'country', 'whatsapp',
  'linkedin', 'instagram', 'github', 'twitter', 'company', 'bio',
  'isEmailVerified', 'profileCompleted',
]

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()
        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        }).select('+password')

        if (!user || !user.password) return null

        const ok = await bcrypt.compare(credentials.password as string, user.password)
        if (!ok) return null

        if (!user.isActive) throw new Error('STATUS_INACTIVE')
        if (user.status !== USER_STATUS.APPROVED) {
          throw new Error(`STATUS_${String(user.status).toUpperCase()}`)
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          cargo: user.cargo,
          lotacao: user.lotacao,
          status: user.status,
          courseId: user.courseId?.toString(),
          courseName: user.courseName,
          city: user.city,
          country: user.country,
          whatsapp: user.whatsapp,
          linkedin: user.linkedin,
          instagram: user.instagram,
          github: user.github,
          twitter: user.twitter,
          company: user.company,
          bio: user.bio,
          isEmailVerified: user.emailVerified,
          profileCompleted: user.profileCompleted,
        } satisfies SessionUser
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        for (const key of SESSION_KEYS) {
          // @ts-expect-error — index assignment from SessionUser
          token[key] = user[key]
        }
      }
      if (trigger === 'update' && session) {
        return { ...token, ...session }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        for (const key of SESSION_KEYS) {
          // @ts-expect-error — index assignment to session.user
          session.user[key] = token[key]
        }
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
})
```

> **Removed:** the Google provider block was already commented out — kept it removed entirely. If Google login comes back later, restore from git history of `b130606`.

- [ ] **Step 2: Verify**

```powershell
npx tsc --noEmit
```
Expected: `auth.ts` itself OK. Errors may remain in pages/components that still reference removed fields (city/country) — those get fixed in Phase 6 and Phase 11.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/auth.ts
git commit -m "feat(auth): use shared SessionUser, status check, PT-BR labels"
```

---

### Task 4.2: Update errors.ts with PT-BR messages

**Files:**
- Modify: `src/lib/errors.ts`

The file structure stays the same. Only the `errorMessages` map values change. All export names (`ErrorCode`, `AppError`, `createError`, `parseError`, `logError`, `formatErrorResponse`) and signatures are preserved.

- [ ] **Step 1: Replace just the `errorMessages` map**

Find the `errorMessages` constant and replace its values one-by-one:

```ts
const errorMessages: Record<ErrorCodeType, string> = {
  // Authentication
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Email ou senha inválidos. Verifique suas credenciais e tente novamente.',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'Verifique seu email antes de fazer login. Confira sua caixa de entrada.',
  [ErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 'Sua conta foi desativada. Entre em contato com a coordenação.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Sua sessão expirou. Faça login novamente.',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Você precisa estar autenticado para acessar este recurso.',
  [ErrorCode.AUTH_GOOGLE_SIGNIN_REQUIRED]: 'Esta conta foi criada com Google. Faça login pelo Google.',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Verifique os dados informados e tente novamente.',
  [ErrorCode.VALIDATION_EMAIL_EXISTS]: 'Já existe uma conta com este email. Tente fazer login.',
  [ErrorCode.VALIDATION_INVALID_TOKEN]: 'O link é inválido ou já foi utilizado.',
  [ErrorCode.VALIDATION_TOKEN_EXPIRED]: 'O link expirou. Solicite um novo.',
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Preencha todos os campos obrigatórios.',

  // Database
  [ErrorCode.DB_CONNECTION_FAILED]: 'Não foi possível conectar ao banco de dados. Tente novamente em instantes.',
  [ErrorCode.DB_QUERY_FAILED]: 'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
  [ErrorCode.DB_RECORD_NOT_FOUND]: 'Recurso não encontrado.',
  [ErrorCode.DB_DUPLICATE_ENTRY]: 'Este registro já existe.',

  // External services
  [ErrorCode.SERVICE_EMAIL_FAILED]: 'Falha ao enviar email. Tente novamente ou contate a coordenação.',
  [ErrorCode.SERVICE_CLOUDINARY_FAILED]: 'Falha ao processar a imagem. Tente outro arquivo.',
  [ErrorCode.SERVICE_GOOGLE_AUTH_FAILED]: 'Autenticação com Google falhou. Tente novamente.',

  // Upload
  [ErrorCode.UPLOAD_NO_FILE]: 'Selecione um arquivo para enviar.',
  [ErrorCode.UPLOAD_INVALID_TYPE]: 'Tipo de arquivo inválido. Envie uma imagem (JPEG, PNG, GIF ou WebP).',
  [ErrorCode.UPLOAD_SIZE_EXCEEDED]: 'Arquivo muito grande. Tamanho máximo: 5MB.',
  [ErrorCode.UPLOAD_FAILED]: 'Falha no envio do arquivo. Tente novamente.',

  // General
  [ErrorCode.INTERNAL_ERROR]: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
  [ErrorCode.RATE_LIMITED]: 'Muitas requisições. Aguarde um momento antes de tentar novamente.',
  [ErrorCode.NOT_FOUND]: 'A página ou recurso não foi encontrado.',
  [ErrorCode.FORBIDDEN]: 'Você não tem permissão para realizar esta ação.',
}
```

Leave everything else in `errors.ts` untouched (ErrorCode keys, AppError class, factories, parser, logger).

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```
Expected: errors.ts file itself clean.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/errors.ts
git commit -m "i18n(errors): PT-BR messages"
```

---

## Phase 5 — Middleware

### Task 5.1: Extend middleware to protect /admin and /aprovar-colegas

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace contents**

```ts
// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'

const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/aguardando-aprovacao',
  '/api/courses',
]

const MODERATOR_ROLES: ReadonlyArray<string> = [
  USER_ROLES.ADMIN,
  USER_ROLES.COORDENADOR,
  USER_ROLES.INSTRUTOR,
]

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicRoutes.some((r) => pathname === r) || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Guard /admin/* and /api/admin/*: moderator only
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!MODERATOR_ROLES.includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Guard /aprovar-colegas and /api/peer: must be approved (final check in route)
  if (pathname.startsWith('/aprovar-colegas') || pathname.startsWith('/api/peer')) {
    if (session.user.status !== USER_STATUS.APPROVED) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
  runtime: 'nodejs',
}
```

> **Note:** middleware is a coarse filter (role + status from JWT). The peer-approval flag check happens server-side in the layout/route via `canApprove()` because middleware shouldn't read DB in hot path.

- [ ] **Step 2: Verify TS**

```powershell
npx tsc --noEmit src/middleware.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/middleware.ts
git commit -m "feat(middleware): protect /admin, /api/admin, /aprovar-colegas, /api/peer"
```

---

## Phase 6 — Registration + approval flow

### Task 6.1: Update /api/auth/register to create user with new fields and status=pending

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Course } from '@/models/course'
import { AppSettings } from '@/models/app-settings'
import { sendWelcomePendingEmail } from '@/lib/email'
import { registerSchema } from '@/lib/validations'
import { createError, formatErrorResponse, ErrorCode } from '@/lib/errors'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
      return NextResponse.json(
        { error: fieldErrors[0].message, code: ErrorCode.VALIDATION_FAILED, fields: fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, whatsapp, lotacao, cargo, bio, company, city, country } =
      validationResult.data

    await connectDB()

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      const error = createError.emailExists()
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }

    // Resolve active course from settings (fallback: most recent active Course)
    const settings = await AppSettings.findOne().lean()
    let activeCourse = settings?.activeCourseId
      ? await Course.findById(settings.activeCourseId).lean()
      : null
    if (!activeCourse) {
      activeCourse = await Course.findOne({ isActive: true }).sort({ createdAt: -1 }).lean()
    }
    const courseName = activeCourse?.name || DEFAULT_APP_SETTINGS.brandName

    const hashedPassword = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      whatsapp,
      lotacao,
      cargo,
      role: USER_ROLES.ALUNO,                // backend forces aluno
      status: USER_STATUS.PENDING,           // requires moderator approval
      courseId: activeCourse?._id,
      courseName,
      city: city || undefined,
      country: country || undefined,
      bio: bio || undefined,
      company: company || undefined,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerified: true,                   // email verification is disabled in this app
      isActive: true,
      profileCompleted: true,                // 4 required fields are collected at register
    })

    try {
      await sendWelcomePendingEmail(user.email, user.name)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
    }

    return NextResponse.json(
      {
        message:
          'Cadastro realizado! Sua conta está em análise pela coordenação.',
        userId: user._id,
      },
      { status: 201 }
    )
  } catch (err) {
    const { body, status } = formatErrorResponse(err, 'POST /api/auth/register')
    return NextResponse.json(body, { status })
  }
}
```

> **Note:** `sendWelcomePendingEmail` is added in Phase 7 — TS will complain until then. Add the import even though it doesn't exist yet so the diff stays minimal once Phase 7 lands.

- [ ] **Step 2: Create the /aguardando-aprovacao page**

```tsx
// src/app/aguardando-aprovacao/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'

export default async function AguardandoAprovacaoPage() {
  const settings = await getAppSettings()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Cadastro recebido</h1>
        <p className="text-slate-300 mb-2">
          Sua conta no <strong>{settings.brandName}</strong> está aguardando
          aprovação da coordenação do curso.
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Você receberá um email assim que sua conta for liberada.
        </p>
        <Link href="/login">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Voltar ao login
          </Button>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```powershell
npx tsc --noEmit
```
Expected: one error about `sendWelcomePendingEmail` not existing — keep going; Phase 7 fixes it. Other errors should be in files not yet refactored.

- [ ] **Step 4: Commit**

```powershell
git add src/app/api/auth/register/route.ts src/app/aguardando-aprovacao/page.tsx
git commit -m "feat(auth): register creates pending user + /aguardando-aprovacao page"
```

---

### Task 6.2: Update the register form (component) with new required fields

**Files:**
- Modify: `src/components/auth/register-form.tsx`

- [ ] **Step 1: Read current implementation**

Open [src/components/auth/register-form.tsx](src/components/auth/register-form.tsx) and identify the shape. The current form binds to old `registerSchema` fields (name, email, password, courseName, city, country, company, bio, twitter).

- [ ] **Step 2: Update form schema, default values, and fields**

Replace the field set with:
- `name` (input)
- `email` (input)
- `password`, `confirmPassword` (inputs)
- `whatsapp` (input with placeholder `(11) 99999-9999`)
- `lotacao` (input — texto livre)
- `cargo` (select with `CARGO_LABELS`)
- `bio` (textarea, opcional)
- `company` (input, opcional)

Use `react-hook-form` + `zodResolver(registerSchema)` (same as before). All labels and validation messages should come from `MESSAGES.forms`, etc., or be inline PT-BR.

```tsx
// Excerpt: cargo select
import { CARGO_LABELS } from '@/lib/i18n'
import { PF_CARGOS } from '@/lib/constants'

<Select onValueChange={(v) => form.setValue('cargo', v as keyof typeof CARGO_LABELS)}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione seu cargo" />
  </SelectTrigger>
  <SelectContent>
    {Object.values(PF_CARGOS).map((c) => (
      <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

After successful POST to `/api/auth/register`, redirect to `/aguardando-aprovacao` instead of `/login`.

- [ ] **Step 3: Verify in browser**

```powershell
npm run dev
```
- Open http://localhost:3000/register
- Fill the form, submit
- Expect: redirect to /aguardando-aprovacao + the email arrives (or error logged in terminal)
- Check the DB: new user has `status: 'pending'`, `role: 'aluno'`, `cargo`, `lotacao`, `whatsapp`

- [ ] **Step 4: Commit**

```powershell
git add src/components/auth/register-form.tsx
git commit -m "feat(register): collect WhatsApp, lotacao, cargo (PT-BR)"
```

---

### Task 6.3: Update /login to map STATUS_* errors

**Files:**
- Modify: `src/components/auth/login-form.tsx`

- [ ] **Step 1: Map errors thrown by NextAuth**

In the login form's `onSubmit`, after calling `signIn('credentials', { ... redirect: false })`, inspect the returned `error` field:

```ts
const result = await signIn('credentials', { email, password, redirect: false })
if (result?.error) {
  switch (result.error) {
    case 'STATUS_PENDING':
      router.push('/aguardando-aprovacao')
      return
    case 'STATUS_REJECTED':
      toast.error(MESSAGES.auth.rejected)
      return
    case 'STATUS_INACTIVE':
      toast.error(MESSAGES.auth.inactive)
      return
    default:
      toast.error(MESSAGES.auth.invalidCredentials)
      return
  }
}
router.push(callbackUrl || '/dashboard')
```

Import `MESSAGES` from `@/lib/i18n`.

- [ ] **Step 2: Replace English copy with PT-BR**

Replace all UI strings ("Sign in", "Email", "Password", "Don't have an account?") with PT-BR equivalents ("Entrar", "Email", "Senha", "Não tem uma conta?").

- [ ] **Step 3: Manual verification**

```powershell
npm run dev
```
Create a pending user → try to log in → confirm redirect to `/aguardando-aprovacao`.

- [ ] **Step 4: Commit**

```powershell
git add src/components/auth/login-form.tsx
git commit -m "feat(login): map STATUS_* errors + PT-BR copy"
```

---

## Phase 7 — Emails PT-BR

### Task 7.1: Add a shared HTML wrapper helper

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Insert a helper above the existing exports**

Add at the top (after imports, before `sendEmail`):

```ts
import { getAppSettings } from '@/lib/app-settings'

function brandedShell(opts: { brandName: string; title: string; bodyHtml: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin:0; padding:0; background:#f4f4f5;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <div style="background:white; border-radius:12px; padding:40px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <div style="text-align:center; margin-bottom:30px;">
        <h1 style="color:#18181b; margin:0; font-size:24px;">${opts.brandName}</h1>
        <p style="color:#71717a; margin-top:8px;">Sistema da turma</p>
      </div>
      <h2 style="color:#18181b; font-size:20px; margin-bottom:16px;">${opts.title}</h2>
      ${opts.bodyHtml}
    </div>
    <p style="text-align:center; color:#a1a1aa; font-size:12px; margin-top:24px;">
      © ${new Date().getFullYear()} ${opts.brandName}. Todos os direitos reservados.
    </p>
  </div>
</body></html>`
}
```

- [ ] **Step 2: Verify TS**

```powershell
npx tsc --noEmit src/lib/email.ts
```

- [ ] **Step 3: Commit**

```powershell
git add src/lib/email.ts
git commit -m "chore(email): branded shell helper"
```

---

### Task 7.2: Add welcome / approved / rejected templates

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add three new exports + rewrite existing two in PT-BR**

Add the following exports (and rewrite the existing `sendVerificationEmail`, `sendPasswordResetEmail`, `sendEmailChangeVerification` to use `brandedShell` and PT-BR copy):

```ts
export async function sendWelcomePendingEmail(email: string, name: string): Promise<void> {
  const settings = await getAppSettings()
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Cadastro recebido',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Seu cadastro no <strong>${settings.brandName}</strong> foi recebido com sucesso e está em análise pela coordenação do curso.
      </p>
      <p style="color:#3f3f46; line-height:1.6;">
        Assim que sua conta for aprovada, você receberá outro email confirmando a liberação.
      </p>`,
  })
  await sendEmail({ to: email, subject: `Cadastro recebido — ${settings.brandName}`, html })
}

export async function sendAccountApprovedEmail(email: string, name: string): Promise<void> {
  const settings = await getAppSettings()
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Conta aprovada',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Sua conta foi aprovada! Você já pode acessar o sistema do <strong>${settings.brandName}</strong>.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${loginUrl}" style="background:#2563eb; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
          Acessar o sistema
        </a>
      </div>`,
  })
  await sendEmail({ to: email, subject: `Conta aprovada — ${settings.brandName}`, html })
}

export async function sendAccountRejectedEmail(
  email: string,
  name: string,
  reason?: string
): Promise<void> {
  const settings = await getAppSettings()
  const reasonBlock = reason
    ? `<p style="color:#3f3f46; line-height:1.6;"><strong>Motivo:</strong> ${reason}</p>`
    : ''
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Cadastro não aprovado',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Infelizmente seu cadastro no <strong>${settings.brandName}</strong> não foi aprovado pela coordenação do curso.
      </p>
      ${reasonBlock}
      <p style="color:#3f3f46; line-height:1.6;">
        Em caso de dúvidas, entre em contato com a coordenação.
      </p>`,
  })
  await sendEmail({ to: email, subject: `Cadastro não aprovado — ${settings.brandName}`, html })
}
```

Then rewrite `sendVerificationEmail` and `sendPasswordResetEmail` to use `brandedShell` and PT-BR copy. Use the same export names.

- [ ] **Step 2: Verify TS**

```powershell
npx tsc --noEmit
```
Expected: `register/route.ts` now compiles (the missing import resolves). Other phases still have unrelated errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/email.ts
git commit -m "feat(email): PT-BR templates + welcome/approved/rejected"
```

---

## Phase 8 — Admin panel: users + moderation

### Task 8.1: Add shadcn components (table, alert-dialog, switch)

**Files:**
- Create: `src/components/ui/table.tsx`, `alert-dialog.tsx`, `switch.tsx`

- [ ] **Step 1: Add via shadcn CLI**

```powershell
npx shadcn@latest add table alert-dialog switch
```

- [ ] **Step 2: Verify the three files were created**

```powershell
Test-Path src/components/ui/table.tsx
Test-Path src/components/ui/alert-dialog.tsx
Test-Path src/components/ui/switch.tsx
```
Expected: all `True`.

- [ ] **Step 3: Commit**

```powershell
git add src/components/ui/table.tsx src/components/ui/alert-dialog.tsx src/components/ui/switch.tsx package.json package-lock.json
git commit -m "chore(ui): add shadcn table, alert-dialog, switch"
```

---

### Task 8.2: Create the admin layout with permission guard

**Files:**
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/admin/page.tsx`
- Create: `src/components/admin/admin-header.tsx`

- [ ] **Step 1: Create the layout**

```tsx
// src/app/(admin)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/constants'
import { AdminHeader } from '@/components/admin/admin-header'

const MODERATORS = [USER_ROLES.ADMIN, USER_ROLES.COORDENADOR, USER_ROLES.INSTRUTOR] as readonly string[]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || !MODERATORS.includes(session.user.role)) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={session.user} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create the admin landing page that redirects to /admin/usuarios**

```tsx
// src/app/(admin)/admin/page.tsx
import { redirect } from 'next/navigation'
export default function AdminIndexPage() {
  redirect('/admin/usuarios')
}
```

- [ ] **Step 3: Create the admin header**

```tsx
// src/components/admin/admin-header.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Settings, GraduationCap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { USER_ROLES } from '@/lib/constants'
import { PendingBadge } from './pending-badge'

const tabs = [
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/turmas', label: 'Turmas', icon: GraduationCap },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
]

export function AdminHeader({ user }: { user: { role: string } }) {
  const pathname = usePathname()
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="font-semibold text-lg">Painel de Administração</div>
          <nav className="flex items-center gap-1">
            {tabs
              .filter((t) => !t.adminOnly || user.role === USER_ROLES.ADMIN)
              .map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(t.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {t.href === '/admin/usuarios' && <PendingBadge />}
                </Link>
              ))}
          </nav>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair do admin
          </Button>
        </Link>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create the pending badge component (placeholder until hook in Step 5)**

```tsx
// src/components/admin/pending-badge.tsx
'use client'

import { usePendingCount } from '@/hooks/use-pending-count'

export function PendingBadge() {
  const { count } = usePendingCount()
  if (!count) return null
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
      {count}
    </span>
  )
}
```

- [ ] **Step 5: Create the hook**

```ts
// src/hooks/use-pending-count.ts
'use client'

import { useEffect, useState } from 'react'

export function usePendingCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/admin/users?status=pending&pageSize=1')
        if (!res.ok) return
        const data = (await res.json()) as { total: number }
        if (active) setCount(data.total)
      } catch {
        // silent
      }
    }
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return { count }
}
```

- [ ] **Step 6: Verify TS compiles**

```powershell
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```powershell
git add src/app/(admin) src/components/admin/admin-header.tsx src/components/admin/pending-badge.tsx src/hooks/use-pending-count.ts
git commit -m "feat(admin): layout, header, pending badge"
```

---

### Task 8.3: Create /api/admin/users list endpoint

**Files:**
- Create: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canEditUser } from '@/lib/permissions'
import { USER_ROLES } from '@/lib/constants'

const MODERATORS = [USER_ROLES.ADMIN, USER_ROLES.COORDENADOR, USER_ROLES.INSTRUTOR] as readonly string[]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !MODERATORS.includes(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const role = searchParams.get('role') || undefined
  const cargo = searchParams.get('cargo') || undefined
  const courseId = searchParams.get('courseId') || undefined
  const q = searchParams.get('q') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  await connectDB()

  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (role) filter.role = role
  if (cargo) filter.cargo = cargo
  if (courseId) filter.courseId = courseId
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { lotacao: { $regex: q, $options: 'i' } },
    ]
  }

  const [total, items] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ])

  return NextResponse.json({
    items: items.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      cargo: u.cargo,
      lotacao: u.lotacao,
      whatsapp: u.whatsapp,
      status: u.status,
      isActive: u.isActive,
      courseId: u.courseId?.toString(),
      courseName: u.courseName,
      createdAt: u.createdAt,
    })),
    total,
    page,
    pageSize,
  })
}
```

- [ ] **Step 2: Smoke test with curl/Invoke-WebRequest**

(After Task 8.4 builds the page you can also test from the browser.)
```powershell
# Make sure the dev server is running
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/users?status=pending" -UseBasicParsing
```
Expected: redirect to /login if not authenticated; otherwise JSON.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/admin/users/route.ts
git commit -m "feat(api/admin): GET /api/admin/users with filters + pagination"
```

---

### Task 8.4: Create /admin/usuarios list page

**Files:**
- Create: `src/app/(admin)/admin/usuarios/page.tsx`
- Create: `src/components/admin/users-table.tsx`
- Create: `src/components/admin/moderation-actions.tsx`

- [ ] **Step 1: Server component shell**

```tsx
// src/app/(admin)/admin/usuarios/page.tsx
import { UsersTable } from '@/components/admin/users-table'

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string; role?: string; cargo?: string; q?: string; page?: string }
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
      </div>
      <UsersTable initialParams={searchParams} />
    </div>
  )
}
```

- [ ] **Step 2: Client table component**

```tsx
// src/components/admin/users-table.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ROLE_LABELS, CARGO_SHORT_LABELS, STATUS_LABELS } from '@/lib/i18n'
import { USER_STATUS, USER_ROLES, PF_CARGOS } from '@/lib/constants'
import { ModerationActions } from './moderation-actions'
import { toast } from 'sonner'
import type { UserRow } from '@/types/admin-users'

export function UsersTable({ initialParams }: { initialParams: Record<string, string | undefined> }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [items, setItems] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const status = sp.get('status') ?? initialParams.status ?? USER_STATUS.PENDING
  const role = sp.get('role') ?? ''
  const cargo = sp.get('cargo') ?? ''
  const q = sp.get('q') ?? ''

  const fetchData = async () => {
    const params = new URLSearchParams({ status, role, cargo, q }).toString()
    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) return
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
  }

  useEffect(() => {
    fetchData()
  }, [status, role, cargo, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.replace(`/admin/usuarios?${params.toString()}`))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkApprove = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    const res = await fetch('/api/admin/users/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      toast.success(`${ids.length} aluno(s) aprovado(s)`)
      setSelected(new Set())
      fetchData()
    } else {
      toast.error('Falha ao aprovar em lote')
    }
  }

  const statusBadge = (s: string) => {
    if (s === USER_STATUS.PENDING) return <Badge className="bg-yellow-500">Pendente</Badge>
    if (s === USER_STATUS.APPROVED) return <Badge className="bg-green-600">Aprovado</Badge>
    return <Badge className="bg-red-500">Rejeitado</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar nome, email ou lotação..."
          defaultValue={q}
          onBlur={(e) => updateParam('q', e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(v) => updateParam('status', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
            <SelectItem value="approved">{STATUS_LABELS.approved}</SelectItem>
            <SelectItem value="rejected">{STATUS_LABELS.rejected}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={(v) => updateParam('role', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Função" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {Object.values(USER_ROLES).map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cargo} onValueChange={(v) => updateParam('cargo', v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.values(PF_CARGOS).map((c) => (
              <SelectItem key={c} value={c}>{CARGO_SHORT_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && status === USER_STATUS.PENDING && (
          <Button onClick={bulkApprove}>Aprovar {selected.size} selecionados</Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Lotação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {status === USER_STATUS.PENDING && (
                    <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} />
                  )}
                </TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</TableCell>
                <TableCell>{u.cargo ? CARGO_SHORT_LABELS[u.cargo as keyof typeof CARGO_SHORT_LABELS] : '—'}</TableCell>
                <TableCell>{u.lotacao}</TableCell>
                <TableCell>{statusBadge(u.status)}</TableCell>
                <TableCell><ModerationActions user={u} onChanged={fetchData} /></TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">Total: {total}</div>
    </div>
  )
}
```

- [ ] **Step 3: Add UserRow type**

```ts
// src/types/admin-users.ts
export interface UserRow {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  cargo?: string
  lotacao: string
  whatsapp: string
  status: string
  isActive: boolean
  courseId?: string
  courseName?: string
  createdAt: string
}
```

- [ ] **Step 4: Moderation actions component**

```tsx
// src/components/admin/moderation-actions.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { USER_STATUS } from '@/lib/constants'
import { toast } from 'sonner'
import type { UserRow } from '@/types/admin-users'

export function ModerationActions({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const call = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) {
      onChanged()
      toast.success('Atualizado')
    } else {
      const data = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(data.error || 'Falha na operação')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user.status === USER_STATUS.PENDING && (
            <>
              <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}/approve`)}>Aprovar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRejectOpen(true)}>Rejeitar</DropdownMenuItem>
            </>
          )}
          {user.status === USER_STATUS.REJECTED && (
            <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}/approve`)}>Reativar (aprovar)</DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/admin/usuarios/${user.id}`}>Editar</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}`, { isActive: !user.isActive })}>
            {user.isActive ? 'Desativar' : 'Reativar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogTrigger asChild><span style={{ display: 'none' }} /></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe um motivo (opcional). O aluno receberá um email com esta mensagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await call(`/api/admin/users/${user.id}/reject`, { reason })
                setRejectOpen(false)
                setReason('')
              }}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 5: Verify TS, run dev, visit /admin/usuarios**

```powershell
npx tsc --noEmit
npm run dev
```

- [ ] **Step 6: Commit**

```powershell
git add src/app/(admin)/admin/usuarios src/components/admin/users-table.tsx src/components/admin/moderation-actions.tsx src/types/admin-users.ts
git commit -m "feat(admin): users table with filters + moderation actions"
```

---

### Task 8.5: Create approve / reject / bulk-approve / generic edit APIs

**Files:**
- Create: `src/app/api/admin/users/[id]/approve/route.ts`
- Create: `src/app/api/admin/users/[id]/reject/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/users/bulk-approve/route.ts`

- [ ] **Step 1: Approve route**

```ts
// src/app/api/admin/users/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { sendAccountApprovedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão para aprovar' }, { status: 403 })
  }
  await connectDB()
  const target = await User.findById(params.id)
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  target.status = USER_STATUS.APPROVED
  target.rejectedReason = undefined
  target.approvedBy = session.user.id
  target.approvedAt = new Date()
  await target.save()

  try {
    await sendAccountApprovedEmail(target.email, target.name)
  } catch (e) {
    console.error('Failed to send approval email:', e)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Reject route**

```ts
// src/app/api/admin/users/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canReject } from '@/lib/permissions'
import { sendAccountRejectedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canReject(session.user)) {
    return NextResponse.json({ error: 'Sem permissão para rejeitar' }, { status: 403 })
  }
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string }

  await connectDB()
  const target = await User.findById(params.id)
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  target.status = USER_STATUS.REJECTED
  target.rejectedReason = reason || undefined
  await target.save()

  try {
    await sendAccountRejectedEmail(target.email, target.name, reason)
  } catch (e) {
    console.error('Failed to send rejection email:', e)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Bulk approve**

```ts
// src/app/api/admin/users/bulk-approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { USER_STATUS } from '@/lib/constants'
import { sendAccountApprovedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { ids } = (await req.json()) as { ids: string[] }
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: 'ids[] obrigatório' }, { status: 400 })
  }

  await connectDB()
  const targets = await User.find({ _id: { $in: ids } })
  for (const t of targets) {
    t.status = USER_STATUS.APPROVED
    t.rejectedReason = undefined
    t.approvedBy = session.user.id
    t.approvedAt = new Date()
    await t.save()
    try {
      await sendAccountApprovedEmail(t.email, t.name)
    } catch (e) {
      console.error('Email failed for', t.email, e)
    }
  }
  return NextResponse.json({ ok: true, count: targets.length })
}
```

- [ ] **Step 4: Generic edit route**

```ts
// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canEditUser, canAssignAdminRole } from '@/lib/permissions'
import { USER_ROLES } from '@/lib/constants'

const EDITABLE_FIELDS = [
  'name', 'email', 'avatar', 'cargo', 'lotacao', 'whatsapp',
  'role', 'status', 'isActive', 'courseId', 'courseName',
  'city', 'country', 'linkedin', 'instagram', 'github', 'twitter', 'company', 'bio',
] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditUser(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (k in body) update[k] = body[k]
  }

  // Only admin can assign or remove the admin role
  if ('role' in update && update.role !== body.role) {
    // no-op (kept for clarity)
  }
  if (
    'role' in update &&
    (update.role === USER_ROLES.ADMIN || (await User.findById(params.id))?.role === USER_ROLES.ADMIN)
  ) {
    if (!canAssignAdminRole(session.user)) {
      return NextResponse.json({ error: 'Apenas admin pode promover/rebaixar admins' }, { status: 403 })
    }
  }

  await connectDB()
  const updated = await User.findByIdAndUpdate(params.id, update, { new: true, runValidators: true })
  if (!updated) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditUser(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const u = await User.findById(params.id).lean()
  if (!u) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  return NextResponse.json({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    role: u.role,
    cargo: u.cargo,
    lotacao: u.lotacao,
    whatsapp: u.whatsapp,
    status: u.status,
    isActive: u.isActive,
    rejectedReason: u.rejectedReason,
    courseId: u.courseId?.toString(),
    courseName: u.courseName,
    city: u.city,
    country: u.country,
    linkedin: u.linkedin,
    instagram: u.instagram,
    github: u.github,
    twitter: u.twitter,
    company: u.company,
    bio: u.bio,
    createdAt: u.createdAt,
  })
}
```

- [ ] **Step 5: Manual smoke test**

```powershell
npm run dev
```
- Log in as admin (created via seed in Phase 12; for now test with a manually-promoted user)
- Visit `/admin/usuarios`
- Approve / Reject / Bulk-approve / Edit a user
- Confirm DB reflects changes; emails fire

- [ ] **Step 6: Commit**

```powershell
git add src/app/api/admin/users
git commit -m "feat(api/admin): approve, reject, bulk-approve, generic edit"
```

---

### Task 8.6: Create /admin/usuarios/[id] edit page

**Files:**
- Create: `src/app/(admin)/admin/usuarios/[id]/page.tsx`
- Create: `src/components/admin/user-edit-form.tsx`

- [ ] **Step 1: Server component shell**

```tsx
// src/app/(admin)/admin/usuarios/[id]/page.tsx
import { UserEditForm } from '@/components/admin/user-edit-form'

export default function AdminUserEditPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar usuário</h1>
      <UserEditForm userId={params.id} />
    </div>
  )
}
```

- [ ] **Step 2: Client edit form**

```tsx
// src/components/admin/user-edit-form.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { USER_ROLES, USER_STATUS, PF_CARGOS } from '@/lib/constants'
import { ROLE_LABELS, CARGO_LABELS, STATUS_LABELS } from '@/lib/i18n'
import { toast } from 'sonner'

interface UserData {
  id: string; name: string; email: string; role: string; cargo?: string; lotacao: string;
  whatsapp: string; status: string; isActive: boolean; bio?: string; company?: string;
  linkedin?: string; instagram?: string; github?: string; twitter?: string;
  city?: string; country?: string; courseName?: string;
}

export function UserEditForm({ userId }: { userId: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setUser(data))
  }, [userId])

  if (!user) return <p>Carregando...</p>

  const actorIsAdmin = session?.user?.role === USER_ROLES.ADMIN

  const save = async (patch: Partial<UserData>) => {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Usuário atualizado')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(data.error || 'Falha ao atualizar')
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save({
          name: user.name, email: user.email, role: user.role, cargo: user.cargo,
          lotacao: user.lotacao, whatsapp: user.whatsapp, status: user.status,
          isActive: user.isActive, bio: user.bio, company: user.company,
          linkedin: user.linkedin, instagram: user.instagram, github: user.github,
          twitter: user.twitter, city: user.city, country: user.country,
        })
      }}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome completo</Label>
          <Input value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={user.whatsapp} onChange={(e) => setUser({ ...user, whatsapp: e.target.value })} />
        </div>
        <div>
          <Label>Lotação</Label>
          <Input value={user.lotacao} onChange={(e) => setUser({ ...user, lotacao: e.target.value })} />
        </div>
        <div>
          <Label>Função</Label>
          <Select
            value={user.role}
            onValueChange={(v) => setUser({ ...user, role: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(USER_ROLES)
                .filter((r) => actorIsAdmin || r !== USER_ROLES.ADMIN)
                .map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cargo</Label>
          <Select
            value={user.cargo || ''}
            onValueChange={(v) => setUser({ ...user, cargo: v || undefined })}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Object.values(PF_CARGOS).map((c) => (
                <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={user.status}
            onValueChange={(v) => setUser({ ...user, status: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={USER_STATUS.PENDING}>{STATUS_LABELS.pending}</SelectItem>
              <SelectItem value={USER_STATUS.APPROVED}>{STATUS_LABELS.approved}</SelectItem>
              <SelectItem value={USER_STATUS.REJECTED}>{STATUS_LABELS.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Checkbox
            checked={user.isActive}
            onCheckedChange={(v) => setUser({ ...user, isActive: Boolean(v) })}
          />
          <Label>Ativo</Label>
        </div>
        <div className="col-span-2">
          <Label>Bio</Label>
          <Textarea
            value={user.bio || ''}
            onChange={(e) => setUser({ ...user, bio: e.target.value })}
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>Salvar</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Manual verify**

Log in as admin, edit a user, save, confirm DB updates.

- [ ] **Step 4: Commit**

```powershell
git add src/app/(admin)/admin/usuarios/[id] src/components/admin/user-edit-form.tsx
git commit -m "feat(admin): edit user page with full form"
```

---

## Phase 9 — Admin: settings + courses

### Task 9.1: Settings API (GET + PATCH)

**Files:**
- Create: `src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { AppSettings } from '@/models/app-settings'
import { canEditSettings } from '@/lib/permissions'
import { invalidateAppSettingsCache } from '@/lib/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-settings'

const FIELDS = [
  'brandName', 'brandFullName', 'institutionName', 'institutionFullName',
  'description', 'activeCourseId', 'peerApprovalEnabled',
  'developerName', 'developerLinkedinUrl',
] as const

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditSettings(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const doc = await AppSettings.findOne().lean()
  return NextResponse.json(doc || { ...DEFAULT_APP_SETTINGS })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!canEditSettings(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of FIELDS) {
    if (k in body) update[k] = body[k]
  }

  await connectDB()
  const existing = await AppSettings.findOne()
  if (existing) {
    Object.assign(existing, update)
    await existing.save()
  } else {
    await AppSettings.create({ ...DEFAULT_APP_SETTINGS, ...update })
  }
  invalidateAppSettingsCache()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/api/admin/settings/route.ts
git commit -m "feat(api/admin): GET/PATCH /api/admin/settings"
```

---

### Task 9.2: Settings page + form

**Files:**
- Create: `src/app/(admin)/admin/configuracoes/page.tsx`
- Create: `src/components/admin/settings-form.tsx`

- [ ] **Step 1: Server component**

```tsx
// src/app/(admin)/admin/configuracoes/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/constants'
import { SettingsForm } from '@/components/admin/settings-form'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role !== USER_ROLES.ADMIN) redirect('/admin/usuarios')
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <SettingsForm />
    </div>
  )
}
```

- [ ] **Step 2: Settings form**

```tsx
// src/components/admin/settings-form.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Course { id: string; name: string; code: string }
interface Settings {
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  activeCourseId?: string
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then(setSettings)
    fetch('/api/admin/courses').then((r) => r.json()).then((d) => setCourses(d.items || []))
  }, [])

  if (!settings) return <p>Carregando...</p>

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) toast.success('Configurações salvas')
    else toast.error('Falha ao salvar')
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save() }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Marca</Label>
          <Input value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
        </div>
        <div>
          <Label>Nome completo da marca</Label>
          <Input value={settings.brandFullName} onChange={(e) => setSettings({ ...settings, brandFullName: e.target.value })} />
        </div>
        <div>
          <Label>Instituição (sigla)</Label>
          <Input value={settings.institutionName} onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })} />
        </div>
        <div>
          <Label>Instituição (nome completo)</Label>
          <Input value={settings.institutionFullName} onChange={(e) => setSettings({ ...settings, institutionFullName: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          <Textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} />
        </div>
        <div>
          <Label>Turma ativa</Label>
          <Select
            value={settings.activeCourseId || ''}
            onValueChange={(v) => setSettings({ ...settings, activeCourseId: v || undefined })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={settings.peerApprovalEnabled}
            onCheckedChange={(v) => setSettings({ ...settings, peerApprovalEnabled: v })}
          />
          <Label className="cursor-pointer">Permitir que alunos aprovem novos cadastros</Label>
        </div>
        <div>
          <Label>Desenvolvedor (nome)</Label>
          <Input value={settings.developerName} onChange={(e) => setSettings({ ...settings, developerName: e.target.value })} />
        </div>
        <div>
          <Label>Desenvolvedor (LinkedIn)</Label>
          <Input value={settings.developerLinkedinUrl} onChange={(e) => setSettings({ ...settings, developerLinkedinUrl: e.target.value })} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>Salvar configurações</Button>
    </form>
  )
}
```

- [ ] **Step 3: Manual verify**

Log in as admin → /admin/configuracoes → mudar marca → salvar → recarregar home pública e ver a mudança após 60s (TTL).

- [ ] **Step 4: Commit**

```powershell
git add src/app/(admin)/admin/configuracoes src/components/admin/settings-form.tsx
git commit -m "feat(admin): settings page (singleton AppSettings)"
```

---

### Task 9.3: Courses APIs and admin pages

**Files:**
- Create: `src/app/api/admin/courses/route.ts`
- Create: `src/app/api/admin/courses/[id]/route.ts`
- Create: `src/app/(admin)/admin/turmas/page.tsx`
- Create: `src/app/(admin)/admin/turmas/[id]/page.tsx`
- Create: `src/components/admin/course-form.tsx`

- [ ] **Step 1: List + create API**

```ts
// src/app/api/admin/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'
import { canManageCourses } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  await connectDB()
  const items = await Course.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      description: c.description,
      location: c.location,
      startDate: c.startDate,
      endDate: c.endDate,
      isActive: c.isActive,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = await req.json()
  await connectDB()
  const created = await Course.create(body)
  return NextResponse.json({ id: created._id.toString() }, { status: 201 })
}
```

- [ ] **Step 2: Edit API**

```ts
// src/app/api/admin/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'
import { canManageCourses } from '@/lib/permissions'

const FIELDS = ['name', 'code', 'description', 'location', 'startDate', 'endDate', 'isActive'] as const

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  await connectDB()
  const c = await Course.findById(params.id).lean()
  if (!c) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ...c, id: c._id.toString() })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || !canManageCourses(session.user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json()) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of FIELDS) {
    if (k in body) update[k] = body[k]
  }
  await connectDB()
  const updated = await Course.findByIdAndUpdate(params.id, update, { new: true })
  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: List page**

```tsx
// src/app/(admin)/admin/turmas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Course { id: string; name: string; code: string; location: string; isActive: boolean }

export default function AdminTurmasPage() {
  const [items, setItems] = useState<Course[]>([])
  useEffect(() => {
    fetch('/api/admin/courses').then((r) => r.json()).then((d) => setItems(d.items))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Link href="/admin/turmas/new">
          <Button>Nova turma</Button>
        </Link>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.location}</TableCell>
                <TableCell>{c.isActive ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}</TableCell>
                <TableCell>
                  <Link href={`/admin/turmas/${c.id}`}><Button variant="outline" size="sm">Editar</Button></Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Edit/new page + form**

```tsx
// src/app/(admin)/admin/turmas/[id]/page.tsx
import { CourseForm } from '@/components/admin/course-form'

export default function AdminTurmaEditPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{params.id === 'new' ? 'Nova turma' : 'Editar turma'}</h1>
      <CourseForm id={params.id === 'new' ? null : params.id} />
    </div>
  )
}
```

```tsx
// src/components/admin/course-form.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface CourseData {
  name: string
  code: string
  description?: string
  location: string
  startDate: string
  endDate: string
  isActive: boolean
}

const EMPTY: CourseData = {
  name: '',
  code: '',
  description: '',
  location: 'ANP — Brasília/DF',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  isActive: true,
}

export function CourseForm({ id }: { id: string | null }) {
  const router = useRouter()
  const [data, setData] = useState<CourseData>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/courses/${id}`)
      .then((r) => r.json())
      .then((c) =>
        setData({
          name: c.name,
          code: c.code,
          description: c.description || '',
          location: c.location,
          startDate: new Date(c.startDate).toISOString().split('T')[0],
          endDate: new Date(c.endDate).toISOString().split('T')[0],
          isActive: c.isActive,
        })
      )
  }, [id])

  const save = async () => {
    setSaving(true)
    const url = id ? `/api/admin/courses/${id}` : `/api/admin/courses`
    const method = id ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Turma salva')
      router.push('/admin/turmas')
    } else {
      const d = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(d.error || 'Falha')
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required />
        </div>
        <div>
          <Label>Código</Label>
          <Input value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} required />
        </div>
        <div>
          <Label>Local</Label>
          <Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} required />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Checkbox
            checked={data.isActive}
            onCheckedChange={(v) => setData({ ...data, isActive: Boolean(v) })}
          />
          <Label>Ativa</Label>
        </div>
        <div>
          <Label>Início</Label>
          <Input type="date" value={data.startDate} onChange={(e) => setData({ ...data, startDate: e.target.value })} />
        </div>
        <div>
          <Label>Término</Label>
          <Input type="date" value={data.endDate} onChange={(e) => setData({ ...data, endDate: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          <Textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>Salvar</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/admin/courses src/app/(admin)/admin/turmas src/components/admin/course-form.tsx
git commit -m "feat(admin): CRUD básico de turmas (Course)"
```

---

## Phase 10 — Peer approval

### Task 10.1: Peer pending API + approve API

**Files:**
- Create: `src/app/api/peer/pending/route.ts`
- Create: `src/app/api/peer/users/[id]/approve/route.ts`

- [ ] **Step 1: Pending list**

```ts
// src/app/api/peer/pending/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { USER_STATUS } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const items = await User.find({ status: USER_STATUS.PENDING }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      cargo: u.cargo,
      lotacao: u.lotacao,
      createdAt: u.createdAt,
    })),
  })
}
```

- [ ] **Step 2: Approve route**

```ts
// src/app/api/peer/users/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { canApprove } from '@/lib/permissions'
import { sendAccountApprovedEmail } from '@/lib/email'
import { USER_STATUS } from '@/lib/constants'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await canApprove(session.user))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  await connectDB()
  const target = await User.findById(params.id)
  if (!target) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (target.status !== USER_STATUS.PENDING) {
    return NextResponse.json({ error: 'Usuário já foi avaliado' }, { status: 409 })
  }

  target.status = USER_STATUS.APPROVED
  target.approvedBy = session.user.id
  target.approvedAt = new Date()
  await target.save()

  try {
    await sendAccountApprovedEmail(target.email, target.name)
  } catch (e) {
    console.error('Email failed:', e)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/peer
git commit -m "feat(api/peer): pending + approve endpoints"
```

---

### Task 10.2: /aprovar-colegas page

**Files:**
- Create: `src/app/aprovar-colegas/page.tsx`
- Create: `src/components/peer-approval/pending-list.tsx`

- [ ] **Step 1: Server component (guards via getAppSettings + canApprove)**

```tsx
// src/app/aprovar-colegas/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAppSettings } from '@/lib/app-settings'
import { canApprove } from '@/lib/permissions'
import { PendingList } from '@/components/peer-approval/pending-list'

export default async function AprovarColegasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const settings = await getAppSettings()
  if (!settings.peerApprovalEnabled) notFound()
  if (!(await canApprove(session.user))) notFound()

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Aprovar colegas</h1>
      <p className="text-sm text-muted-foreground">
        Confirme novos cadastros de colegas da turma. Você só pode aprovar;
        para rejeitar ou editar dados, fale com a coordenação.
      </p>
      <PendingList />
    </div>
  )
}
```

- [ ] **Step 2: Pending list (client)**

```tsx
// src/components/peer-approval/pending-list.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CARGO_SHORT_LABELS } from '@/lib/i18n'
import { toast } from 'sonner'

interface Pending {
  id: string; name: string; email: string;
  cargo?: string; lotacao: string; createdAt: string;
}

export function PendingList() {
  const [items, setItems] = useState<Pending[]>([])
  const fetchData = async () => {
    const res = await fetch('/api/peer/pending')
    if (res.ok) setItems((await res.json()).items)
  }
  useEffect(() => { fetchData() }, [])

  const approve = async (id: string) => {
    const res = await fetch(`/api/peer/users/${id}/approve`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Aprovado')
      fetchData()
    } else {
      toast.error('Falha ao aprovar')
    }
  }

  if (!items.length) {
    return <p className="text-muted-foreground">Sem cadastros pendentes no momento.</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Lotação</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.cargo ? CARGO_SHORT_LABELS[u.cargo as keyof typeof CARGO_SHORT_LABELS] : '—'}</TableCell>
              <TableCell>{u.lotacao}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => approve(u.id)}>Aprovar</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 3: Wire menu item in dashboard header (Phase 11 includes the header rewrite — add the conditional link there)**

For now, the route exists. The menu link is part of the header rewrite in Phase 11.

- [ ] **Step 4: Manual verify**

- Toggle peer approval in /admin/configuracoes
- Log in as an approved aluno
- Visit /aprovar-colegas → see pending list → approve one
- Disable the flag → /aprovar-colegas returns 404

- [ ] **Step 5: Commit**

```powershell
git add src/app/aprovar-colegas src/components/peer-approval
git commit -m "feat(peer): /aprovar-colegas page + pending list"
```

---

## Phase 11 — UI pública (PT-BR + branding dinâmica)

### Task 11.1: Public courses API for the active course on the home/register pages

**Files:**
- Modify: `src/app/api/courses/route.ts`

- [ ] **Step 1: Read current contents**

Open [src/app/api/courses/route.ts](src/app/api/courses/route.ts). The current endpoint likely returns courses. Update so any non-authenticated caller still sees only safe data.

- [ ] **Step 2: Refactor to only return active courses + minimal fields**

```ts
// src/app/api/courses/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'

export async function GET() {
  await connectDB()
  const items = await Course.find({ isActive: true }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      location: c.location,
    })),
  })
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/courses/route.ts
git commit -m "refactor(api/courses): only safe fields for public list"
```

---

### Task 11.2: Rewrite home page with dynamic branding (PT-BR)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/app/page.tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Image, MapPin } from 'lucide-react'
import { getAppSettings } from '@/lib/app-settings'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  const settings = await getAppSettings()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4">
        <header className="flex items-center justify-between py-6">
          <h1 className="text-2xl font-bold text-white">{settings.brandName}</h1>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-slate-900 hover:bg-white/90">Cadastrar</Button>
            </Link>
          </div>
        </header>

        <main className="py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Conecte-se com os colegas do
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> {settings.brandName} </span>
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              {settings.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8">
                  Cadastrar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <section className="py-20 border-t border-white/10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Encontre colegas</h3>
              <p className="text-slate-400">
                Veja os perfis dos colegas da turma, filtre por cargo (APF/DPF/EPF/PPF) ou lotação.
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Image className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Compartilhe momentos</h3>
              <p className="text-slate-400">
                Suba e compartilhe fotos do curso. Marque colegas e mantenha a memória da turma.
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Mantenha contato</h3>
              <p className="text-slate-400">
                WhatsApp, redes sociais e lotação dos colegas — tudo em um lugar só.
              </p>
            </div>
          </div>
        </section>

        <footer className="py-8 border-t border-white/10 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} {settings.brandName} — {settings.institutionFullName}</p>
        </footer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update root layout metadata to be dynamic**

```tsx
// src/app/layout.tsx — only the metadata export changes
import type { Metadata } from 'next'
import { getAppSettings } from '@/lib/app-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getAppSettings()
  return {
    title: { default: s.brandName, template: `%s — ${s.brandName}` },
    description: s.description,
  }
}
```

(Keep the rest of `layout.tsx` as-is — body, providers, fonts, etc.)

- [ ] **Step 3: Commit**

```powershell
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat(home): PT-BR copy + dynamic branding from AppSettings"
```

---

### Task 11.3: Rewrite header / footer with dynamic branding + peer link

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Header — replace nav items and add conditional peer link**

Modify [src/components/layout/header.tsx](src/components/layout/header.tsx):
- Change `navItems` labels: "Home" → "Início", "Colleagues" → "Colegas", "Gallery" → "Galeria"
- Replace hard-coded "IBS London" with `brandName` (need a client-side hook — see Step 2)
- Add a conditional peer-approval link

```tsx
// Excerpt from header.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Home, Users, Image as ImageIcon, ShieldCheck } from 'lucide-react'
// ... existing imports

interface Branding { brandName: string; peerApprovalEnabled: boolean }

export function Header() {
  const { data: session } = useSession()
  const [branding, setBranding] = useState<Branding>({ brandName: 'V COPP', peerApprovalEnabled: false })

  useEffect(() => {
    fetch('/api/branding')
      .then((r) => r.json())
      .then(setBranding)
      .catch(() => {})
  }, [])

  const navItems = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/colleagues', label: 'Colegas', icon: Users },
    { href: '/gallery', label: 'Galeria', icon: ImageIcon },
    ...(branding.peerApprovalEnabled && session?.user?.status === 'approved'
      ? [{ href: '/aprovar-colegas', label: 'Aprovar colegas', icon: ShieldCheck }]
      : []),
  ]

  // ... use branding.brandName instead of "IBS London"
}
```

Replace all occurrences of `'IBS London'` in the file with `branding.brandName`.

- [ ] **Step 2: Create the public branding endpoint (read-only, no auth)**

```ts
// src/app/api/branding/route.ts
import { NextResponse } from 'next/server'
import { getAppSettings } from '@/lib/app-settings'

export async function GET() {
  const s = await getAppSettings()
  return NextResponse.json({
    brandName: s.brandName,
    brandFullName: s.brandFullName,
    institutionName: s.institutionName,
    institutionFullName: s.institutionFullName,
    description: s.description,
    peerApprovalEnabled: s.peerApprovalEnabled,
    developerName: s.developerName,
    developerLinkedinUrl: s.developerLinkedinUrl,
  })
}
```

Add `/api/branding` to the `publicRoutes` array in `src/middleware.ts`.

- [ ] **Step 3: Footer — dynamic developer**

Modify [src/components/layout/footer.tsx](src/components/layout/footer.tsx) to fetch `/api/branding` (or import a `useBranding` hook) and render `branding.developerName` + `branding.developerLinkedinUrl`. Replace "IBS London" with `branding.brandName`.

- [ ] **Step 4: Optional `useBranding` hook to DRY this up**

```ts
// src/hooks/use-app-settings.ts
'use client'

import { useEffect, useState } from 'react'

interface Branding {
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
}

const DEFAULTS: Branding = {
  brandName: 'V COPP',
  brandFullName: '5º Curso de Operadores de Proteção a Pessoa',
  institutionName: 'ANP',
  institutionFullName: 'Academia Nacional de Polícia — Polícia Federal',
  description: '',
  peerApprovalEnabled: false,
  developerName: 'Juliano Costa Silva',
  developerLinkedinUrl: 'https://www.linkedin.com/in/julianocsilva/',
}

export function useAppSettings(): Branding {
  const [data, setData] = useState<Branding>(DEFAULTS)
  useEffect(() => {
    fetch('/api/branding')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])
  return data
}
```

Replace inline `useEffect` calls in header/footer with `useAppSettings()`.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/header.tsx src/components/layout/footer.tsx src/hooks/use-app-settings.ts src/app/api/branding/route.ts src/middleware.ts
git commit -m "feat(layout): dynamic branding + Aprovar colegas link (PT-BR)"
```

---

### Task 11.4: Translate auth pages + profile / colleagues / gallery

**Files (modify):**
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/colleagues/page.tsx`
- `src/app/(dashboard)/colleagues/[id]/page.tsx`
- `src/app/(dashboard)/gallery/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`
- `src/components/colleagues/colleague-card.tsx`
- `src/components/layout/profile-completion-banner.tsx`
- `src/hooks/use-profile-completion-redirect.ts`

These are mechanical changes — translate strings to PT-BR and replace `IBS London` with `branding.brandName` (via `useAppSettings`).

- [ ] **Step 1: Login page text**

Replace English copy in [src/app/login/page.tsx](src/app/login/page.tsx) and its form component. Examples:
- "Welcome back" → "Bem-vindo de volta"
- "Sign in to your account" → "Acesse sua conta"
- "Forgot password?" → "Esqueci minha senha"
- "Don't have an account?" → "Não tem uma conta?"
- "Sign up" → "Cadastre-se"

- [ ] **Step 2: Forgot-password and verify-email pages**

Same approach — translate all visible copy in [src/app/forgot-password/page.tsx](src/app/forgot-password/page.tsx), [src/app/verify-email/page.tsx](src/app/verify-email/page.tsx) and the forms.

- [ ] **Step 3: Dashboard page**

In [src/app/(dashboard)/dashboard/page.tsx](src/app/(dashboard)/dashboard/page.tsx), replace English greeting and references to IBS Americas/London with PT-BR + `useAppSettings()`. Show cargo + lotação in the welcome card if available.

- [ ] **Step 4: Colleagues directory**

In [src/app/(dashboard)/colleagues/page.tsx](src/app/(dashboard)/colleagues/page.tsx) and `[id]/page.tsx`:
- Replace filter by city/country with filter by **cargo** and **lotação** (text search)
- Hide users with `status !== 'approved'` (the list API already filters approved)
- In [src/components/colleagues/colleague-card.tsx](src/components/colleagues/colleague-card.tsx), display:
  - `CARGO_LABELS[user.cargo]` (badge)
  - `user.lotacao` (subtitle)
  - WhatsApp link `https://wa.me/${user.whatsapp.replace(/\D/g, '')}`

- [ ] **Step 5: Gallery / profile / profile-completion-banner**

Translate copy to PT-BR. In profile page form, swap city/country form fields for lotação (still keep city/country as optional inputs because the data model retains them).

- [ ] **Step 6: Update use-profile-completion-redirect.ts**

The "complete profile" gate should consider `whatsapp` + `lotacao` + `cargo` (when not admin). Replace previously required `city`/`country` checks.

```ts
// src/hooks/use-profile-completion-redirect.ts
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

const ALLOW_PATHS = ['/profile', '/login', '/register', '/aguardando-aprovacao']

export function useProfileCompletionRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (ALLOW_PATHS.some((p) => pathname.startsWith(p))) return

    const u = session?.user
    if (!u) return

    const missingBasics =
      !u.whatsapp ||
      !u.lotacao ||
      (u.role !== 'admin' && !u.cargo)

    if (missingBasics) router.push('/profile?complete=1')
  }, [session, status, pathname, router])
}
```

- [ ] **Step 7: Update API endpoints that previously required city/country**

In [src/app/api/users/route.ts](src/app/api/users/route.ts) and [src/app/api/users/[id]/route.ts](src/app/api/users/[id]/route.ts), allow updates that omit city/country and rely on `lotacao`/`cargo`/`whatsapp` validations from `profileSchema`.

In [src/app/api/auth/complete-profile/route.ts](src/app/api/auth/complete-profile/route.ts), reuse the new `profileSchema` (or create a stripped-down `completeProfileSchema` if necessary). For now, since email verification is disabled and registration already collects the required fields, this endpoint may become unused — confirm by inspecting callers and either keep it or delete the file.

- [ ] **Step 8: Manual verify**

```powershell
npm run dev
```
Visit each page in turn, sanity-check labels are PT-BR, and that the colleagues directory shows cargo/lotação.

- [ ] **Step 9: Commit**

```powershell
git add src/app src/components src/hooks
git commit -m "feat(ui): PT-BR translation + cargo/lotacao visible in directory"
```

---

## Phase 12 — Bootstrap scripts

### Task 12.1: Add SEED env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Append to .env.local**

```
SEED_ADMIN_EMAIL=admin@v-copp.local
SEED_ADMIN_PASSWORD=ChangeMe-2026
SEED_ADMIN_NAME=Coordenador V COPP
SEED_ADMIN_LOTACAO=ANP
SEED_ADMIN_WHATSAPP=(61) 99999-9999
```

> Pick a strong password before deploying. These are bootstrap-only — the admin should change the password at first login.

- [ ] **Step 2: Verify (no commit; .env.local is gitignored)**

```powershell
Test-Path .env.local
```

---

### Task 12.2: Reset DB script

**Files:**
- Create: `scripts/reset-db.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/reset-db.ts
import 'dotenv/config'
import mongoose from 'mongoose'
import readline from 'node:readline/promises'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const dbName = mongoose.connection.db.databaseName

  console.log(`\n⚠️  This will DROP collections in DB: ${dbName}`)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Type the DB name to confirm: `)
  rl.close()

  if (answer.trim() !== dbName) {
    console.error('Confirmation does not match. Aborting.')
    process.exit(1)
  }

  const targets = ['users', 'photos', 'courses', 'appsettings']
  for (const name of targets) {
    try {
      await mongoose.connection.db.dropCollection(name)
      console.log(`  dropped ${name}`)
    } catch (e: any) {
      if (e.codeName === 'NamespaceNotFound') console.log(`  ${name} not present`)
      else throw e
    }
  }

  await mongoose.disconnect()
  console.log('\n✅ Done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Add script commands to package.json**

In `package.json` `"scripts"`:
```json
"db:reset": "tsx scripts/reset-db.ts",
"db:seed": "tsx scripts/seed.ts",
"db:bootstrap": "npm run db:reset && npm run db:seed"
```

- [ ] **Step 3: Verify confirmation flow**

```powershell
npm run db:reset
```
- Type the wrong DB name → script aborts
- Don't run it for real here; the seed script in Task 12.3 needs the DB intact

- [ ] **Step 4: Commit**

```powershell
git add scripts/reset-db.ts package.json
git commit -m "feat(scripts): reset-db with interactive confirmation"
```

---

### Task 12.3: Seed script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/seed.ts
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/models/user'
import { Course } from '../src/models/course'
import { AppSettings } from '../src/models/app-settings'
import { DEFAULT_APP_SETTINGS } from '../src/lib/default-settings'
import { USER_ROLES, USER_STATUS } from '../src/lib/constants'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminName = process.env.SEED_ADMIN_NAME || 'Coordenador V COPP'
  const adminLotacao = process.env.SEED_ADMIN_LOTACAO || 'ANP'
  const adminWhats = process.env.SEED_ADMIN_WHATSAPP || '(61) 99999-9999'

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  }

  await mongoose.connect(uri)

  // 1) Course V COPP
  let course = await Course.findOne({ code: 'V-COPP' })
  if (!course) {
    course = await Course.create({
      name: 'V COPP',
      code: 'V-COPP',
      description: '5º Curso de Operadores de Proteção a Pessoa',
      location: 'ANP — Brasília/DF',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    })
    console.log('Created Course V COPP:', course._id.toString())
  } else {
    console.log('Course V COPP already exists:', course._id.toString())
  }

  // 2) AppSettings (singleton) pointing to V COPP
  let settings = await AppSettings.findOne()
  if (!settings) {
    settings = await AppSettings.create({
      ...DEFAULT_APP_SETTINGS,
      activeCourseId: course._id,
    })
    console.log('Created AppSettings:', settings._id.toString())
  } else {
    if (!settings.activeCourseId) {
      settings.activeCourseId = course._id
      await settings.save()
    }
    console.log('AppSettings already exists:', settings._id.toString())
  }

  // 3) Bootstrap admin
  let admin = await User.findOne({ email: adminEmail.toLowerCase() })
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 12)
    admin = await User.create({
      email: adminEmail.toLowerCase(),
      password: hash,
      name: adminName,
      role: USER_ROLES.ADMIN,
      lotacao: adminLotacao,
      whatsapp: adminWhats,
      status: USER_STATUS.APPROVED,
      isActive: true,
      profileCompleted: true,
      emailVerified: true,
      courseId: course._id,
      courseName: course.name,
    })
    console.log('Created admin:', admin._id.toString())
  } else {
    console.log('Admin already exists:', admin._id.toString())
  }

  await mongoose.disconnect()
  console.log('\n✅ Seed done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed**

```powershell
npm run db:seed
```
Expected: course, settings, and admin created (or "already exists" if re-run).

- [ ] **Step 3: Verify admin can log in**

```powershell
npm run dev
```
Open http://localhost:3000/login → use `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → redirected to /dashboard.

- [ ] **Step 4: Commit**

```powershell
git add scripts/seed.ts
git commit -m "feat(scripts): seed creates V COPP, AppSettings, bootstrap admin"
```

---

### Task 12.4: README updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the contents**

```markdown
# V COPP — Sistema da Turma

Sistema da turma do **5º Curso de Operadores de Proteção a Pessoa (V COPP)**, ministrado pela **Academia Nacional de Polícia (ANP)** da Polícia Federal.

## Stack

- Next.js 16 (App Router) + React 19
- MongoDB / Mongoose
- NextAuth v5 (credentials)
- Tailwind v4 + shadcn/ui
- Cloudinary (uploads)

## Setup

1. Copie `.env.local.example` para `.env.local` e preencha as variáveis (`MONGODB_URI`, `NEXTAUTH_SECRET`, `CLOUDINARY_*`, `EMAIL_*`, `SEED_ADMIN_*`).
2. Instale dependências:
   ```bash
   npm install
   ```
3. Inicialize o banco (apaga collections + cria turma V COPP + admin):
   ```bash
   npm run db:bootstrap
   ```
4. Suba o dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev`           | dev server |
| `npm run build`         | build de produção |
| `npm run start`         | servidor de produção |
| `npm run lint`          | ESLint |
| `npm test`              | Vitest (unit) |
| `npm run db:reset`      | drop das collections (com confirmação) |
| `npm run db:seed`       | cria turma V COPP + AppSettings + admin |
| `npm run db:bootstrap`  | reset + seed em sequência |

## Roles e cargos

- **Funções (`role`):** Aluno, Instrutor, Coordenador, Admin
- **Cargos PF (`cargo`):** APF, DPF, EPF, PPF

## Fluxo de aprovação

Novos cadastros entram com `status: pending`. Admin/Coordenador/Instrutor aprovam pelo `/admin/usuarios`. Quando `AppSettings.peerApprovalEnabled = true`, alunos aprovados também podem aprovar via `/aprovar-colegas`.
```

- [ ] **Step 2: Commit**

```powershell
git add README.md
git commit -m "docs: README for V COPP"
```

---

## Phase 13 — End-to-end smoke test

### Task 13.1: Full happy path

**Files:** none (manual verification)

- [ ] **Step 1: Fresh bootstrap**

```powershell
npm run db:bootstrap
npm run dev
```

- [ ] **Step 2: Home loads with V COPP branding**

Visit http://localhost:3000 → see "V COPP" + description + PT-BR copy.

- [ ] **Step 3: Register a new aluno**

- /register → fill all fields (cargo APF, lotação "SR/DF", whatsapp `(61) 99999-0001`)
- Submit → redirected to /aguardando-aprovacao
- Confirm DB has the user with `status: 'pending'`

- [ ] **Step 4: Login fails while pending**

- Try /login with the new credentials → redirected back to /aguardando-aprovacao

- [ ] **Step 5: Admin approves**

- Logout → login as `SEED_ADMIN_EMAIL`
- /admin/usuarios → filter status=pending → see the user → Approve
- Email logged in terminal (or sent if SMTP configured)

- [ ] **Step 6: Aluno logs in successfully**

- Logout → login as the aluno → redirected to /dashboard
- /colleagues → see the admin + self → cargo badge + lotação visible
- /profile → fields editable

- [ ] **Step 7: Peer approval toggle**

- Logout → login as admin → /admin/configuracoes → toggle "Permitir alunos aprovarem" ON → save
- Wait ~60s for cache to expire (or restart dev server)
- Register another aluno
- Logout → login as the first aluno → see "Aprovar colegas" in header → /aprovar-colegas → approve the new user
- Login as the new user → works

- [ ] **Step 8: Rejection flow**

- Register a third aluno → admin rejects with motivo "Não é da turma"
- Aluno tries to login → sees rejected toast

- [ ] **Step 9: Edit user**

- Admin → /admin/usuarios/<id> → change role from aluno → coordenador → save
- Re-login as that user → can access /admin/usuarios but not /admin/configuracoes (admin-only)

- [ ] **Step 10: Course management**

- /admin/turmas → create "VI COPP" → make it active in /admin/configuracoes → new registrations show "VI COPP" as courseName

- [ ] **Step 11: Document any rough edges**

If anything broke, add a follow-up entry at the bottom of this plan or open a TODO.

---

## Glossary

- **APF / DPF / EPF / PPF** — Agente / Delegado / Escrivão / Papiloscopista de Polícia Federal
- **ANP** — Academia Nacional de Polícia
- **V COPP** — 5º Curso de Operadores de Proteção a Pessoa
- **Lotação** — Unidade de exercício do servidor (texto livre, ex: "SR/DF", "DELEFIN/SP")
- **Função (role)** — Papel no sistema: Aluno, Instrutor, Coordenador, Admin
- **Cargo** — Função PF: APF, DPF, EPF, PPF












