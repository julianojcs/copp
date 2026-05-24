'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmojiTextarea } from './emoji-textarea'
import { MESSAGE_BODY_MAX_LENGTH } from '@/lib/constants'

interface UploadedImage {
	url: string
	publicId: string
	width: number
	height: number
}

interface MessageComposerProps {
	/** Callback fired with the created message after a successful submit. */
	onSuccess?: (message: unknown) => void
	className?: string
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB — matches the upload route

/**
 * Composer for a new message: text (required) + optional image attachment.
 *
 * Image is uploaded to Cloudinary via `/api/upload` and persisted by
 * sending its metadata along with the body to `/api/messages`.
 */
export function MessageComposer({ onSuccess, className }: MessageComposerProps) {
	const [body, setBody] = useState('')
	const [image, setImage] = useState<UploadedImage | null>(null)
	const [uploading, setUploading] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const charCount = body.length
	const canSubmit = body.trim().length > 0 && !submitting && !uploading

	async function handleFile(file: File) {
		if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
			toast.error('Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.')
			return
		}
		if (file.size > MAX_IMAGE_SIZE) {
			toast.error('Imagem muito grande. Tamanho máximo: 10 MB.')
			return
		}

		setUploading(true)
		try {
			const form = new FormData()
			form.append('file', file)
			const res = await fetch('/api/upload', { method: 'POST', body: form })
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha no upload')
			}
			const result = (await res.json()) as {
				url: string
				publicId: string
			}
			// width/height aren't returned by the upload endpoint — measure from the file.
			const dimensions = await readImageDimensions(file)
			setImage({
				url: result.url,
				publicId: result.publicId,
				width: dimensions.width,
				height: dimensions.height,
			})
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha no upload')
		} finally {
			setUploading(false)
		}
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault()
		const trimmed = body.trim()
		if (!trimmed) return
		setSubmitting(true)
		try {
			const res = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					body: trimmed,
					...(image ? { image } : {}),
				}),
			})
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(err.error ?? 'Falha ao publicar mensagem')
			}
			const result = (await res.json()) as { message: unknown }
			toast.success('Mensagem publicada')
			setBody('')
			setImage(null)
			onSuccess?.(result.message)
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Falha ao publicar mensagem',
			)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Card className={className}>
			<CardContent className="pt-6">
				<form onSubmit={submit} className="space-y-3">
					<EmojiTextarea
						value={body}
						onValueChange={setBody}
						placeholder="O que você quer compartilhar com a turma?"
						rows={3}
						maxLength={MESSAGE_BODY_MAX_LENGTH}
						disabled={submitting}
						aria-label="Conteúdo da mensagem"
					/>

					{image && (
						<div className="relative w-fit overflow-hidden rounded-md border">
							<Image
								src={image.url}
								alt="Pré-visualização da imagem anexada"
								width={image.width}
								height={image.height}
								className="h-auto max-h-64 w-auto"
								sizes="(max-width: 768px) 100vw, 400px"
							/>
							<Button
								type="button"
								size="icon"
								variant="secondary"
								className="absolute right-2 top-2 h-7 w-7"
								onClick={() => setImage(null)}
								disabled={submitting}
								aria-label="Remover imagem"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					)}

					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploading || submitting || image !== null}
								aria-label="Anexar imagem"
							>
								{uploading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Enviando…
									</>
								) : (
									<>
										<ImagePlus className="mr-2 h-4 w-4" />
										Anexar imagem
									</>
								)}
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept={ACCEPTED_IMAGE_TYPES.join(',')}
								onChange={(e) => {
									const f = e.target.files?.[0]
									if (f) handleFile(f)
									e.target.value = '' // allow re-selecting the same file
								}}
								className="hidden"
							/>
							<span
								className="text-xs text-muted-foreground tabular-nums"
								aria-label={`${charCount} de ${MESSAGE_BODY_MAX_LENGTH} caracteres`}
							>
								{charCount}/{MESSAGE_BODY_MAX_LENGTH}
							</span>
						</div>

						<Button
							type="submit"
							disabled={!canSubmit}
							aria-label="Publicar mensagem"
						>
							{submitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Publicando…
								</>
							) : (
								<>
									<Send className="mr-2 h-4 w-4" />
									Publicar
								</>
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}

function readImageDimensions(
	file: File,
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const img = new globalThis.Image()
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
			URL.revokeObjectURL(url)
		}
		img.onerror = (err) => {
			URL.revokeObjectURL(url)
			reject(err)
		}
		img.src = url
	})
}
