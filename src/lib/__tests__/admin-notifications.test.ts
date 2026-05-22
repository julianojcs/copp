// src/lib/__tests__/admin-notifications.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const leanMock = vi.fn()
const selectMock = vi.fn(() => ({ lean: leanMock }))
const findMock = vi.fn(() => ({ select: selectMock }))
const sendMock = vi.fn()

vi.mock('@/models/user', () => ({
  User: { find: (...args: unknown[]) => findMock(...args) },
}))
vi.mock('@/lib/email', () => ({
  sendNewRegistrationNotificationEmail: (...args: unknown[]) => sendMock(...args),
}))

import {
  listAdminNotificationEmails,
  notifyAdminsOfNewRegistration,
} from '@/lib/admin-notifications'

describe('listAdminNotificationEmails', () => {
  beforeEach(() => {
    leanMock.mockReset()
    selectMock.mockClear()
    findMock.mockClear()
  })

  it('filters for active approved admins', async () => {
    leanMock.mockResolvedValue([])
    await listAdminNotificationEmails()
    expect(findMock).toHaveBeenCalledWith({ role: 'admin', isActive: true, status: 'approved' })
    expect(selectMock).toHaveBeenCalledWith('email')
  })

  it('returns only valid string emails', async () => {
    leanMock.mockResolvedValue([
      { email: 'a@example.com' },
      { email: null },
      { email: '' },
      { email: 'b@example.com' },
    ])
    const result = await listAdminNotificationEmails()
    expect(result).toEqual(['a@example.com', 'b@example.com'])
  })

  it('returns empty array when no admins exist', async () => {
    leanMock.mockResolvedValue([])
    const result = await listAdminNotificationEmails()
    expect(result).toEqual([])
  })
})

describe('notifyAdminsOfNewRegistration', () => {
  beforeEach(() => {
    leanMock.mockReset()
    selectMock.mockClear()
    findMock.mockClear()
    sendMock.mockReset()
    sendMock.mockResolvedValue(undefined)
  })

  it('does nothing when there are no admins', async () => {
    leanMock.mockResolvedValue([])
    await notifyAdminsOfNewRegistration({ name: 'X', email: 'x@y' })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('calls sendNewRegistrationNotificationEmail with the admin list and payload', async () => {
    leanMock.mockResolvedValue([{ email: 'admin@a' }, { email: 'admin@b' }])
    await notifyAdminsOfNewRegistration({
      name: 'New User',
      email: 'new@user',
      cargo: 'APF',
      lotacao: 'SR/PF/DF',
    })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(
      ['admin@a', 'admin@b'],
      { name: 'New User', email: 'new@user', cargo: 'APF', lotacao: 'SR/PF/DF' },
    )
  })

  it('swallows errors so the caller flow is never blocked', async () => {
    leanMock.mockResolvedValue([{ email: 'admin@a' }])
    sendMock.mockRejectedValueOnce(new Error('smtp down'))
    await expect(
      notifyAdminsOfNewRegistration({ name: 'X', email: 'x@y' }),
    ).resolves.toBeUndefined()
  })

  it('swallows errors from the admin lookup itself', async () => {
    leanMock.mockRejectedValueOnce(new Error('db down'))
    await expect(
      notifyAdminsOfNewRegistration({ name: 'X', email: 'x@y' }),
    ).resolves.toBeUndefined()
    expect(sendMock).not.toHaveBeenCalled()
  })
})
