'use client'

import { useEffect, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime } from '@/lib/date-utils'
import {
	COMMENT_BODY_MAX_LENGTH,
	type CommentTargetType,
} from '@/lib/constants'

export interface CommentItem {
	_id: string
	body: string
	createdAt: string
	editedAt?: string | null
	deletedAt?: string | null
	userId: {
		_id: string
		name: string
		avatar?: string
		cargo?: string
		lotacaoSigla?: string
	}
}

export interface CommentThreadProps {
	targetType: CommentTargetType
	targetId: string
	/** Pre-fetched first page. If omitted, the thread loads on mount when expanded. */
	initialItems?: CommentItem[]
	initialNextCursor?: string | null
	/** Total comments — shown on the toggle when collapsed. */
	totalCount?: number
	defaultCollapsed?: boolean
	className?: string
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

/**
 * Polymorphic comment thread — lists comments and accepts new ones.
 *
 * Starts collapsed by default to keep cards compact; expanding loads
 * the first page if one wasn't pre-fetched. Soft-deleted comments
 * are shown with their body masked by the server.
 */
export function CommentThread({
	targetType,
	targetId,
	initialItems,
	initialNextCursor = null,
	totalCount,
	defaultCollapsed = true,
	className,
}: CommentThreadProps) {
	const [expanded, setExpanded] = useState(!defaultCollapsed)
	const [items, setItems] = useState<CommentItem[]>(initialItems ?? [])
	const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
	const [loading, setLoading] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [draft, setDraft] = useState('')

	async function loadPage(cursor: string | null = null) {
		setLoading(true)
		try {
			const params = new URLSearchParams({
				targetType,
				targetId,
			})
			if (cursor) params.set('cursor', cursor)
			const res = await fetch(`/api/comments?${params.toString()}`)
			if (!res.ok) throw new Error('load failed')
			const body = (await res.json()) as {
				items: CommentItem[]
				nextCursor: string | null
			}
			setItems((prev) => (cursor ? [...prev, ...body.items] : body.items))
			setNextCursor(body.nextCursor)
		} catch {
			toast.error('Não foi possível carregar os comentários')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (expanded && initialItems === undefined && items.length === 0) {
			loadPage(null)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expanded])

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		const body = draft.trim()
		if (!body || submitting) return
		setSubmitting(true)
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ targetType, targetId, body }),
			})
			if (!res.ok) {
				const err = (await res.json()) as { error?: string }
				throw new Error(err.error ?? 'Falha ao enviar')
			}
			const result = (await res.json()) as { comment: CommentItem }
			setItems((prev) => [result.comment, ...prev])
			setDraft('')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao enviar')
		} finally {
			setSubmitting(false)
		}
	}

	const visibleCount = totalCount ?? items.length

	if (!expanded) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setExpanded(true)}
				className={className}
				aria-label="Expandir comentários"
			>
				{visibleCount === 0
					? 'Comentar'
					: visibleCount === 1
						? '1 comentário'
						: `${visibleCount} comentários`}
			</Button>
		)
	}

	return (
		<div className={className} aria-live="polite">
			<ul className="flex flex-col gap-3">
				{items.length === 0 && !loading && (
					<li className="text-sm text-muted-foreground">
						Nenhum comentário ainda. Seja o primeiro!
					</li>
				)}
				{items.map((c) => (
					<li key={c._id} className="flex items-start gap-2">
						<Avatar className="h-8 w-8 flex-shrink-0">
							<AvatarImage src={c.userId.avatar} alt={c.userId.name} />
							<AvatarFallback>{getInitials(c.userId.name)}</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<div className="rounded-lg bg-muted px-3 py-2">
								<p className="text-xs font-semibold">{c.userId.name}</p>
								{c.userId.cargo && (
									<p className="text-[10px] text-muted-foreground">
										{c.userId.cargo}
										{c.userId.lotacaoSigla
											? ` · ${c.userId.lotacaoSigla}`
											: ''}
									</p>
								)}
								<p className="mt-1 whitespace-pre-wrap break-words text-sm">
									{c.body}
								</p>
							</div>
							<p className="mt-1 text-[10px] text-muted-foreground">
								{formatRelativeTime(c.createdAt)}
								{c.editedAt ? ' · editado' : ''}
							</p>
						</div>
					</li>
				))}
			</ul>

			{nextCursor && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => loadPage(nextCursor)}
					disabled={loading}
					className="mt-2"
				>
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
						</>
					) : (
						'Ver mais comentários'
					)}
				</Button>
			)}

			<form onSubmit={submit} className="mt-3 flex items-start gap-2">
				<Textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Escreva um comentário…"
					rows={2}
					maxLength={COMMENT_BODY_MAX_LENGTH}
					disabled={submitting}
					aria-label="Escrever comentário"
				/>
				<Button
					type="submit"
					size="icon"
					disabled={submitting || draft.trim().length === 0}
					aria-label="Publicar comentário"
				>
					{submitting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</Button>
			</form>
		</div>
	)
}
