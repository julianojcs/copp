'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { IBGECity } from '@/hooks/use-ibge'

export interface CitySelectProps {
	value: string
	onValueChange: (city: string) => void
	cities: IBGECity[]
	loading?: boolean
	disabled?: boolean
	placeholder?: string
	id?: string
	/** Used to display the resolution state when no UF is selected yet */
	hasState?: boolean
}

export function CitySelect({
	value,
	onValueChange,
	cities,
	loading = false,
	disabled = false,
	placeholder = 'Selecione a cidade',
	id,
	hasState = true,
}: CitySelectProps) {
	const isDisabled = disabled || loading || !hasState || cities.length === 0

	const computedPlaceholder = !hasState
		? 'Selecione o estado primeiro'
		: loading
			? 'Carregando cidades…'
			: placeholder

	return (
		<Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
			<SelectTrigger id={id}>
				<SelectValue placeholder={computedPlaceholder} />
			</SelectTrigger>
			<SelectContent>
				{cities.map((c) => (
					<SelectItem key={c.id} value={c.nome}>
						{c.nome}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
