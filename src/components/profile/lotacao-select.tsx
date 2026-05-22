'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface LotacaoOption {
	id: string
	sigla: string
	nome: string
	tipo: string
	uf: string
	cidade: string
}

interface LotacaoSelectProps {
	value: string | null | undefined
	onChange: (option: LotacaoOption | null) => void
	disabled?: boolean
	id?: string
	placeholder?: string
}

const DEBOUNCE_MS = 200

export function LotacaoSelect({
	value,
	onChange,
	disabled = false,
	id,
	placeholder = 'Selecione a lotação',
}: LotacaoSelectProps) {
	const [open, setOpen] = useState(false)
	const [allOptions, setAllOptions] = useState<LotacaoOption[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const fetchedRef = useRef(false)

	const ensureLoaded = useCallback(async () => {
		if (fetchedRef.current) return
		fetchedRef.current = true
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/lotacoes?limit=200')
			if (!res.ok) {
				setError('Falha ao carregar lotações.')
				return
			}
			const data = (await res.json()) as { items: LotacaoOption[] }
			setAllOptions(data.items)
		} catch {
			setError('Falha ao consultar lotações.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		ensureLoaded()
	}, [ensureLoaded])

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), DEBOUNCE_MS)
		return () => clearTimeout(t)
	}, [query])

	const selected = useMemo(
		() => allOptions.find((o) => o.id === value) || null,
		[allOptions, value],
	)

	const filtered = useMemo(() => {
		if (!debouncedQuery) return allOptions
		return allOptions.filter(
			(o) =>
				o.sigla.toLowerCase().includes(debouncedQuery) ||
				o.nome.toLowerCase().includes(debouncedQuery) ||
				o.uf.toLowerCase().includes(debouncedQuery) ||
				o.cidade.toLowerCase().includes(debouncedQuery),
		)
	}, [allOptions, debouncedQuery])

	const handleSelect = (option: LotacaoOption) => {
		onChange(option)
		setOpen(false)
		setQuery('')
	}

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation()
		onChange(null)
	}

	return (
		<>
			<Button
				type="button"
				id={id}
				variant="outline"
				className="w-full justify-between font-normal"
				disabled={disabled}
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={open}
			>
				<span className="flex items-center gap-2 truncate">
					<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
					<span className="truncate text-left">
						{selected ? (
							<>
								<span className="font-medium">{selected.sigla}</span>
								<span className="text-muted-foreground"> — {selected.nome}</span>
							</>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</span>
				</span>
				{selected && !disabled && (
					<span
						role="button"
						tabIndex={0}
						aria-label="Limpar lotação"
						className="ml-2 rounded-sm p-0.5 hover:bg-muted"
						onClick={handleClear}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent)
						}}
					>
						<X className="h-3.5 w-3.5" />
					</span>
				)}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-140 max-h-[80vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Selecionar lotação</DialogTitle>
					</DialogHeader>

					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							autoFocus
							placeholder="Buscar por sigla, nome, UF ou cidade…"
							className="pl-10"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-10 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin mr-2" />
							Carregando lotações…
						</div>
					) : error ? (
						<div className="text-sm text-destructive py-6 text-center">{error}</div>
					) : filtered.length === 0 ? (
						<div className="text-sm text-muted-foreground py-10 text-center">
							Nenhuma lotação encontrada para &quot;{query}&quot;.
						</div>
					) : (
						<ul className="overflow-y-auto -mx-2 px-2 py-1 flex-1" role="listbox">
							{filtered.map((o) => {
								const isSelected = o.id === value
								return (
									<li key={o.id}>
										<button
											type="button"
											role="option"
											aria-selected={isSelected}
											className={cn(
												'w-full flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
												isSelected && 'bg-muted',
											)}
											onClick={() => handleSelect(o)}
										>
											<Check
												className={cn(
													'h-4 w-4 mt-0.5 shrink-0',
													isSelected ? 'opacity-100 text-primary' : 'opacity-0',
												)}
											/>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">{o.sigla}</span>
													<span className="text-xs text-muted-foreground">{o.uf}</span>
												</div>
												<div className="text-xs text-muted-foreground truncate">{o.nome}</div>
												<div className="text-[11px] text-muted-foreground/80">
													{o.tipo} · {o.cidade}
												</div>
											</div>
										</button>
									</li>
								)
							})}
						</ul>
					)}

					<div className="text-xs text-muted-foreground pt-1 border-t">
						{filtered.length} de {allOptions.length} lotações
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
