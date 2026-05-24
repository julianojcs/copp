import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/date-utils'
import type { PhotoCommentedEvent } from '@/lib/timeline-types'

interface Props {
	event: PhotoCommentedEvent
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export function PhotoCommentedItem({ event }: Props) {
	const { author, photo, body } = event
	const imageSrc = photo.thumbnailUrl ?? photo.url

	return (
		<Card aria-label="Comentário em foto">
			<CardContent className="flex items-start gap-3 py-4">
				<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
					<MessageSquare
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
								<span className="text-muted-foreground">comentou em uma foto</span>
							</p>
							<p className="text-[10px] text-muted-foreground">
								{formatRelativeTime(event.createdAt)}
							</p>
						</div>
					</div>

					<div className="flex gap-3 rounded-md bg-muted/40 p-2">
						<Link
							href="/gallery"
							className="block flex-shrink-0 overflow-hidden rounded border"
							aria-label="Ver na galeria"
						>
							<Image
								src={imageSrc}
								alt={photo.title ?? 'Foto'}
								width={64}
								height={64}
								className="h-16 w-16 object-cover"
								sizes="64px"
							/>
						</Link>
						<p className="line-clamp-3 text-sm">{body}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
