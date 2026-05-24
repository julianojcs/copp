// src/components/social/__tests__/comment-thread.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentThread, type CommentItem } from '@/components/social/comment-thread'

const fetchMock = vi.fn()
const useSessionMock = vi.fn()
const { toastMock } = vi.hoisted(() => ({
	toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('next-auth/react', () => ({
	useSession: () => useSessionMock(),
}))
vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
	useSessionMock.mockReset()
	toastMock.success.mockReset()
	toastMock.error.mockReset()
	useSessionMock.mockReturnValue({ data: null })
})

const VIEWER_ID = 'viewer'
const AUTHOR_ID = 'comment-author'
const ADMIN_ID = 'admin'

const ownComment: CommentItem = {
	_id: 'c-mine',
	body: 'Meu comentário',
	createdAt: new Date().toISOString(),
	editedAt: null,
	deletedAt: null,
	userId: {
		_id: VIEWER_ID,
		name: 'Eu Mesmo',
		cargo: 'APF',
		lotacaoSigla: 'SR/PF/DF',
	},
}

const otherComment: CommentItem = {
	_id: 'c-other',
	body: 'Comentário de outra pessoa',
	createdAt: new Date().toISOString(),
	editedAt: null,
	deletedAt: null,
	userId: {
		_id: AUTHOR_ID,
		name: 'Outro Colega',
		cargo: 'DPF',
		lotacaoSigla: 'SR/PF/SP',
	},
}

function renderExpanded(items: CommentItem[]) {
	return render(
		<CommentThread
			targetType="photo"
			targetId="p1"
			initialItems={items}
			defaultCollapsed={false}
		/>,
	)
}

describe('CommentThread — base behavior', () => {
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
		renderExpanded([ownComment])
		expect(screen.getByText('Eu Mesmo')).toBeTruthy()
		expect(screen.getByText('Meu comentário')).toBeTruthy()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('loads first page on expand when no initial items', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [ownComment], nextCursor: null }),
		})

		render(<CommentThread targetType="photo" targetId="p1" />)
		fireEvent.click(screen.getByRole('button', { name: /Expandir comentários/ }))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		expect(await screen.findByText('Meu comentário')).toBeTruthy()
	})

	it('posts a new comment and prepends it to the list', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				comment: { ...ownComment, _id: 'c-new', body: 'novo' },
			}),
		})

		renderExpanded([ownComment])
		fireEvent.change(screen.getByLabelText('Escrever comentário'), {
			target: { value: 'novo' },
		})
		fireEvent.click(screen.getByLabelText('Publicar comentário'))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		expect(await screen.findByText('novo')).toBeTruthy()
	})
})

describe('CommentThread — kebab menu visibility', () => {
	it('does not show a kebab on any comment when viewer is anonymous', () => {
		renderExpanded([ownComment, otherComment])
		expect(screen.queryAllByLabelText('Ações do comentário')).toHaveLength(0)
	})

	it('shows a kebab only on the viewer-authored comment for regular user', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: VIEWER_ID, role: 'aluno' } },
		})
		renderExpanded([ownComment, otherComment])
		expect(screen.getAllByLabelText('Ações do comentário')).toHaveLength(1)
	})

	it('shows a kebab on every comment for admin', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: ADMIN_ID, role: 'admin' } },
		})
		renderExpanded([ownComment, otherComment])
		expect(screen.getAllByLabelText('Ações do comentário')).toHaveLength(2)
	})

	it('admin viewing a comment they did not author sees ONLY Excluir', async () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: ADMIN_ID, role: 'admin' } },
		})
		renderExpanded([otherComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		expect(await screen.findByRole('menuitem', { name: /Excluir/ })).toBeTruthy()
		expect(screen.queryByRole('menuitem', { name: /Editar/ })).toBeNull()
	})

	it('author of the comment sees Editar AND Excluir', async () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: VIEWER_ID, role: 'aluno' } },
		})
		renderExpanded([ownComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		expect(await screen.findByRole('menuitem', { name: /Editar/ })).toBeTruthy()
		expect(screen.getByRole('menuitem', { name: /Excluir/ })).toBeTruthy()
	})
})

describe('CommentThread — edit flow', () => {
	beforeEach(() => {
		useSessionMock.mockReturnValue({
			data: { user: { id: VIEWER_ID, role: 'aluno' } },
		})
	})

	it('opens an inline textarea pre-filled with the comment body', async () => {
		renderExpanded([ownComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar comentário')
		expect((textarea as HTMLTextAreaElement).value).toBe(ownComment.body)
	})

	it('PATCHes the comment and updates body + editado flag in place', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

		renderExpanded([ownComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar comentário')
		fireEvent.change(textarea, { target: { value: '  texto novo  ' } })
		fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/comments/c-mine')
		expect((init as RequestInit).method).toBe('PATCH')
		const body = JSON.parse((init as { body: string }).body) as { body: string }
		expect(body.body).toBe('texto novo')

		await waitFor(() =>
			expect(screen.queryByLabelText('Editar comentário')).toBeNull(),
		)
		expect(screen.getByText('texto novo')).toBeTruthy()
		expect(screen.getByText(/editado/)).toBeTruthy()
	})

	it('on 410 drops the comment from the list', async () => {
		fetchMock.mockResolvedValueOnce({
			status: 410,
			ok: false,
			json: async () => ({ error: 'removido' }),
		})

		renderExpanded([ownComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar comentário')
		fireEvent.change(textarea, { target: { value: 'tentativa' } })
		fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

		await waitFor(() =>
			expect(screen.queryByText('Meu comentário')).toBeNull(),
		)
		expect(toastMock.error).toHaveBeenCalledWith(
			expect.stringMatching(/removido/),
		)
	})
})

describe('CommentThread — delete flow', () => {
	beforeEach(() => {
		useSessionMock.mockReturnValue({
			data: { user: { id: VIEWER_ID, role: 'aluno' } },
		})
	})

	it('opens the AlertDialog before deleting', async () => {
		renderExpanded([ownComment])
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Ações do comentário'))
		await user.click(await screen.findByRole('menuitem', { name: /Excluir/ }))
		expect(await screen.findByText('Excluir comentário?')).toBeTruthy()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('DELETEs the comment and removes it from the list on confirm', async () => {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

		renderExpanded([ownComment, otherComment])
		const user = userEvent.setup()
		// Open the kebab on the FIRST comment (the only one with a kebab for this viewer).
		await user.click(screen.getByLabelText('Ações do comentário'))
		await user.click(await screen.findByRole('menuitem', { name: /Excluir/ }))
		fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/comments/c-mine')
		expect((init as RequestInit).method).toBe('DELETE')

		await waitFor(() =>
			expect(screen.queryByText('Meu comentário')).toBeNull(),
		)
		// The other comment stays.
		expect(screen.getByText('Comentário de outra pessoa')).toBeTruthy()
	})
})
