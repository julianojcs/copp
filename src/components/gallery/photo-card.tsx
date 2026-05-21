'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin, Calendar, Trash2, User } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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
		likes: PhotoUser[]
		createdAt: string
	}
	onLike: (photoId: string) => void
	onDelete?: (photoId: string) => void
}

export function PhotoCard({ photo, onLike, onDelete }: PhotoCardProps) {
	const { data: session } = useSession()
	const [isLiking, setIsLiking] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [showFullImage, setShowFullImage] = useState(false)

	const isLiked = photo.likes.some((like) => like._id === session?.user?.id)
	const isOwner = photo.uploadedBy._id === session?.user?.id
	const isCoordinator = session?.user?.role === 'coordenador' || session?.user?.role === 'admin'

	const handleLike = async () => {
		if (isLiking) return
		setIsLiking(true)

		try {
			await onLike(photo._id)
		} finally {
			setIsLiking(false)
		}
	}

	const handleDelete = async () => {
		if (isDeleting) return
		setIsDeleting(true)

		try {
			await onDelete?.(photo._id)
			setShowDeleteDialog(false)
		} finally {
			setIsDeleting(false)
		}
	}

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
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
						aria-label={`View ${photo.title || 'photo'}`}
					>
						<Image
							src={photo.thumbnailUrl || photo.url}
							alt={photo.title || 'Trip photo'}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-105"
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
					</div>

					<div className="p-4 space-y-3">
						<div className="flex items-center justify-between">
							<Link
								href={`/colleagues/${photo.uploadedBy._id}`}
								className="flex items-center gap-2 group/user"
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
								<span className="text-sm font-medium group-hover/user:text-primary transition-colors">
									{photo.uploadedBy.name}
								</span>
							</Link>

							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={handleLike}
									disabled={isLiking}
									aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
								>
									<Heart
										className={cn(
											'h-4 w-4 transition-all',
											isLiked && 'fill-red-500 text-red-500'
										)}
									/>
								</Button>
								<span className="text-sm text-muted-foreground">
									{photo.likes.length}
								</span>

								{(isOwner || isCoordinator) && onDelete && (
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-destructive hover:text-destructive"
										onClick={() => setShowDeleteDialog(true)}
										aria-label="Delete photo"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>

						{photo.title && (
							<p className="font-medium text-sm line-clamp-1">{photo.title}</p>
						)}

						{photo.description && (
							<p className="text-sm text-muted-foreground line-clamp-2">
								{photo.description}
							</p>
						)}

						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							{photo.location && (
								<span className="flex items-center gap-1">
									<MapPin className="h-3 w-3" />
									{photo.location}
								</span>
							)}
							{photo.takenAt && (
								<span className="flex items-center gap-1">
									<Calendar className="h-3 w-3" />
									{formatDate(photo.takenAt)}
								</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Full Image Dialog */}
			<Dialog open={showFullImage} onOpenChange={setShowFullImage}>
				<DialogContent className="max-w-4xl p-0 overflow-hidden">
					<DialogVisuallyHidden>
						<DialogTitle>{photo.title || 'Trip photo'}</DialogTitle>
					</DialogVisuallyHidden>
					<div className="relative aspect-video">
						<Image
							src={photo.url}
							alt={photo.title || 'Trip photo'}
							fill
							className="object-contain"
							sizes="100vw"
						/>
					</div>
					<div className="p-4 space-y-2">
						<div className="flex items-center gap-2">
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={photo.uploadedBy.avatar}
									alt={photo.uploadedBy.name}
								/>
								<AvatarFallback>
									<User className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<span className="font-medium">{photo.uploadedBy.name}</span>
						</div>
						{photo.title && <h3 className="font-semibold">{photo.title}</h3>}
						{photo.description && (
							<p className="text-muted-foreground">{photo.description}</p>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete photo?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete the
							photo from the gallery.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
