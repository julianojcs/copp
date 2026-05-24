// src/components/timeline/__tests__/timeline.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Timeline } from '@/components/timeline/timeline'
import type { TimelineEvent } from '@/lib/timeline-types'

const fetchMock = vi.fn()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
	// IntersectionObserver shim — happy-dom doesn't ship one.
	class IO {
		observe = vi.fn()
		disconnect = vi.fn()
		unobserve = vi.fn()
		takeRecords = vi.fn().mockReturnValue([])
		root = null
		rootMargin = ''
		thresholds: number[] = []
	}
	vi.stubGlobal(
		'IntersectionObserver',
		IO as unknown as typeof IntersectionObserver,
	)
})

function timelineResponse(items: TimelineEvent[], nextCursor: string | null = null) {
	return {
		ok: true,
		json: async () => ({ items, nextCursor }),
	}
}

const sampleNewMember: TimelineEvent = {
	kind: 'new_member',
	_id: 'u1',
	createdAt: new Date().toISOString(),
	score: 0,
	user: { _id: 'u1', name: 'João Silva', cargo: 'APF', lotacaoSigla: 'SR/PF/DF' },
}

const samplePhoto: TimelineEvent = {
	kind: 'photo_posted',
	_id: 'p1',
	createdAt: new Date().toISOString(),
	score: 0.5,
	author: { _id: 'u2', name: 'Maria', cargo: 'DPF', lotacaoSigla: 'SR/PF/SP' },
	photo: {
		_id: 'photoX',
		url: 'https://x/p.jpg',
		thumbnailUrl: 'https://x/p-thumb.jpg',
		title: 'Foto top',
		description: null,
		location: null,
	},
	reactionsCount: 2,
	commentsCount: 1,
}

describe('<Timeline>', () => {
	it('shows an empty state when there are no events', async () => {
		fetchMock.mockResolvedValueOnce(timelineResponse([], null))
		render(<Timeline />)
		expect(await screen.findByText(/Nada por aqui ainda/)).toBeTruthy()
	})

	it('renders new_member item from the first page', async () => {
		fetchMock.mockResolvedValueOnce(timelineResponse([sampleNewMember], null))
		render(<Timeline />)
		expect(await screen.findByText('João Silva')).toBeTruthy()
		expect(screen.getByText(/entrou na turma/)).toBeTruthy()
	})

	it('renders photo_posted item with title', async () => {
		fetchMock.mockResolvedValueOnce(timelineResponse([samplePhoto], null))
		render(<Timeline />)
		expect(await screen.findByText('Foto top')).toBeTruthy()
		expect(screen.getByText('Maria')).toBeTruthy()
	})

	it('shows error state when the request fails', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'Falha de rede' }),
		})
		render(<Timeline />)
		await waitFor(() =>
			expect(screen.getByText(/Falha de rede/)).toBeTruthy(),
		)
	})

	it('renders a "fim da lista" hint when no more pages are available', async () => {
		fetchMock.mockResolvedValueOnce(timelineResponse([sampleNewMember], null))
		render(<Timeline />)
		await screen.findByText('João Silva')
		expect(screen.getByText(/Você chegou no fim/)).toBeTruthy()
	})
})
