'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { IBGEState } from '@/hooks/use-ibge'

export interface StateSelectProps {
	value: string
	onValueChange: (uf: string) => void
	states: IBGEState[]
	loading?: boolean
	disabled?: boolean
	placeholder?: string
	id?: string
}

export function StateSelect({
	value,
	onValueChange,
	states,
	loading = false,
	disabled = false,
	placeholder = 'Selecione o estado',
	id,
}: StateSelectProps) {
	const isDisabled = disabled || loading || states.length === 0

	return (
		<Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
			<SelectTrigger id={id}>
				<SelectValue placeholder={loading ? 'Carregando estados…' : placeholder} />
			</SelectTrigger>
			<SelectContent>
				{states.map((s) => (
					<SelectItem key={s.id} value={s.sigla}>
						{s.nome}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
