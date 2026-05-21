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
