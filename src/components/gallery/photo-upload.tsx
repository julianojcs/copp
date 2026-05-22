'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Loader2, Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { compressImage, formatFileSize } from '@/lib/image-utils'

interface PhotoUploadProps {
	isOpen: boolean
	onClose: () => void
	onUpload: (data: PhotoUploadData) => Promise<void>
}

interface PhotoUploadData {
	file: File
	title: string
	description: string
	location: string
	takenAt: string
}

type UploadStage = 'idle' | 'compressing' | 'uploading' | 'saving' | 'done'

export function PhotoUpload({ isOpen, onClose, onUpload }: PhotoUploadProps) {
	const [file, setFile] = useState<File | null>(null)
	const [originalSize, setOriginalSize] = useState<number>(0)
	const [compressedSize, setCompressedSize] = useState<number>(0)
	const [preview, setPreview] = useState<string | null>(null)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [location, setLocation] = useState('')
	const [takenAt, setTakenAt] = useState('')
	const [isUploading, setIsUploading] = useState(false)
	const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
	const [error, setError] = useState<string | null>(null)

	const handleDrop = useCallback(async (acceptedFiles: File[]) => {
		const selectedFile = acceptedFiles[0]
		if (selectedFile) {
			setOriginalSize(selectedFile.size)
			setError(null)
			setUploadStage('compressing')

			try {
				// Compress the image before setting it
				const compressedFile = await compressImage(selectedFile, {
					maxWidth: 1920,
					maxHeight: 1920,
					quality: 0.85,
					maxSizeMB: 2,
				})

				setFile(compressedFile)
				setCompressedSize(compressedFile.size)
				setPreview(URL.createObjectURL(compressedFile))
			} catch {
				// If compression fails, use original file
				setFile(selectedFile)
				setCompressedSize(selectedFile.size)
				setPreview(URL.createObjectURL(selectedFile))
			} finally {
				setUploadStage('idle')
			}
		}
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: handleDrop,
		accept: {
			'image/jpeg': ['.jpg', '.jpeg'],
			'image/png': ['.png'],
			'image/webp': ['.webp'],
			'image/gif': ['.gif'],
		},
		maxSize: 20 * 1024 * 1024, // 20MB (larger limit since we compress)
		maxFiles: 1,
		onDropRejected: (rejections) => {
			const rejection = rejections[0]
			if (rejection.errors[0].code === 'file-too-large') {
				setError('File is too large. Maximum size is 20MB.')
			} else if (rejection.errors[0].code === 'file-invalid-type') {
				setError('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.')
			} else {
				setError('Invalid file.')
			}
		},
	})

	const handleRemoveFile = () => {
		setFile(null)
		setOriginalSize(0)
		setCompressedSize(0)
		if (preview) {
			URL.revokeObjectURL(preview)
			setPreview(null)
		}
	}

	const handleClose = () => {
		handleRemoveFile()
		setTitle('')
		setDescription('')
		setLocation('')
		setTakenAt('')
		setError(null)
		setUploadStage('idle')
		onClose()
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!file) {
			setError('Please select a photo to upload.')
			return
		}

		setIsUploading(true)
		setError(null)

		try {
			setUploadStage('uploading')
			await onUpload({
				file,
				title,
				description,
				location,
				takenAt,
			})
			setUploadStage('done')
			// Small delay to show success state
			await new Promise(resolve => setTimeout(resolve, 500))
			handleClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
			setUploadStage('idle')
		} finally {
			setIsUploading(false)
		}
	}

	const getUploadProgress = () => {
		switch (uploadStage) {
			case 'compressing': return 10
			case 'uploading': return 50
			case 'saving': return 80
			case 'done': return 100
			default: return 0
		}
	}

	const getUploadStatusText = () => {
		switch (uploadStage) {
			case 'compressing': return 'Compressing image...'
			case 'uploading': return 'Uploading to cloud...'
			case 'saving': return 'Saving photo details...'
			case 'done': return 'Upload complete!'
			default: return ''
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent
				className="max-w-lg"
				onInteractOutside={(e) => {
					e.preventDefault()
				}}
			>
				<DialogHeader>
					<DialogTitle>Upload Photo</DialogTitle>
					<DialogDescription>
						Share a photo from your London trip with your colleagues.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div
							className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
							role="alert"
						>
							{error}
						</div>
					)}

					{!file ? (
						<div
							{...getRootProps()}
							className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
								isDragActive
									? 'border-primary bg-primary/5'
									: 'border-muted-foreground/25 hover:border-primary/50'
							}`}
						>
							<input {...getInputProps()} />
							<ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<p className="text-sm text-muted-foreground">
								{isDragActive
									? 'Drop the photo here...'
									: 'Drag & drop a photo, or click to select'}
							</p>
							<p className="text-xs text-muted-foreground mt-2">
								Images are automatically compressed • Max 20MB
							</p>
						</div>
					) : (
						<div className="relative">
							{/* eslint-disable-next-line @next/next/no-img-element -- preview uses a transient object URL, not a static asset */}
							<img
								src={preview || ''}
								alt="Preview"
								className="w-full h-48 object-cover rounded-lg"
							/>
							<Button
								type="button"
								variant="destructive"
								size="icon"
								className="absolute top-2 right-2 h-8 w-8"
								onClick={handleRemoveFile}
								aria-label="Remove photo"
							>
								<X className="h-4 w-4" />
							</Button>
							{/* Compression info */}
							{originalSize > 0 && compressedSize > 0 && originalSize !== compressedSize && (
								<div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
									{formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
								</div>
							)}
						</div>
					)}

					{/* Upload Progress */}
					{uploadStage !== 'idle' && (
						<div className="space-y-2 p-3 bg-muted/50 rounded-lg">
							<div className="flex items-center gap-2">
								{uploadStage === 'done' ? (
									<CheckCircle className="h-4 w-4 text-green-500" />
								) : (
									<Loader2 className="h-4 w-4 animate-spin text-primary" />
								)}
								<span className="text-sm font-medium">{getUploadStatusText()}</span>
							</div>
							<Progress value={getUploadProgress()} className="h-2" />
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="title">Title (optional)</Label>
						<Input
							id="title"
							placeholder="e.g., Big Ben at sunset"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={100}
							disabled={isUploading}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (optional)</Label>
						<Textarea
							id="description"
							placeholder="Tell us about this photo..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={500}
							rows={3}
							disabled={isUploading}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="location">Location (optional)</Label>
							<Input
								id="location"
								placeholder="e.g., Tower Bridge"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								maxLength={100}
								disabled={isUploading}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="takenAt">Date taken (optional)</Label>
							<Input
								id="takenAt"
								type="date"
								value={takenAt}
								onChange={(e) => setTakenAt(e.target.value)}
								disabled={isUploading}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isUploading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!file || isUploading}>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
