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
