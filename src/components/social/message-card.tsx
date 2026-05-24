'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogVisuallyHidden,
} from '@/components/ui/dialog'
import { formatRelativeTime } from '@/lib/date-utils'
import { REACTION_TARGET_TYPES, type ReactionType } from '@/lib/constants'
import { ReactionPicker } from './reaction-picker'
import { CommentThread } from './comment-thread'

export interface MessageCardData {
	_id: string
	body: string
	image?: {
		url: string
		width: number
		height: number
	} | null
	createdAt: string
	editedAt?: string | null
	deletedAt?: string | null
	author: {
		_id: string
		name: string
		avatar?: string
		cargo?: string
		lotacaoSigla?: string
	}
	reactionsCount?: number
	commentsCount?: number
	/** Pre-fetched current user's reaction (optional). */
	userReaction?: ReactionType | null
}

interface MessageCardProps {
	message: MessageCardData
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
 * Renders a single message post — header (author + time), body,
 * optional image (clickable for full-screen modal), and a footer
 * with the polymorphic ReactionPicker + collapsible CommentThread.
 *
 * For soft-deleted messages, body is masked by the server and the
 * card shows a discreet placeholder.
 */
export function MessageCard({ message, className }: MessageCardProps) {
	const [imageOpen, setImageOpen] = useState(false)
	const isDeleted = Boolean(message.deletedAt)

	return (
		<Card className={className} aria-label="Mensagem">
			<CardContent className="space-y-3 pt-6">
				<header className="flex items-center gap-3">
					<Link
						href={`/colleagues/${message.author._id}`}
						aria-label={`Perfil de ${message.author.name}`}
					>
						<Avatar>
							<AvatarImage
								src={message.author.avatar}
								alt={message.author.name}
							/>
							<AvatarFallback>{getInitials(message.author.name)}</AvatarFallback>
						</Avatar>
					</Link>
					<div className="min-w-0 flex-1">
						<Link
							href={`/colleagues/${message.author._id}`}
							className="block text-sm font-semibold hover:underline"
						>
							{message.author.name}
						</Link>
						<p className="truncate text-xs text-muted-foreground">
							{[
								message.author.cargo,
								message.author.lotacaoSigla,
							]
								.filter(Boolean)
								.join(' · ')}
						</p>
						<p className="text-[10px] text-muted-foreground">
							{formatRelativeTime(message.createdAt)}
							{message.editedAt ? ' · editado' : ''}
						</p>
					</div>
				</header>

				<p
					className={
						isDeleted
							? 'text-sm italic text-muted-foreground'
							: 'whitespace-pre-wrap break-words text-sm'
					}
				>
					{message.body}
				</p>

				{!isDeleted && message.image && (
					<>
						<button
							type="button"
							onClick={() => setImageOpen(true)}
							className="block w-full overflow-hidden rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label="Abrir imagem em tela cheia"
						>
							<Image
								src={message.image.url}
								alt={`Imagem anexada à mensagem de ${message.author.name}`}
								width={message.image.width}
								height={message.image.height}
								className="h-auto w-full"
								sizes="(max-width: 768px) 100vw, 600px"
							/>
						</button>
						<Dialog open={imageOpen} onOpenChange={setImageOpen}>
							<DialogContent className="max-w-4xl p-2">
								<DialogVisuallyHidden>
									<DialogTitle>
										Imagem em tela cheia anexada à mensagem
									</DialogTitle>
								</DialogVisuallyHidden>
								<Image
									src={message.image.url}
									alt={`Imagem anexada à mensagem de ${message.author.name}`}
									width={message.image.width}
									height={message.image.height}
									className="h-auto w-full rounded"
									sizes="100vw"
								/>
							</DialogContent>
						</Dialog>
					</>
				)}

				{!isDeleted && (
					<footer className="flex flex-col gap-2 border-t pt-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<ReactionPicker
								targetType={REACTION_TARGET_TYPES.MESSAGE}
								targetId={message._id}
								initialUserReaction={message.userReaction}
							/>
						</div>
						<CommentThread
							targetType={REACTION_TARGET_TYPES.MESSAGE}
							targetId={message._id}
							totalCount={message.commentsCount}
						/>
					</footer>
				)}
			</CardContent>
		</Card>
	)
}
