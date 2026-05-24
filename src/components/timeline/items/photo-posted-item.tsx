'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/date-utils'
import { REACTION_TARGET_TYPES } from '@/lib/constants'
import { ReactionPicker } from '@/components/social/reaction-picker'
import { CommentThread } from '@/components/social/comment-thread'
import type { PhotoPostedEvent } from '@/lib/timeline-types'

interface Props {
	event: PhotoPostedEvent
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export function PhotoPostedItem({ event }: Props) {
	const { author, photo } = event
	const imageSrc = photo.thumbnailUrl ?? photo.url

	return (
		<Card aria-label="Foto publicada">
			<CardContent className="space-y-3 pt-6">
				<header className="flex items-center gap-3">
					<Link
						href={`/colleagues/${author._id}`}
						aria-label={`Perfil de ${author.name}`}
					>
						<Avatar>
							<AvatarImage src={author.avatar ?? undefined} alt={author.name} />
							<AvatarFallback>{getInitials(author.name)}</AvatarFallback>
						</Avatar>
					</Link>
					<div className="min-w-0 flex-1">
						<Link
							href={`/colleagues/${author._id}`}
							className="block text-sm font-semibold hover:underline"
						>
							{author.name}
						</Link>
						<p className="truncate text-xs text-muted-foreground">
							{[author.cargo, author.lotacaoSigla].filter(Boolean).join(' · ')}
						</p>
						<p className="text-[10px] text-muted-foreground">
							publicou uma foto · {formatRelativeTime(event.createdAt)}
						</p>
					</div>
				</header>

				<Link
					href="/gallery"
					className="block overflow-hidden rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="Abrir galeria"
				>
					<Image
						src={imageSrc}
						alt={photo.title ?? 'Foto da turma'}
						width={1200}
						height={800}
						className="h-auto w-full"
						sizes="(max-width: 768px) 100vw, 600px"
					/>
				</Link>

				{(photo.title || photo.description || photo.location) && (
					<div className="space-y-1 text-sm">
						{photo.title && <p className="font-medium">{photo.title}</p>}
						{photo.description && (
							<p className="text-muted-foreground">{photo.description}</p>
						)}
						{photo.location && (
							<p className="text-xs text-muted-foreground">📍 {photo.location}</p>
						)}
					</div>
				)}

				<footer className="flex flex-col gap-2 border-t pt-3">
					<ReactionPicker
						targetType={REACTION_TARGET_TYPES.PHOTO}
						targetId={photo._id}
					/>
					<CommentThread
						targetType={REACTION_TARGET_TYPES.PHOTO}
						targetId={photo._id}
						totalCount={event.commentsCount}
					/>
				</footer>
			</CardContent>
		</Card>
	)
}
