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
      !u.lotacaoId ||
      (u.role !== 'admin' && !u.cargo)

    if (missingBasics) router.push('/profile?complete=1')
  }, [session, status, pathname, router])
}
