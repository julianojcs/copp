// src/components/gallery/__tests__/photo-card.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoCard } from '@/components/gallery/photo-card'

const fetchMock = vi.fn()
const useSessionMock = vi.fn()

vi.mock('next-auth/react', () => ({
	useSession: () => useSessionMock(),
}))

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
	useSessionMock.mockReset()
	useSessionMock.mockReturnValue({
		data: { user: { id: 'viewer', role: 'aluno' } },
	})
	// Default: ReactionPicker initial fetch (counts + userReaction).
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => ({
			counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
			total: 0,
			userReaction: null,
		}),
	})
})

const samplePhoto = {
	_id: 'photo-1',
	url: 'https://x/full.jpg',
	thumbnailUrl: 'https://x/thumb.jpg',
	title: 'Foto da turma',
	description: 'Confraternização',
	location: 'Brasília',
	takenAt: '2026-05-20T00:00:00Z',
	uploadedBy: {
		_id: 'author-1',
		name: 'Maria Souza',
		avatar: undefined,
	},
	createdAt: '2026-05-20T00:00:00Z',
}

describe('PhotoCard (after #12 retrofit)', () => {
	it('renders metadata: title, description, location, author', () => {
		render(<PhotoCard photo={samplePhoto} />)
		expect(screen.getByText('Foto da turma')).toBeTruthy()
		expect(screen.getByText('Confraternização')).toBeTruthy()
		expect(screen.getByText(/Brasília/)).toBeTruthy()
		expect(screen.getByText('Maria Souza')).toBeTruthy()
	})

	it('no longer renders a heart-style like button', () => {
		render(<PhotoCard photo={samplePhoto} />)
		// The legacy markup had a button with aria-label "Like photo" / "Unlike photo".
		expect(screen.queryByLabelText(/Like photo|Unlike photo/i)).toBeNull()
	})

	it('renders the polymorphic ReactionPicker', () => {
		render(<PhotoCard photo={samplePhoto} />)
		// At least one Reagir button (card + dialog use the same widget).
		expect(screen.getAllByRole('button', { name: /Reagir/ }).length).toBeGreaterThan(0)
	})

	it('renders a collapsed CommentThread toggle by default', () => {
		render(<PhotoCard photo={samplePhoto} />)
		expect(
			screen.getAllByRole('button', { name: /Expandir comentários/ }).length,
		).toBeGreaterThan(0)
	})

	it('does NOT render the delete button when caller is neither owner nor admin', () => {
		const onDelete = vi.fn()
		render(<PhotoCard photo={samplePhoto} onDelete={onDelete} />)
		expect(screen.queryByLabelText('Excluir foto')).toBeNull()
	})

	it('renders the delete button for the photo owner', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: samplePhoto.uploadedBy._id, role: 'aluno' } },
		})
		const onDelete = vi.fn()
		render(<PhotoCard photo={samplePhoto} onDelete={onDelete} />)
		expect(screen.getByLabelText('Excluir foto')).toBeTruthy()
	})

	it('renders the delete button for admins on any photo', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: 'admin', role: 'admin' } },
		})
		render(<PhotoCard photo={samplePhoto} onDelete={vi.fn()} />)
		expect(screen.getByLabelText('Excluir foto')).toBeTruthy()
	})

	it('confirms and calls onDelete from the delete dialog', async () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: samplePhoto.uploadedBy._id, role: 'aluno' } },
		})
		const onDelete = vi.fn().mockResolvedValue(undefined)
		render(<PhotoCard photo={samplePhoto} onDelete={onDelete} />)

		fireEvent.click(screen.getByLabelText('Excluir foto'))
		expect(screen.getByText('Excluir foto?')).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
		await waitFor(() => expect(onDelete).toHaveBeenCalledWith(samplePhoto._id))
	})
})
