// src/components/social/__tests__/comment-thread.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommentThread, type CommentItem } from '@/components/social/comment-thread'

const fetchMock = vi.fn()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
})

const sampleComment: CommentItem = {
	_id: 'c1',
	body: 'Show!',
	createdAt: new Date().toISOString(),
	editedAt: null,
	deletedAt: null,
	userId: {
		_id: 'u1',
		name: 'João Silva',
		avatar: undefined,
		cargo: 'APF',
		lotacaoSigla: 'SR/PF/DF',
	},
}

describe('CommentThread', () => {
	it('shows a "Comentar" toggle when collapsed with no comments', () => {
		render(<CommentThread targetType="photo" targetId="p1" totalCount={0} />)
		expect(screen.getByRole('button', { name: /Expandir comentários/ })).toBeTruthy()
		expect(screen.getByText('Comentar')).toBeTruthy()
	})

	it('shows the comment count when collapsed', () => {
		render(<CommentThread targetType="photo" targetId="p1" totalCount={5} />)
		expect(screen.getByText('5 comentários')).toBeTruthy()
	})

	it('renders pre-fetched items when expanded by default', () => {
		render(
			<CommentThread
				targetType="photo"
				targetId="p1"
				initialItems={[sampleComment]}
				defaultCollapsed={false}
			/>,
		)
		expect(screen.getByText('João Silva')).toBeTruthy()
		expect(screen.getByText('Show!')).toBeTruthy()
		// Network was NOT called because items were pre-fetched.
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('loads first page on expand when no initial items', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [sampleComment], nextCursor: null }),
		})

		render(<CommentThread targetType="photo" targetId="p1" />)
		fireEvent.click(screen.getByRole('button', { name: /Expandir comentários/ }))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [url] = fetchMock.mock.calls[0]
		expect(String(url)).toContain('/api/comments?targetType=photo&targetId=p1')
		expect(await screen.findByText('Show!')).toBeTruthy()
	})

	it('posts a new comment and prepends it to the list', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				comment: { ...sampleComment, _id: 'c2', body: 'Bom dia' },
			}),
		})

		render(
			<CommentThread
				targetType="message"
				targetId="m1"
				initialItems={[sampleComment]}
				defaultCollapsed={false}
			/>,
		)

		const textarea = screen.getByLabelText('Escrever comentário')
		fireEvent.change(textarea, { target: { value: 'Bom dia' } })
		const submit = screen.getByLabelText('Publicar comentário')
		fireEvent.click(submit)

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [, init] = fetchMock.mock.calls[0]
		expect((init as RequestInit).method).toBe('POST')
		const body = JSON.parse((init as { body: string }).body) as {
			targetType: string
			body: string
		}
		expect(body.targetType).toBe('message')
		expect(body.body).toBe('Bom dia')

		expect(await screen.findByText('Bom dia')).toBeTruthy()
	})
})
