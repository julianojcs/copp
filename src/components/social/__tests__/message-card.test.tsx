// src/components/social/__tests__/message-card.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageCard, type MessageCardData } from '@/components/social/message-card'

const fetchMock = vi.fn()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
	// Default: ReactionPicker initial fetch (no initialCounts is passed)
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => ({
			counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
			total: 0,
			userReaction: null,
		}),
	})
})

const sampleMessage: MessageCardData = {
	_id: 'm1',
	body: 'Olha essa frase\ncom quebra de linha',
	createdAt: new Date().toISOString(),
	editedAt: null,
	deletedAt: null,
	author: {
		_id: 'u1',
		name: 'Maria Souza',
		avatar: undefined,
		cargo: 'DPF',
		lotacaoSigla: 'SR/PF/SP',
	},
	reactionsCount: 0,
	commentsCount: 2,
}

describe('MessageCard', () => {
	it('renders author header and body', () => {
		render(<MessageCard message={sampleMessage} />)
		expect(screen.getByText('Maria Souza')).toBeTruthy()
		expect(screen.getByText(/DPF.+SR\/PF\/SP/)).toBeTruthy()
		expect(screen.getByText(/Olha essa frase/)).toBeTruthy()
	})

	it('shows "X comentários" toggle reflecting commentsCount', () => {
		render(<MessageCard message={sampleMessage} />)
		expect(screen.getByText('2 comentários')).toBeTruthy()
	})

	it('marks edited messages with the "editado" suffix', () => {
		render(
			<MessageCard
				message={{
					...sampleMessage,
					editedAt: new Date().toISOString(),
				}}
			/>,
		)
		expect(screen.getByText(/editado/)).toBeTruthy()
	})

	it('soft-deleted messages render no footer (no reactions, no comments)', () => {
		render(
			<MessageCard
				message={{
					...sampleMessage,
					body: 'Mensagem removida',
					deletedAt: new Date().toISOString(),
				}}
			/>,
		)
		expect(screen.getByText('Mensagem removida')).toBeTruthy()
		// No reaction button or comment toggle rendered for deleted messages
		expect(screen.queryByRole('button', { name: /Reagir/ })).toBeNull()
		expect(screen.queryByRole('button', { name: /Expandir comentários/ })).toBeNull()
	})
})
