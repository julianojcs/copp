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
