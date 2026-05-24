'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PhotoCard } from '@/components/gallery/photo-card'
import { PhotoUpload } from '@/components/gallery/photo-upload'
import { useInView } from 'react-intersection-observer'

interface PhotoUser {
	_id: string
	name: string
	avatar?: string
}

interface Photo {
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

interface PaginationData {
	page: number
	limit: number
	total: number
	totalPages: number
}

interface PhotoUploadData {
	file: File
	title: string
	description: string
	location: string
	takenAt: string
}

export default function GalleryPage() {
	const searchParams = useSearchParams()
	const userIdFilter = searchParams.get('userId') || ''

	const [photos, setPhotos] = useState<Photo[]>([])
	const [pagination, setPagination] = useState<PaginationData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isFetchingMore, setIsFetchingMore] = useState(false)
	const [page, setPage] = useState(1)
	const [isUploadOpen, setIsUploadOpen] = useState(false)

	const { ref, inView } = useInView()

	const fetchPhotos = useCallback(async (pageNum: number) => {
		if (pageNum === 1) setIsLoading(true)
		else setIsFetchingMore(true)

		try {
			const params = new URLSearchParams()
			if (userIdFilter) params.set('userId', userIdFilter)
			params.set('page', pageNum.toString())
			params.set('limit', '20')

			const response = await fetch(`/api/photos?${params}`)
			const data = await response.json()

			if (response.ok) {
				setPhotos((prev) => pageNum === 1 ? data.photos : [...prev, ...data.photos])
				setPagination(data.pagination)
			}
		} catch (err) {
			console.error('Failed to fetch photos:', err)
			toast.error('Erro ao carregar fotos')
		} finally {
			setIsLoading(false)
			setIsFetchingMore(false)
		}
	}, [userIdFilter])

	useEffect(() => {
		// Reset when filter changes
		setPhotos([])
		setPage(1)
		fetchPhotos(1)
	}, [userIdFilter, fetchPhotos])

	useEffect(() => {
		if (inView && pagination && page < pagination.totalPages && !isFetchingMore && !isLoading) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchPhotos(nextPage)
		}
	}, [inView, pagination, page, isFetchingMore, isLoading, fetchPhotos])

	const handleUpload = async (data: PhotoUploadData) => {
		const formData = new FormData()
		formData.append('file', data.file)
		formData.append('type', 'gallery')

		const uploadResponse = await fetch('/api/upload', {
			method: 'POST',
			body: formData,
		})

		if (!uploadResponse.ok) {
			const error = await uploadResponse.json()
			throw new Error(error.error || 'Falha no envio da foto')
		}

		const uploadResult = await uploadResponse.json()

		const photoResponse = await fetch('/api/photos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				url: uploadResult.url,
				publicId: uploadResult.publicId,
				thumbnailUrl: uploadResult.thumbnailUrl,
				title: data.title,
				description: data.description,
				location: data.location,
				takenAt: data.takenAt,
			}),
		})

		if (!photoResponse.ok) {
			const error = await photoResponse.json()
			throw new Error(error.error || 'Erro ao salvar foto')
		}

		toast.success('Foto enviada com sucesso!')
		setPage(1)
		fetchPhotos(1)
	}

	const handleDelete = async (photoId: string) => {
		try {
			const response = await fetch(`/api/photos/${photoId}`, {
				method: 'DELETE',
			})

			if (response.ok) {
				toast.success('Foto excluída com sucesso!')
				setPhotos((prev) => prev.filter(p => p._id !== photoId))
			} else {
				const error = await response.json()
				toast.error(error.error || 'Erro ao excluir foto')
			}
		} catch (err) {
			console.error('Failed to delete photo:', err)
			toast.error('Erro ao excluir foto')
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Galeria de Fotos</h1>
					<p className="text-muted-foreground">
						Compartilhe e reviva os momentos do curso
					</p>
				</div>

				<Button onClick={() => setIsUploadOpen(true)} className="w-full sm:w-auto">
					<Plus className="mr-2 h-4 w-4" />
					Enviar Foto
				</Button>
			</div>

			{isLoading && page === 1 ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : photos.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-muted-foreground mb-4">
						Nenhuma foto ainda. Seja o primeiro a compartilhar!
					</p>
					<Button onClick={() => setIsUploadOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Enviar primeira foto
					</Button>
				</div>
			) : (
				<>
					<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{photos.map((photo) => (
							<PhotoCard
								key={photo._id}
								photo={photo}
								onDelete={handleDelete}
							/>
						))}
					</div>

					{/* Loading sentinel */}
					<div ref={ref} className="py-8 flex justify-center">
						{isFetchingMore && (
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						)}
					</div>
				</>
			)}

			<PhotoUpload
				isOpen={isUploadOpen}
				onClose={() => setIsUploadOpen(false)}
				onUpload={handleUpload}
			/>
		</div>
	)
}
