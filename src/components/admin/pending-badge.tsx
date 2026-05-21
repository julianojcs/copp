'use client'

import { usePendingCount } from '@/hooks/use-pending-count'

export function PendingBadge() {
  const { count } = usePendingCount()
  if (!count) return null
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
      {count}
    </span>
  )
}
