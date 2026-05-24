// src/components/social/__tests__/reaction-picker.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReactionPicker } from '@/components/social/reaction-picker'

const fetchMock = vi.fn()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
})

const initialCounts = {
	like: 2,
	love: 1,
	laugh: 0,
	wow: 0,
	sad: 0,
	angry: 0,
} as const

describe('ReactionPicker', () => {
	it('renders "Reagir" when user has no current reaction', () => {
		render(
			<ReactionPicker
				targetType="photo"
				targetId="x"
				initialCounts={initialCounts}
				initialUserReaction={null}
			/>,
		)
		expect(screen.getByRole('button', { name: /Reagir/ })).toBeTruthy()
	})

	it('renders the current reaction label when user has reacted', () => {
		render(
			<ReactionPicker
				targetType="photo"
				targetId="x"
				initialCounts={initialCounts}
				initialUserReaction="love"
			/>,
		)
		expect(screen.getByRole('button', { name: /Reação atual: Amei/ })).toBeTruthy()
	})

	it('renders aggregated counts as visible chips', () => {
		render(
			<ReactionPicker
				targetType="photo"
				targetId="x"
				initialCounts={initialCounts}
				initialUserReaction={null}
			/>,
		)
		expect(screen.getByLabelText(/3 reações no total/)).toBeTruthy()
	})

	it('toggles the emoji menu and POSTs when an emoji is clicked', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

		render(
			<ReactionPicker
				targetType="message"
				targetId="m1"
				initialCounts={initialCounts}
				initialUserReaction={null}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: /Reagir/ }))
		const loveButton = screen.getByRole('menuitem', { name: 'Amei' })
		fireEvent.click(loveButton)

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/reactions')
		expect((init as RequestInit).method).toBe('POST')
		const body = JSON.parse((init as { body: string }).body) as {
			targetType: string
			targetId: string
			type: string
		}
		expect(body).toEqual({ targetType: 'message', targetId: 'm1', type: 'love' })
	})

	it('DELETEs when the current emoji is clicked again', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

		render(
			<ReactionPicker
				targetType="photo"
				targetId="p1"
				initialCounts={initialCounts}
				initialUserReaction="like"
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: /Reação atual: Curtir/ }))
		const likeButton = screen.getByRole('menuitem', { name: 'Curtir' })
		fireEvent.click(likeButton)

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [, init] = fetchMock.mock.calls[0]
		expect((init as RequestInit).method).toBe('DELETE')
	})
})
