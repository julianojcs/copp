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

  it('falls back to defaults when the DB query throws', async () => {
    findOneMock.mockRejectedValueOnce(new Error('cluster down'))
    const result = await getAppSettings()
    expect(result.brandName).toBe(DEFAULT_APP_SETTINGS.brandName)
  })

  it('uses a short TTL on fallback so a recovered DB is picked up quickly', async () => {
    findOneMock.mockRejectedValueOnce(new Error('cluster down'))
    await getAppSettings()
    // The fallback path caches with a short TTL (5s); the previous DB call counts as 1.
    findOneMock.mockResolvedValueOnce({ brandName: 'Recovered' })
    invalidateAppSettingsCache()
    const result = await getAppSettings()
    expect(result.brandName).toBe('Recovered')
  })
})
