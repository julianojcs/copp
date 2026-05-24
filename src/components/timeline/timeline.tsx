'use client'

import { useEffect, useRef } from 'react'
import { Loader2, Newspaper } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageComposer } from '@/components/social/message-composer'
import { useTimeline } from '@/hooks/use-timeline'
import { NewMemberItem } from './items/new-member-item'
import { PhotoPostedItem } from './items/photo-posted-item'
import { PhotoCommentedItem } from './items/photo-commented-item'
import { MessagePostedItem } from './items/message-posted-item'
import { MessageCommentedItem } from './items/message-commented-item'
import type { TimelineEvent, MessagePostedEvent } from '@/lib/timeline-types'

function eventKey(e: TimelineEvent): string {
	return `${e.kind}:${e._id}`
}

function renderEvent(e: TimelineEvent) {
	switch (e.kind) {
		case 'new_member':
			return <NewMemberItem event={e} />
		case 'photo_posted':
			return <PhotoPostedItem event={e} />
		case 'photo_commented':
			return <PhotoCommentedItem event={e} />
		case 'message_posted':
			return <MessagePostedItem event={e} />
		case 'message_commented':
			return <MessageCommentedItem event={e} />
	}
}

/**
 * Main timeline surface for the dashboard. Composer at the top,
 * infinite-scrolled feed below. Uses IntersectionObserver to
 * auto-load the next page when the sentinel enters view.
 */
export function Timeline() {
	const { items, loading, error, loadNext, hasMore, prepend } = useTimeline()
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const node = sentinelRef.current
		if (!node) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting) && hasMore && !loading) {
					void loadNext()
				}
			},
			{ rootMargin: '200px' },
		)
		observer.observe(node)
		return () => observer.disconnect()
	}, [hasMore, loading, loadNext])

	function onComposed(created: unknown) {
		// MessageComposer doesn't have the populated author + counts shape
		// that the timeline event needs. Cast best-effort and prepend an
		// optimistic event; on next refresh the canonical payload arrives.
		const m = created as {
			_id: string
			body: string
			image?: { url: string; width: number; height: number } | null
			createdAt: string
			authorId: string
		}
		const optimistic: MessagePostedEvent = {
			kind: 'message_posted',
			_id: m._id,
			createdAt: m.createdAt,
			score: 0,
			author: {
				_id: m.authorId,
				name: 'Você',
				avatar: null,
				cargo: null,
				lotacaoSigla: null,
			},
			body: m.body,
			image: m.image ?? null,
			reactionsCount: 0,
			commentsCount: 0,
		}
		prepend(optimistic)
	}

	return (
		<div className="space-y-4">
			<MessageComposer onSuccess={onComposed} />

			{error && (
				<Card>
					<CardContent className="py-4 text-sm text-destructive">
						{error}{' '}
						<Button
							size="sm"
							variant="ghost"
							onClick={() => loadNext()}
							className="ml-2"
						>
							Tentar novamente
						</Button>
					</CardContent>
				</Card>
			)}

			{items.length === 0 && !loading && !error && (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<Newspaper className="h-8 w-8 text-muted-foreground" aria-hidden />
						<div className="space-y-1">
							<h2 className="text-base font-semibold">
								Nada por aqui ainda
							</h2>
							<p className="text-sm text-muted-foreground">
								Seja o primeiro a publicar algo para a turma.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<ul className="space-y-4" aria-label="Linha do tempo">
				{items.map((event) => (
					<li key={eventKey(event)}>{renderEvent(event)}</li>
				))}
			</ul>

			{loading && (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)}

			<div ref={sentinelRef} className="h-1" aria-hidden />

			{!hasMore && items.length > 0 && !loading && (
				<p className="py-4 text-center text-xs text-muted-foreground">
					Você chegou no fim. Volte mais tarde 👀
				</p>
			)}
		</div>
	)
}
