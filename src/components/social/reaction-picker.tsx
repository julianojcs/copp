'use client'

import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
	REACTION_TYPES,
	type ReactionType,
	type ReactionTargetType,
} from '@/lib/constants'

const REACTION_LABELS: Record<ReactionType, { emoji: string; label: string }> = {
	like: { emoji: '👍', label: 'Curtir' },
	love: { emoji: '❤️', label: 'Amei' },
	laugh: { emoji: '😂', label: 'Haha' },
	wow: { emoji: '😮', label: 'Uau' },
	sad: { emoji: '😢', label: 'Triste' },
	angry: { emoji: '😡', label: 'Grr' },
}

export interface ReactionPickerProps {
	targetType: ReactionTargetType
	targetId: string
	/** Pre-fetched aggregated counts. If omitted, the picker fetches on mount. */
	initialCounts?: Record<ReactionType, number>
	/** Pre-fetched current user's reaction. If omitted, the picker fetches on mount. */
	initialUserReaction?: ReactionType | null
	className?: string
}

type CountsMap = Record<ReactionType, number>

function zeroCounts(): CountsMap {
	const counts = {} as CountsMap
	for (const t of Object.values(REACTION_TYPES)) counts[t] = 0
	return counts
}

function totalOf(counts: CountsMap): number {
	let total = 0
	for (const c of Object.values(counts)) total += c
	return total
}

/**
 * Polymorphic reaction widget — 6 Facebook-style emoji reactions on any
 * `targetType`/`targetId`. Optimistic update with rollback on failure.
 */
export function ReactionPicker({
	targetType,
	targetId,
	initialCounts,
	initialUserReaction,
	className,
}: ReactionPickerProps) {
	const [counts, setCounts] = useState<CountsMap>(
		initialCounts ?? zeroCounts(),
	)
	const [userReaction, setUserReaction] = useState<ReactionType | null>(
		initialUserReaction ?? null,
	)
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Fetch initial state when not provided.
	useEffect(() => {
		if (initialCounts !== undefined && initialUserReaction !== undefined) return
		let cancelled = false
		;(async () => {
			try {
				const url = `/api/reactions?targetType=${targetType}&targetId=${targetId}`
				const res = await fetch(url)
				if (!res.ok) return
				const body = (await res.json()) as {
					counts: CountsMap
					userReaction: ReactionType | null
				}
				if (cancelled) return
				setCounts(body.counts)
				setUserReaction(body.userReaction)
			} catch {
				/* swallow — non-critical */
			}
		})()
		return () => {
			cancelled = true
		}
	}, [targetType, targetId, initialCounts, initialUserReaction])

	// Close the popover on outside click.
	useEffect(() => {
		if (!open) return
		function onClickOutside(e: MouseEvent) {
			if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onClickOutside)
		return () => document.removeEventListener('mousedown', onClickOutside)
	}, [open])

	async function applyReaction(next: ReactionType | null) {
		if (loading) return
		setLoading(true)
		const previousCounts = counts
		const previousReaction = userReaction

		// Optimistic update.
		const optimisticCounts: CountsMap = { ...counts }
		if (previousReaction) optimisticCounts[previousReaction] -= 1
		if (next) optimisticCounts[next] += 1
		setCounts(optimisticCounts)
		setUserReaction(next)
		setOpen(false)

		try {
			if (next === null) {
				const res = await fetch('/api/reactions', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ targetType, targetId }),
				})
				if (!res.ok) throw new Error('delete failed')
			} else {
				const res = await fetch('/api/reactions', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ targetType, targetId, type: next }),
				})
				if (!res.ok) throw new Error('post failed')
			}
		} catch {
			// Rollback on failure.
			setCounts(previousCounts)
			setUserReaction(previousReaction)
		} finally {
			setLoading(false)
		}
	}

	const total = totalOf(counts)
	const triggerLabel = userReaction
		? REACTION_LABELS[userReaction].label
		: 'Reagir'
	const triggerEmoji = userReaction
		? REACTION_LABELS[userReaction].emoji
		: null

	return (
		<div
			ref={containerRef}
			className={cn('relative inline-flex items-center gap-2', className)}
		>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={userReaction ? `Reação atual: ${triggerLabel}` : 'Reagir'}
				className={cn(userReaction && 'text-primary')}
			>
				{triggerEmoji ? (
					<span className="mr-1 text-lg leading-none" aria-hidden>
						{triggerEmoji}
					</span>
				) : (
					<Smile className="mr-1 h-4 w-4" aria-hidden />
				)}
				<span>{triggerLabel}</span>
			</Button>

			{total > 0 && (
				<div
					className="flex items-center gap-1 text-xs text-muted-foreground"
					aria-label={`${total} reações no total`}
				>
					{Object.values(REACTION_TYPES).map((type) =>
						counts[type] > 0 ? (
							<span key={type} className="inline-flex items-center gap-0.5">
								<span aria-hidden>{REACTION_LABELS[type].emoji}</span>
								<span className="tabular-nums">{counts[type]}</span>
							</span>
						) : null,
					)}
				</div>
			)}

			{open && (
				<div
					role="menu"
					aria-label="Escolher reação"
					className="absolute bottom-full left-0 z-30 mb-2 flex items-center gap-1 rounded-full border bg-popover p-1 shadow-md"
				>
					{Object.values(REACTION_TYPES).map((type) => {
						const isCurrent = userReaction === type
						return (
							<button
								key={type}
								type="button"
								role="menuitem"
								aria-label={REACTION_LABELS[type].label}
								onClick={() => applyReaction(isCurrent ? null : type)}
								className={cn(
									'rounded-full p-1 text-xl transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
									isCurrent && 'scale-110 bg-muted',
								)}
								disabled={loading}
							>
								<span aria-hidden>{REACTION_LABELS[type].emoji}</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
