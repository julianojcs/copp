import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Photo } from '@/models/photo'
import { auth } from '@/lib/auth'
import { deleteImage } from '@/lib/cloudinary'

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id } = await params

		await connectDB()

		const photo = await Photo.findById(id)
			.populate('uploadedBy', 'name avatar')
			.populate('taggedUsers', 'name avatar')
			.populate('likes', 'name avatar')
			.lean()

		if (!photo) {
			return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
		}

		return NextResponse.json({ photo })
	} catch (err) {
		console.error('Get photo error:', err)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 }
		)
	}
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id } = await params

		await connectDB()

		const photo = await Photo.findById(id)

		if (!photo) {
			return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
		}

		if (
			photo.uploadedBy.toString() !== session.user.id &&
			session.user.role !== 'coordenador' &&
			session.user.role !== 'admin'
		) {
			return NextResponse.json({ error: 'Sem permissão para excluir esta foto.' }, { status: 403 })
		}

		await deleteImage(photo.publicId)
		await Photo.findByIdAndDelete(id)

		return NextResponse.json({ message: 'Photo deleted successfully!' })
	} catch (err) {
		console.error('Delete photo error:', err)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 }
		)
	}
}
