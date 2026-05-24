import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/date-utils'
import type { MessageCommentedEvent } from '@/lib/timeline-types'

interface Props {
	event: MessageCommentedEvent
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export function MessageCommentedItem({ event }: Props) {
	const { author, message, body } = event

	return (
		<Card aria-label="Comentário em mensagem">
			<CardContent className="flex items-start gap-3 py-4">
				<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
					<MessageCircle
						className="h-4 w-4 text-muted-foreground"
						aria-hidden
					/>
				</div>
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex items-start gap-3">
						<Link href={`/colleagues/${author._id}`}>
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={author.avatar ?? undefined}
									alt={author.name}
								/>
								<AvatarFallback>{getInitials(author.name)}</AvatarFallback>
							</Avatar>
						</Link>
						<div className="min-w-0 flex-1">
							<p className="text-sm">
								<Link
									href={`/colleagues/${author._id}`}
									className="font-semibold hover:underline"
								>
									{author.name}
								</Link>{' '}
								<span className="text-muted-foreground">
									comentou na mensagem de{' '}
								</span>
								<Link
									href={`/colleagues/${message.author._id}`}
									className="font-semibold hover:underline"
								>
									{message.author.name}
								</Link>
							</p>
							<p className="text-[10px] text-muted-foreground">
								{formatRelativeTime(event.createdAt)}
							</p>
						</div>
					</div>

					<div className="space-y-2 rounded-md bg-muted/40 p-2 text-sm">
						<p className="line-clamp-2 text-xs italic text-muted-foreground">
							&ldquo;{message.bodyExcerpt}&rdquo;
						</p>
						<p className="line-clamp-3">{body}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
