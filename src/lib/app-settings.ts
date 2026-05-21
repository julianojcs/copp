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
