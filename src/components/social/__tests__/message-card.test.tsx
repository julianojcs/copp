// src/components/social/__tests__/message-card.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageCard, type MessageCardData } from '@/components/social/message-card'

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
	// Default: ReactionPicker initial fetch when no `initialUserReaction` is passed.
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => ({
			counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
			total: 0,
			userReaction: null,
		}),
	})
})

const AUTHOR_ID = 'author-1'
const ADMIN_ID = 'admin-1'

const sampleMessage: MessageCardData = {
	_id: 'm1',
	body: 'Olha essa frase\ncom quebra de linha',
	createdAt: new Date().toISOString(),
	editedAt: null,
	deletedAt: null,
	author: {
		_id: AUTHOR_ID,
		name: 'Maria Souza',
		avatar: undefined,
		cargo: 'DPF',
		lotacaoSigla: 'SR/PF/SP',
	},
	reactionsCount: 0,
	commentsCount: 2,
}

async function openKebab() {
	const user = userEvent.setup()
	await user.click(screen.getByLabelText('Ações da mensagem'))
	return user
}

describe('MessageCard — base rendering', () => {
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
				message={{ ...sampleMessage, editedAt: new Date().toISOString() }}
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
		expect(screen.queryByRole('button', { name: /Reagir/ })).toBeNull()
		expect(screen.queryByRole('button', { name: /Expandir comentários/ })).toBeNull()
	})
})

describe('MessageCard — kebab menu visibility', () => {
	it('hides the kebab when viewer is neither author nor admin', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: 'stranger', role: 'aluno' } },
		})
		render(<MessageCard message={sampleMessage} />)
		expect(screen.queryByLabelText('Ações da mensagem')).toBeNull()
	})

	it('shows the kebab to the author with Editar AND Excluir', async () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: AUTHOR_ID, role: 'aluno' } },
		})
		render(<MessageCard message={sampleMessage} />)
		await openKebab()
		expect(await screen.findByRole('menuitem', { name: /Editar/ })).toBeTruthy()
		expect(screen.getByRole('menuitem', { name: /Excluir/ })).toBeTruthy()
	})

	it('shows ONLY Excluir to admin who is not the author', async () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: ADMIN_ID, role: 'admin' } },
		})
		render(<MessageCard message={sampleMessage} />)
		await openKebab()
		expect(await screen.findByRole('menuitem', { name: /Excluir/ })).toBeTruthy()
		expect(screen.queryByRole('menuitem', { name: /Editar/ })).toBeNull()
	})

	it('hides the kebab on soft-deleted messages even for author', () => {
		useSessionMock.mockReturnValue({
			data: { user: { id: AUTHOR_ID, role: 'aluno' } },
		})
		render(
			<MessageCard
				message={{ ...sampleMessage, deletedAt: new Date().toISOString() }}
			/>,
		)
		expect(screen.queryByLabelText('Ações da mensagem')).toBeNull()
	})
})

describe('MessageCard — edit flow', () => {
	beforeEach(() => {
		useSessionMock.mockReturnValue({
			data: { user: { id: AUTHOR_ID, role: 'aluno' } },
		})
	})

	it('opens an inline textarea pre-filled with the current body', async () => {
		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar mensagem')
		expect((textarea as HTMLTextAreaElement).value).toBe(sampleMessage.body)
	})

	it('cancels back to read mode without writing', async () => {
		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar mensagem')
		fireEvent.change(textarea, { target: { value: 'corrigido' } })
		fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }))
		expect(screen.queryByLabelText('Editar mensagem')).toBeNull()
		expect(screen.getByText(/Olha essa frase/)).toBeTruthy()
		// `fetch` was called once for ReactionPicker init; no PATCH.
		const patches = fetchMock.mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
		)
		expect(patches).toHaveLength(0)
	})

	it('sends PATCH with trimmed body and reflects the new body + editado flag', async () => {
		fetchMock.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === 'PATCH') {
				return Promise.resolve({
					ok: true,
					json: async () => ({ message: { _id: 'm1', body: 'novo conteúdo' } }),
				} as Response)
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({
					counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
					total: 0,
					userReaction: null,
				}),
			} as Response)
		})

		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar mensagem')
		fireEvent.change(textarea, { target: { value: '  novo conteúdo  ' } })
		fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

		await waitFor(() => {
			const patchCalls = fetchMock.mock.calls.filter(
				([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
			)
			expect(patchCalls).toHaveLength(1)
		})
		const patchCall = fetchMock.mock.calls.find(
			([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
		)
		expect(patchCall?.[0]).toBe('/api/messages/m1')
		const body = JSON.parse(
			(patchCall?.[1] as { body: string }).body,
		) as { body: string }
		expect(body.body).toBe('novo conteúdo')

		await waitFor(() =>
			expect(screen.queryByLabelText('Editar mensagem')).toBeNull(),
		)
		expect(screen.getByText('novo conteúdo')).toBeTruthy()
		expect(screen.getByText(/editado/)).toBeTruthy()
	})

	it('on 410 marks the message as removed locally', async () => {
		// First call would be the ReactionPicker init; we want the PATCH itself
		// to return 410, so override only once with mockResolvedValueOnce.
		fetchMock.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === 'PATCH') {
				return Promise.resolve({
					status: 410,
					ok: false,
					json: async () => ({ error: 'removida' }),
				} as Response)
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({
					counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
					total: 0,
					userReaction: null,
				}),
			} as Response)
		})

		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
		const textarea = await screen.findByLabelText('Editar mensagem')
		fireEvent.change(textarea, { target: { value: 'qualquer coisa' } })
		fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith(
				expect.stringMatching(/removida/),
			),
		)
		expect(screen.getByText('Mensagem removida')).toBeTruthy()
	})
})

describe('MessageCard — delete flow', () => {
	beforeEach(() => {
		useSessionMock.mockReturnValue({
			data: { user: { id: AUTHOR_ID, role: 'aluno' } },
		})
	})

	it('opens the AlertDialog before deleting', async () => {
		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Excluir/ }))
		expect(await screen.findByText('Excluir mensagem?')).toBeTruthy()
		const deleteCalls = fetchMock.mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
		)
		expect(deleteCalls).toHaveLength(0)
	})

	it('issues DELETE and transitions the card to the removed state on success', async () => {
		fetchMock.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === 'DELETE') {
				return Promise.resolve({
					ok: true,
					json: async () => ({ success: true }),
				} as Response)
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({
					counts: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
					total: 0,
					userReaction: null,
				}),
			} as Response)
		})

		render(<MessageCard message={sampleMessage} />)
		const user = await openKebab()
		await user.click(await screen.findByRole('menuitem', { name: /Excluir/ }))
		fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))

		await waitFor(() => {
			const deleteCalls = fetchMock.mock.calls.filter(
				([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
			)
			expect(deleteCalls).toHaveLength(1)
		})
		const deleteCall = fetchMock.mock.calls.find(
			([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
		)
		expect(deleteCall?.[0]).toBe('/api/messages/m1')

		await waitFor(() =>
			expect(screen.getByText('Mensagem removida')).toBeTruthy(),
		)
		expect(screen.queryByRole('button', { name: /Reagir/ })).toBeNull()
	})
})
