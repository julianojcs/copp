// src/components/social/__tests__/message-composer.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageComposer } from '@/components/social/message-composer'

const fetchMock = vi.fn()
const { toastMock } = vi.hoisted(() => ({
	toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	fetchMock.mockReset()
	toastMock.success.mockReset()
	toastMock.error.mockReset()
})

describe('MessageComposer', () => {
	it('renders the composer with disabled publish button when empty', () => {
		render(<MessageComposer />)
		const publish = screen.getByLabelText('Publicar mensagem')
		expect(publish.hasAttribute('disabled')).toBe(true)
	})

	it('enables the publish button once text is entered', () => {
		render(<MessageComposer />)
		const textarea = screen.getByLabelText('Conteúdo da mensagem')
		fireEvent.change(textarea, { target: { value: 'Oi turma' } })
		const publish = screen.getByLabelText('Publicar mensagem')
		expect(publish.hasAttribute('disabled')).toBe(false)
	})

	it('shows a live character counter', () => {
		render(<MessageComposer />)
		expect(screen.getByText('0/2000')).toBeTruthy()
		fireEvent.change(screen.getByLabelText('Conteúdo da mensagem'), {
			target: { value: 'abcd' },
		})
		expect(screen.getByText('4/2000')).toBeTruthy()
	})

	it('keeps publish disabled when only whitespace is entered', () => {
		render(<MessageComposer />)
		fireEvent.change(screen.getByLabelText('Conteúdo da mensagem'), {
			target: { value: '   \n\t' },
		})
		expect(
			screen.getByLabelText('Publicar mensagem').hasAttribute('disabled'),
		).toBe(true)
	})

	it('submits trimmed body via POST /api/messages and clears the form on success', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: { _id: 'm1', body: 'Bom dia' } }),
		})

		const onSuccess = vi.fn()
		render(<MessageComposer onSuccess={onSuccess} />)
		const textarea = screen.getByLabelText('Conteúdo da mensagem')
		fireEvent.change(textarea, { target: { value: '  Bom dia  ' } })
		fireEvent.click(screen.getByLabelText('Publicar mensagem'))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/messages')
		const body = JSON.parse((init as { body: string }).body) as { body: string }
		expect(body.body).toBe('Bom dia')

		await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
		expect(onSuccess).toHaveBeenCalledWith({ _id: 'm1', body: 'Bom dia' })

		// Form cleared.
		expect((textarea as HTMLTextAreaElement).value).toBe('')
	})

	it('surfaces server error via toast and does not clear the form', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'Mensagem inválida' }),
		})

		render(<MessageComposer />)
		const textarea = screen.getByLabelText('Conteúdo da mensagem')
		fireEvent.change(textarea, { target: { value: 'Conteúdo' } })
		fireEvent.click(screen.getByLabelText('Publicar mensagem'))

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith('Mensagem inválida'),
		)
		// Form NOT cleared on error.
		expect((textarea as HTMLTextAreaElement).value).toBe('Conteúdo')
	})
})
