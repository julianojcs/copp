'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TimelineEvent, TimelinePage } from '@/lib/timeline-types'

interface UseTimelineState {
	items: TimelineEvent[]
	nextCursor: string | null
	loading: boolean
	error: string | null
	loadNext: () => Promise<void>
	prepend: (item: TimelineEvent) => void
	hasMore: boolean
}

/**
 * Client-side timeline driver:
 * - loads the first page on mount
 * - paginates via `loadNext()`
 * - exposes `prepend()` so the composer can insert a freshly-posted
 *   message at the top without a refetch
 */
export function useTimeline(): UseTimelineState {
	const [items, setItems] = useState<TimelineEvent[]>([])
	const [nextCursor, setNextCursor] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [initialized, setInitialized] = useState(false)

	const load = useCallback(async (cursor: string | null) => {
		setLoading(true)
		setError(null)
		try {
			const params = new URLSearchParams()
			if (cursor) params.set('cursor', cursor)
			const res = await fetch(`/api/timeline?${params.toString()}`)
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao carregar timeline')
			}
			const body = (await res.json()) as TimelinePage
			setItems((prev) => (cursor ? [...prev, ...body.items] : body.items))
			setNextCursor(body.nextCursor)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Erro inesperado')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (!initialized) {
			setInitialized(true)
			void load(null)
		}
	}, [initialized, load])

	const loadNext = useCallback(async () => {
		if (loading || !nextCursor) return
		await load(nextCursor)
	}, [load, loading, nextCursor])

	const prepend = useCallback((item: TimelineEvent) => {
		setItems((prev) => [item, ...prev])
	}, [])

	return {
		items,
		nextCursor,
		loading,
		error,
		loadNext,
		prepend,
		hasMore: nextCursor !== null,
	}
}
