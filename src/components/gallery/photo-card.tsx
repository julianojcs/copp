'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogVisuallyHidden,
} from '@/components/ui/dialog'
import { REACTION_TARGET_TYPES, USER_ROLES } from '@/lib/constants'
import { formatDateOnly } from '@/lib/date-utils'
import { ReactionPicker } from '@/components/social/reaction-picker'
import { CommentThread } from '@/components/social/comment-thread'

interface PhotoUser {
	_id: string
	name: string
	avatar?: string
}

interface PhotoCardProps {
	photo: {
		_id: string
		url: string
		thumbnailUrl?: string
		title?: string
		description?: string
		location?: string
		takenAt?: string
		uploadedBy: PhotoUser
		createdAt: string
	}
	onDelete?: (photoId: string) => void
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export function PhotoCard({ photo, onDelete }: PhotoCardProps) {
	const { data: session } = useSession()
	const [isDeleting, setIsDeleting] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [showFullImage, setShowFullImage] = useState(false)

	const isOwner = photo.uploadedBy._id === session?.user?.id
	const isCoordinator =
		session?.user?.role === USER_ROLES.COORDENADOR ||
		session?.user?.role === USER_ROLES.ADMIN

	async function handleDelete() {
		if (isDeleting) return
		setIsDeleting(true)
		try {
			await onDelete?.(photo._id)
			setShowDeleteDialog(false)
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<>
			<Card className="group overflow-hidden">
				<CardContent className="p-0">
					<div
						className="relative aspect-square cursor-pointer overflow-hidden"
						onClick={() => setShowFullImage(true)}
						onKeyDown={(e) => e.key === 'Enter' && setShowFullImage(true)}
						tabIndex={0}
						role="button"
						aria-label={`Abrir ${photo.title || 'foto'} em tela cheia`}
					>
						<Image
							src={photo.thumbnailUrl || photo.url}
							alt={photo.title || 'Foto da turma'}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-105"
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						/>
						<div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
					</div>

					<div className="space-y-3 p-4">
						<div className="flex items-center justify-between">
							<Link
								href={`/colleagues/${photo.uploadedBy._id}`}
								className="group/user flex items-center gap-2"
							>
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={photo.uploadedBy.avatar}
										alt={photo.uploadedBy.name}
									/>
									<AvatarFallback>
										{getInitials(photo.uploadedBy.name)}
									</AvatarFallback>
								</Avatar>
								<span className="text-sm font-medium transition-colors group-hover/user:text-primary">
									{photo.uploadedBy.name}
								</span>
							</Link>

							{(isOwner || isCoordinator) && onDelete && (
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-destructive hover:text-destructive"
									onClick={() => setShowDeleteDialog(true)}
									aria-label="Excluir foto"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>

						{photo.title && (
							<p className="line-clamp-1 text-sm font-medium">{photo.title}</p>
						)}

						{photo.description && (
							<p className="line-clamp-2 text-sm text-muted-foreground">
								{photo.description}
							</p>
						)}

						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							{photo.location && (
								<span className="flex items-center gap-1">
									<MapPin className="h-3 w-3" aria-hidden />
									{photo.location}
								</span>
							)}
							{photo.takenAt && (
								<span className="flex items-center gap-1">
									<Calendar className="h-3 w-3" aria-hidden />
									{formatDateOnly(photo.takenAt, {
										day: '2-digit',
										month: 'short',
										year: 'numeric',
									})}
								</span>
							)}
						</div>

						<div className="space-y-2 border-t pt-3">
							<ReactionPicker
								targetType={REACTION_TARGET_TYPES.PHOTO}
								targetId={photo._id}
							/>
							<CommentThread
								targetType={REACTION_TARGET_TYPES.PHOTO}
								targetId={photo._id}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Full Image Dialog */}
			<Dialog open={showFullImage} onOpenChange={setShowFullImage}>
				<DialogContent className="max-w-4xl overflow-hidden p-0">
					<DialogVisuallyHidden>
						<DialogTitle>{photo.title || 'Foto'}</DialogTitle>
					</DialogVisuallyHidden>
					<div className="relative aspect-video">
						<Image
							src={photo.url}
							alt={photo.title || 'Foto'}
							fill
							className="object-contain"
							sizes="100vw"
						/>
					</div>
					<div className="space-y-3 p-4">
						<div className="flex items-center gap-2">
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={photo.uploadedBy.avatar}
									alt={photo.uploadedBy.name}
								/>
								<AvatarFallback>
									{getInitials(photo.uploadedBy.name)}
								</AvatarFallback>
							</Avatar>
							<span className="font-medium">{photo.uploadedBy.name}</span>
						</div>
						{photo.title && <h3 className="font-semibold">{photo.title}</h3>}
						{photo.description && (
							<p className="text-muted-foreground">{photo.description}</p>
						)}
						<div className="space-y-3 border-t pt-3">
							<ReactionPicker
								targetType={REACTION_TARGET_TYPES.PHOTO}
								targetId={photo._id}
							/>
							<CommentThread
								targetType={REACTION_TARGET_TYPES.PHOTO}
								targetId={photo._id}
								defaultCollapsed={false}
							/>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Excluir foto?</DialogTitle>
						<DialogDescription>
							Esta ação não pode ser desfeita. A foto será removida permanentemente
							da galeria.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
							disabled={isDeleting}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? 'Excluindo…' : 'Excluir'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
