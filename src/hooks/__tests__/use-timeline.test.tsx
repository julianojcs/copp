// src/hooks/__tests__/use-timeline.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTimeline } from '@/hooks/use-timeline'
import type { TimelineEvent } from '@/lib/timeline-types'

const fetchMock = vi.fn()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
})

function jsonResponse(items: TimelineEvent[], nextCursor: string | null = null) {
	return { ok: true, json: async () => ({ items, nextCursor }) }
}

const newMember: TimelineEvent = {
	kind: 'new_member',
	_id: 'u1',
	createdAt: new Date().toISOString(),
	score: 0,
	user: { _id: 'u1', name: 'Ana' },
}

const newMember2: TimelineEvent = {
	...newMember,
	_id: 'u2',
	user: { _id: 'u2', name: 'Bruno' },
}

describe('useTimeline', () => {
	it('loads the first page on mount and exposes items + hasMore', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse([newMember], 'cursor-x'))
		const { result } = renderHook(() => useTimeline())

		await waitFor(() => expect(result.current.items).toHaveLength(1))
		expect(result.current.hasMore).toBe(true)
		expect(result.current.nextCursor).toBe('cursor-x')
		expect(result.current.loading).toBe(false)
	})

	it('appends items via loadNext using the current cursor', async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse([newMember], 'cursor-x'))
			.mockResolvedValueOnce(jsonResponse([newMember2], null))

		const { result } = renderHook(() => useTimeline())
		await waitFor(() => expect(result.current.items).toHaveLength(1))

		await act(async () => {
			await result.current.loadNext()
		})

		expect(result.current.items.map((i) => i._id)).toEqual(['u1', 'u2'])
		expect(result.current.hasMore).toBe(false)

		// Second call must have used the cursor returned by the first.
		const secondCall = fetchMock.mock.calls[1][0] as string
		expect(secondCall).toContain('cursor=cursor-x')
	})

	it('loadNext is a no-op when there is no nextCursor', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse([newMember], null))

		const { result } = renderHook(() => useTimeline())
		await waitFor(() => expect(result.current.items).toHaveLength(1))

		await act(async () => {
			await result.current.loadNext()
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('surfaces error message from the API and keeps loading flag false', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'Erro de rede' }),
		})

		const { result } = renderHook(() => useTimeline())
		await waitFor(() => expect(result.current.error).toBe('Erro de rede'))
		expect(result.current.loading).toBe(false)
	})

	it('prepend inserts an item at the top without a fetch', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse([newMember], null))

		const { result } = renderHook(() => useTimeline())
		await waitFor(() => expect(result.current.items).toHaveLength(1))

		act(() => {
			result.current.prepend(newMember2)
		})

		expect(result.current.items[0]._id).toBe('u2')
		expect(result.current.items).toHaveLength(2)
		expect(fetchMock).toHaveBeenCalledTimes(1) // no second fetch
	})
})
