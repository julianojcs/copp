// src/components/social/__tests__/emoji-picker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { EmojiPicker } from '@/components/social/emoji-picker'

describe('EmojiPicker', () => {
	it('renders the search input and the category tabs', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		expect(screen.getByPlaceholderText('Pesquisar emoji')).toBeTruthy()
		// Tabs by their icon emoji (titles): smileys, gestures, hearts, objects, arrows, nature, food.
		expect(screen.getByTitle('Sorrisos e pessoas')).toBeTruthy()
		expect(screen.getByTitle('Corações e amor')).toBeTruthy()
		expect(screen.getByTitle('Comida e bebida')).toBeTruthy()
	})

	it('shows the smileys category by default', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		expect(screen.getByText('Sorrisos e pessoas')).toBeTruthy()
		// 😅 — "suor" is unique in the catalog (most "feliz" entries collide).
		expect(screen.getByRole('button', { name: 'suor' })).toBeTruthy()
	})

	it('switches categories when a tab is clicked', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		fireEvent.click(screen.getByTitle('Comida e bebida'))
		expect(screen.getByText('Comida e bebida')).toBeTruthy()
		expect(screen.getByRole('button', { name: 'maca' })).toBeTruthy()
	})

	it('calls onSelect with the emoji glyph when one is clicked', () => {
		const onSelect = vi.fn()
		render(<EmojiPicker onSelect={onSelect} />)
		fireEvent.click(screen.getByRole('button', { name: 'suor' }))
		expect(onSelect).toHaveBeenCalledWith('😅')
	})

	it('filters results across all categories by keyword search (pt-BR)', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		fireEvent.change(screen.getByPlaceholderText('Pesquisar emoji'), {
			target: { value: 'coracao' },
		})
		// "coração" results should include 💛 and 💔 from the hearts category.
		expect(screen.getByText('Corações e amor')).toBeTruthy()
		// The 🤍 emoji (white heart) has the keyword 'coracao'.
		const buttons = screen.getAllByRole('button')
		const hearts = buttons.filter((b) =>
			['❤️', '🧡', '💛', '💚', '💔'].some((emoji) => b.textContent === emoji),
		)
		expect(hearts.length).toBeGreaterThan(0)
	})

	it('shows an empty-results message when the search has no matches', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		fireEvent.change(screen.getByPlaceholderText('Pesquisar emoji'), {
			target: { value: 'zzzzzzz-no-match' },
		})
		expect(screen.getByText('Nenhum emoji encontrado')).toBeTruthy()
	})

	it('clearing the search restores the tabbed view', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		const search = screen.getByPlaceholderText('Pesquisar emoji')
		fireEvent.change(search, { target: { value: 'coracao' } })
		fireEvent.change(search, { target: { value: '' } })
		// Tab bar back, default smileys category active.
		expect(screen.getByTitle('Sorrisos e pessoas')).toBeTruthy()
		expect(screen.getByText('Sorrisos e pessoas')).toBeTruthy()
	})

	it('search is case-insensitive', () => {
		render(<EmojiPicker onSelect={vi.fn()} />)
		fireEvent.change(screen.getByPlaceholderText('Pesquisar emoji'), {
			target: { value: 'CoRaCaO' },
		})
		// Should still match the 'coracao' keywords (the picker lowercases the query).
		const buttons = screen.getAllByRole('button')
		const hasHeartEmoji = buttons.some((b) =>
			['❤️', '🧡', '💛', '💚'].some((emoji) => b.textContent === emoji),
		)
		expect(hasHeartEmoji).toBe(true)
		// And we should not see the empty-results placeholder.
		expect(within(document.body).queryByText('Nenhum emoji encontrado')).toBeNull()
	})
})
