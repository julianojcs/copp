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
