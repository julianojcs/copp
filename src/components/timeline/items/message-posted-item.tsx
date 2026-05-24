'use client'

import { MessageCard, type MessageCardData } from '@/components/social/message-card'
import type { MessagePostedEvent } from '@/lib/timeline-types'

interface Props {
	event: MessagePostedEvent
}

/**
 * Renders a `message_posted` event by adapting the timeline payload
 * to the `<MessageCard>` data shape — same component the messages
 * detail page (and #12 retrofit) will use.
 */
export function MessagePostedItem({ event }: Props) {
	const message: MessageCardData = {
		_id: event._id,
		body: event.body,
		image: event.image ?? null,
		createdAt: event.createdAt,
		editedAt: event.editedAt ?? null,
		deletedAt: event.deletedAt ?? null,
		author: {
			_id: event.author._id,
			name: event.author.name,
			avatar: event.author.avatar ?? undefined,
			cargo: event.author.cargo ?? undefined,
			lotacaoSigla: event.author.lotacaoSigla ?? undefined,
		},
		reactionsCount: event.reactionsCount,
		commentsCount: event.commentsCount,
	}
	return <MessageCard message={message} />
}
