// src/components/social/__tests__/emoji-textarea.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmojiTextarea } from '@/components/social/emoji-textarea'

function Harness({ initialValue = '' }: { initialValue?: string }) {
	const [value, setValue] = useState(initialValue)
	return (
		<EmojiTextarea
			value={value}
			onValueChange={setValue}
			aria-label="Conteúdo"
			rows={3}
		/>
	)
}

describe('EmojiTextarea', () => {
	it('renders the textarea with the configured aria-label', () => {
		render(<Harness />)
		expect(screen.getByLabelText('Conteúdo')).toBeTruthy()
	})

	it('renders an emoji trigger button anchored next to the textarea', () => {
		render(<Harness />)
		expect(screen.getByLabelText('Inserir emoji')).toBeTruthy()
	})

	it('propagates typed input via onValueChange', () => {
		render(<Harness />)
		const textarea = screen.getByLabelText('Conteúdo') as HTMLTextAreaElement
		fireEvent.change(textarea, { target: { value: 'oi' } })
		expect(textarea.value).toBe('oi')
	})

	it('opens the picker and inserts the chosen emoji at cursor position', async () => {
		render(<Harness initialValue="oi mundo" />)
		const textarea = screen.getByLabelText('Conteúdo') as HTMLTextAreaElement

		// Place the cursor between "oi" and " mundo" (index 2).
		textarea.focus()
		textarea.setSelectionRange(2, 2)

		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Inserir emoji'))
		const emoji = await screen.findByRole('button', { name: 'suor' })
		await user.click(emoji)

		await waitFor(() => expect(textarea.value).toBe('oi😅 mundo'))
	})

	it('appends the emoji when the textarea has not been focused yet', async () => {
		render(<Harness initialValue="hi" />)
		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Inserir emoji'))
		const emoji = await screen.findByRole('button', { name: 'suor' })
		await user.click(emoji)

		const textarea = screen.getByLabelText('Conteúdo') as HTMLTextAreaElement
		await waitFor(() => expect(textarea.value).toBe('hi😅'))
	})

	it('replaces the selection when one is active', async () => {
		render(<Harness initialValue="oi MUNDO bla" />)
		const textarea = screen.getByLabelText('Conteúdo') as HTMLTextAreaElement
		textarea.focus()
		textarea.setSelectionRange(3, 8) // selects "MUNDO"

		const user = userEvent.setup()
		await user.click(screen.getByLabelText('Inserir emoji'))
		await user.click(await screen.findByRole('button', { name: 'suor' }))

		await waitFor(() => expect(textarea.value).toBe('oi 😅 bla'))
	})

	it('disables both textarea and trigger when `disabled` is true', () => {
		render(
			<EmojiTextarea
				value=""
				onValueChange={vi.fn()}
				aria-label="X"
				disabled
			/>,
		)
		expect(
			(screen.getByLabelText('X') as HTMLTextAreaElement).disabled,
		).toBe(true)
		expect(
			(screen.getByLabelText('Inserir emoji') as HTMLButtonElement).disabled,
		).toBe(true)
	})

	it('respects the maxLength attribute passed through', () => {
		render(
			<EmojiTextarea
				value=""
				onValueChange={vi.fn()}
				aria-label="X"
				maxLength={50}
			/>,
		)
		expect(screen.getByLabelText('X').getAttribute('maxlength')).toBe('50')
	})
})
