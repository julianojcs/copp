'use client'

import {
	forwardRef,
	useImperativeHandle,
	useRef,
	useState,
	type ComponentPropsWithoutRef,
} from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { EmojiPicker } from './emoji-picker'

type TextareaBaseProps = Omit<
	ComponentPropsWithoutRef<typeof Textarea>,
	'onChange' | 'value' | 'defaultValue'
>

export interface EmojiTextareaProps extends TextareaBaseProps {
	value: string
	onValueChange: (next: string) => void
}

/**
 * Textarea with a popover emoji picker anchored to the bottom-right.
 *
 * Inserts the picked emoji at the current cursor position (or at the
 * end if the textarea hasn't been focused yet), and keeps the caret
 * positioned right after the inserted character.
 */
export const EmojiTextarea = forwardRef<HTMLTextAreaElement, EmojiTextareaProps>(
	function EmojiTextarea(
		{ value, onValueChange, className, disabled, ...rest },
		forwardedRef,
	) {
		const innerRef = useRef<HTMLTextAreaElement | null>(null)
		const [open, setOpen] = useState(false)

		useImperativeHandle(
			forwardedRef,
			() => innerRef.current as HTMLTextAreaElement,
			[],
		)

		function insertEmoji(emoji: string) {
			const ta = innerRef.current
			if (!ta) {
				onValueChange(value + emoji)
				return
			}
			const start = ta.selectionStart ?? value.length
			const end = ta.selectionEnd ?? value.length
			const next = value.slice(0, start) + emoji + value.slice(end)
			onValueChange(next)
			// React re-renders before the cursor restore — schedule it so the
			// new value is in the DOM before we move the caret.
			queueMicrotask(() => {
				const after = innerRef.current
				if (!after) return
				after.focus()
				const pos = start + emoji.length
				after.setSelectionRange(pos, pos)
			})
			setOpen(false)
		}

		return (
			<div className="relative">
				<Textarea
					ref={innerRef}
					value={value}
					onChange={(e) => onValueChange(e.target.value)}
					disabled={disabled}
					className={['pr-10', className].filter(Boolean).join(' ')}
					{...rest}
				/>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute bottom-1 right-1 h-8 w-8"
							aria-label="Inserir emoji"
							disabled={disabled}
						>
							<Smile className="h-4 w-4" aria-hidden />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-80 p-3"
						align="end"
						sideOffset={6}
					>
						<EmojiPicker onSelect={insertEmoji} />
					</PopoverContent>
				</Popover>
			</div>
		)
	},
)
