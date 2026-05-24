import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Photo } from '@/models/photo'
import { auth } from '@/lib/auth'

interface RouteParams {
	params: Promise<{ id: string }>
}

/**
 * @deprecated Legacy single-emoji like endpoint kept for backward
 * compatibility with the current gallery UI. New clients should use
 * `POST /api/reactions` (polymorphic, supports 6 reaction types).
 * This endpoint will be removed when the gallery is migrated to
 * `<ReactionPicker>` in issue #6.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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

		const userId = session.user.id
		const hasLiked = photo.likes.some(
			(likeId: { toString: () => string }) => likeId.toString() === userId
		)

		const updateOperation = hasLiked
			? { $pull: { likes: userId } }
			: { $addToSet: { likes: userId } }

		const updatedPhoto = await Photo.findByIdAndUpdate(id, updateOperation, {
			new: true,
		})
			.populate('uploadedBy', 'name avatar')
			.populate('taggedUsers', 'name avatar')
			.populate('likes', 'name avatar')
			.lean()

		return NextResponse.json({
			photo: updatedPhoto,
			liked: !hasLiked,
			message: hasLiked ? 'Like removed' : 'Photo liked!',
		})
	} catch (err) {
		console.error('Like photo error:', err)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 }
		)
	}
}
