'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmojiTextarea } from './emoji-textarea'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogVisuallyHidden,
} from '@/components/ui/dialog'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/date-utils'
import {
	MESSAGE_BODY_MAX_LENGTH,
	REACTION_TARGET_TYPES,
	USER_ROLES,
	type ReactionType,
} from '@/lib/constants'
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

const DELETED_BODY_MASK = 'Mensagem removida'

/**
 * Renders a single message post. The author owns the source-of-truth
 * for body/deletion via the kebab menu in the header; admins can
 * delete (but not rewrite). Edits happen inline; deletes go through
 * an AlertDialog confirmation.
 */
export function MessageCard({ message, className }: MessageCardProps) {
	const { data: session } = useSession()
	const [state, setState] = useState({
		body: message.body,
		editedAt: message.editedAt ?? null,
		deletedAt: message.deletedAt ?? null,
	})

	const [imageOpen, setImageOpen] = useState(false)
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(message.body)
	const [saving, setSaving] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [deleting, setDeleting] = useState(false)

	const viewerId = session?.user?.id
	const viewerRole = session?.user?.role
	const isOwner = viewerId === message.author._id
	const isAdmin = viewerRole === USER_ROLES.ADMIN
	const isDeleted = Boolean(state.deletedAt)

	const canEdit = isOwner && !isDeleted
	const canDelete = (isOwner || isAdmin) && !isDeleted
	const canActOnMessage = canEdit || canDelete

	function openEdit() {
		setDraft(state.body)
		setEditing(true)
	}

	function cancelEdit() {
		setEditing(false)
		setDraft(state.body)
	}

	async function saveEdit() {
		const trimmed = draft.trim()
		if (!trimmed || saving) return
		setSaving(true)
		try {
			const res = await fetch(`/api/messages/${message._id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ body: trimmed }),
			})
			if (res.status === 410) {
				setState((s) => ({ ...s, deletedAt: new Date().toISOString() }))
				setEditing(false)
				toast.error('Mensagem foi removida e não pode ser editada')
				return
			}
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao salvar mensagem')
			}
			setState((s) => ({
				...s,
				body: trimmed,
				editedAt: new Date().toISOString(),
			}))
			setEditing(false)
			toast.success('Mensagem atualizada')
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
		} finally {
			setSaving(false)
		}
	}

	async function confirmDelete() {
		if (deleting) return
		setDeleting(true)
		try {
			const res = await fetch(`/api/messages/${message._id}`, {
				method: 'DELETE',
			})
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao remover')
			}
			setState((s) => ({ ...s, deletedAt: new Date().toISOString() }))
			setDeleteOpen(false)
			toast.success('Mensagem removida')
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Falha ao remover')
		} finally {
			setDeleting(false)
		}
	}

	return (
		<Card className={className} aria-label="Mensagem">
			<CardContent className="space-y-3 pt-6">
				<header className="flex items-start gap-3">
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
							{[message.author.cargo, message.author.lotacaoSigla]
								.filter(Boolean)
								.join(' · ')}
						</p>
						<p className="text-[10px] text-muted-foreground">
							{formatRelativeTime(message.createdAt)}
							{state.editedAt ? ' · editado' : ''}
						</p>
					</div>
					{canActOnMessage && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									aria-label="Ações da mensagem"
								>
									<MoreHorizontal className="h-4 w-4" aria-hidden />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{canEdit && (
									<DropdownMenuItem onClick={openEdit}>
										<Pencil className="mr-2 h-4 w-4" aria-hidden />
										Editar
									</DropdownMenuItem>
								)}
								{canDelete && (
									<DropdownMenuItem
										onClick={() => setDeleteOpen(true)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="mr-2 h-4 w-4" aria-hidden />
										Excluir
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</header>

				{editing ? (
					<div className="space-y-2">
						<EmojiTextarea
							value={draft}
							onValueChange={setDraft}
							onKeyDown={(e) => {
								if (e.key === 'Escape') cancelEdit()
							}}
							maxLength={MESSAGE_BODY_MAX_LENGTH}
							rows={3}
							disabled={saving}
							aria-label="Editar mensagem"
							autoFocus
						/>
						<div className="flex items-center justify-between text-xs">
							<span
								className="tabular-nums text-muted-foreground"
								aria-label={`${draft.length} de ${MESSAGE_BODY_MAX_LENGTH} caracteres`}
							>
								{draft.length}/{MESSAGE_BODY_MAX_LENGTH}
							</span>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={cancelEdit}
									disabled={saving}
								>
									Cancelar
								</Button>
								<Button
									type="button"
									size="sm"
									onClick={saveEdit}
									disabled={saving || draft.trim().length === 0}
								>
									{saving ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Salvando…
										</>
									) : (
										'Salvar'
									)}
								</Button>
							</div>
						</div>
					</div>
				) : (
					<p
						className={
							isDeleted
								? 'text-sm italic text-muted-foreground'
								: 'whitespace-pre-wrap wrap-break-word text-sm'
						}
					>
						{isDeleted ? DELETED_BODY_MASK : state.body}
					</p>
				)}

				{!isDeleted && !editing && message.image && (
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

				{!isDeleted && !editing && (
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

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação não pode ser desfeita. A mensagem será marcada como
							removida na timeline.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault()
								void confirmDelete()
							}}
							disabled={deleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Excluindo…
								</>
							) : (
								'Excluir'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	)
}
