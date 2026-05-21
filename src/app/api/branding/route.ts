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
