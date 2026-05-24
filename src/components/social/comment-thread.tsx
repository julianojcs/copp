'use client'

import { useEffect, useState } from 'react'
import { Loader2, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmojiTextarea } from './emoji-textarea'
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
	COMMENT_BODY_MAX_LENGTH,
	USER_ROLES,
	type CommentTargetType,
} from '@/lib/constants'

export interface CommentItem {
	_id: string
	body: string
	createdAt: string
	editedAt?: string | null
	deletedAt?: string | null
	/** May be null when the author was deleted (orphaned reference). */
	userId: {
		_id: string
		name?: string
		avatar?: string
		cargo?: string
		lotacaoSigla?: string
	} | null
}

const DELETED_AUTHOR_NAME = 'Usuário removido'

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

function getInitials(name: string | undefined | null) {
	if (!name) return '?'
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

/**
 * Polymorphic comment thread — lists comments, accepts new ones, and
 * lets the author edit/delete their own (admins can delete any).
 *
 * Edits happen inline (textarea replaces the body). Deletes go
 * through an AlertDialog confirmation and remove the item from the
 * local list (matching the default exclusion in `GET /api/comments`).
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
	const { data: session } = useSession()
	const [expanded, setExpanded] = useState(!defaultCollapsed)
	const [items, setItems] = useState<CommentItem[]>(initialItems ?? [])
	const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
	const [loading, setLoading] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [draft, setDraft] = useState('')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editDraft, setEditDraft] = useState('')
	const [savingEdit, setSavingEdit] = useState(false)

	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
	const [deleting, setDeleting] = useState(false)

	const viewerId = session?.user?.id
	const isAdmin = session?.user?.role === USER_ROLES.ADMIN

	async function loadPage(cursor: string | null = null) {
		setLoading(true)
		try {
			const params = new URLSearchParams({ targetType, targetId })
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

	async function submitNew(e: React.FormEvent) {
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

	function openEdit(c: CommentItem) {
		setEditingId(c._id)
		setEditDraft(c.body)
	}

	function cancelEdit() {
		setEditingId(null)
		setEditDraft('')
	}

	async function saveEdit() {
		if (!editingId || savingEdit) return
		const trimmed = editDraft.trim()
		if (!trimmed) return
		setSavingEdit(true)
		try {
			const res = await fetch(`/api/comments/${editingId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ body: trimmed }),
			})
			if (res.status === 410) {
				// Server says the comment is already deleted — drop it locally.
				setItems((prev) => prev.filter((c) => c._id !== editingId))
				cancelEdit()
				toast.error('Comentário foi removido e não pode ser editado')
				return
			}
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao salvar')
			}
			const now = new Date().toISOString()
			setItems((prev) =>
				prev.map((c) =>
					c._id === editingId
						? { ...c, body: trimmed, editedAt: now }
						: c,
				),
			)
			cancelEdit()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao salvar')
		} finally {
			setSavingEdit(false)
		}
	}

	async function confirmDelete() {
		if (!pendingDeleteId || deleting) return
		const id = pendingDeleteId
		setDeleting(true)
		try {
			const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao remover')
			}
			setItems((prev) => prev.filter((c) => c._id !== id))
			setPendingDeleteId(null)
			toast.success('Comentário removido')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao remover')
		} finally {
			setDeleting(false)
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
				{items.map((c) => {
					const author = c.userId
					const authorName = author?.name ?? DELETED_AUTHOR_NAME
					const isOwn = author ? viewerId === author._id : false
					const canEdit = isOwn
					const canDelete = isOwn || isAdmin
					const isEditing = editingId === c._id
					return (
						<li key={c._id} className="flex items-start gap-2">
							<Avatar className="h-8 w-8 shrink-0">
								<AvatarImage src={author?.avatar} alt={authorName} />
								<AvatarFallback>{getInitials(author?.name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<div className="relative rounded-lg bg-muted px-3 py-2 pr-8">
									<p className="text-xs font-semibold">{authorName}</p>
									{author?.cargo && (
										<p className="text-[10px] text-muted-foreground">
											{author.cargo}
											{author.lotacaoSigla
												? ` · ${author.lotacaoSigla}`
												: ''}
										</p>
									)}

									{isEditing ? (
										<div className="mt-2 space-y-2">
											<EmojiTextarea
												value={editDraft}
												onValueChange={setEditDraft}
												onKeyDown={(e) => {
													if (e.key === 'Escape') cancelEdit()
												}}
												maxLength={COMMENT_BODY_MAX_LENGTH}
												rows={2}
												disabled={savingEdit}
												aria-label="Editar comentário"
												autoFocus
											/>
											<div className="flex items-center justify-between text-xs">
												<span
													className="tabular-nums text-muted-foreground"
													aria-label={`${editDraft.length} de ${COMMENT_BODY_MAX_LENGTH} caracteres`}
												>
													{editDraft.length}/{COMMENT_BODY_MAX_LENGTH}
												</span>
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={cancelEdit}
														disabled={savingEdit}
													>
														Cancelar
													</Button>
													<Button
														type="button"
														size="sm"
														onClick={saveEdit}
														disabled={
															savingEdit || editDraft.trim().length === 0
														}
													>
														{savingEdit ? (
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
										<p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm">
											{c.body}
										</p>
									)}

									{!isEditing && (canEdit || canDelete) && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="absolute right-1 top-1 h-6 w-6"
													aria-label="Ações do comentário"
												>
													<MoreHorizontal
														className="h-3.5 w-3.5"
														aria-hidden
													/>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{canEdit && (
													<DropdownMenuItem onClick={() => openEdit(c)}>
														<Pencil className="mr-2 h-4 w-4" aria-hidden />
														Editar
													</DropdownMenuItem>
												)}
												{canDelete && (
													<DropdownMenuItem
														onClick={() => setPendingDeleteId(c._id)}
														className="text-destructive focus:text-destructive"
													>
														<Trash2 className="mr-2 h-4 w-4" aria-hidden />
														Excluir
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</div>
								<p className="mt-1 text-[10px] text-muted-foreground">
									{formatRelativeTime(c.createdAt)}
									{c.editedAt ? ' · editado' : ''}
								</p>
							</div>
						</li>
					)
				})}
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

			<form onSubmit={submitNew} className="mt-3 flex items-start gap-2">
				<div className="flex-1">
					<EmojiTextarea
						value={draft}
						onValueChange={setDraft}
						placeholder="Escreva um comentário…"
						rows={2}
						maxLength={COMMENT_BODY_MAX_LENGTH}
						disabled={submitting}
						aria-label="Escrever comentário"
					/>
				</div>
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

			<AlertDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação não pode ser desfeita. O comentário será removido da
							conversa.
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
		</div>
	)
}
