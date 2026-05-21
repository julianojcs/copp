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
