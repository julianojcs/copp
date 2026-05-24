import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Photo } from '@/models/photo'
import { auth } from '@/lib/auth'
import { photoSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		await connectDB()

		const { searchParams } = new URL(req.url)
		const userId = searchParams.get('userId') || ''
		const search = searchParams.get('search') || ''
		const page = parseInt(searchParams.get('page') || '1')
		const limit = parseInt(searchParams.get('limit') || '20')

		const query: Record<string, unknown> = { isPublic: true }

		if (userId) {
			query.uploadedBy = userId
		}

		if (search) {
			query.$text = { $search: search }
		}

		const skip = (page - 1) * limit

		const [photos, total] = await Promise.all([
			Photo.find(query)
				.populate('uploadedBy', 'name avatar')
				.populate('taggedUsers', 'name avatar')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Photo.countDocuments(query),
		])

		return NextResponse.json({
			photos,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})
	} catch (err) {
		console.error('Get photos error:', err)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 }
		)
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const body = await req.json()
		const { url, publicId, thumbnailUrl, ...photoData } = body

		if (!url || !publicId) {
			return NextResponse.json(
				{ error: 'Image URL and publicId are required' },
				{ status: 400 }
			)
		}

		const validationResult = photoSchema.safeParse(photoData)

		if (!validationResult.success) {
			return NextResponse.json(
				{ error: validationResult.error.issues[0].message },
				{ status: 400 }
			)
		}

		await connectDB()

		const photo = await Photo.create({
			uploadedBy: session.user.id,
			url,
			publicId,
			thumbnailUrl,
			...validationResult.data,
			takenAt: validationResult.data.takenAt
				? new Date(validationResult.data.takenAt)
				: undefined,
		})

		const populatedPhoto = await Photo.findById(photo._id)
			.populate('uploadedBy', 'name avatar')
			.lean()

		return NextResponse.json(
			{ photo: populatedPhoto, message: 'Photo uploaded successfully!' },
			{ status: 201 }
		)
	} catch (err) {
		console.error('Create photo error:', err)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 }
		)
	}
}
