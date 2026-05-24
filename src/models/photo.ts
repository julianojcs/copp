import { Schema, model, models, Document, Types } from 'mongoose'

/**
 * Photo document interface for MongoDB.
 *
 * Reactions are tracked polymorphically by the Reaction collection
 * (`targetType: 'photo'`, `targetId: photo._id`). The legacy
 * `likes[]` field was retired in issue #12.
 */
export interface IPhoto extends Document {
	_id: Types.ObjectId
	uploadedBy: Types.ObjectId
	url: string
	publicId: string
	thumbnailUrl?: string
	title?: string
	description?: string
	location?: string
	takenAt?: Date
	taggedUsers: Types.ObjectId[]
	isPublic: boolean
	createdAt: Date
	updatedAt: Date
}

/**
 * Photo schema for MongoDB with Mongoose
 * Stores trip photos uploaded by users to Cloudinary
 */
const PhotoSchema = new Schema<IPhoto>(
	{
		uploadedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Uploader is required'],
			index: true,
		},
		url: {
			type: String,
			required: [true, 'Photo URL is required'],
		},
		publicId: {
			type: String,
			required: [true, 'Cloudinary public ID is required'],
		},
		thumbnailUrl: {
			type: String,
		},
		title: {
			type: String,
			trim: true,
			maxlength: [100, 'Title cannot exceed 100 characters'],
		},
		description: {
			type: String,
			trim: true,
			maxlength: [500, 'Description cannot exceed 500 characters'],
		},
		location: {
			type: String,
			trim: true,
			maxlength: [100, 'Location cannot exceed 100 characters'],
		},
		takenAt: {
			type: Date,
		},
		taggedUsers: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		isPublic: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
)

PhotoSchema.index({ createdAt: -1 })
PhotoSchema.index({ taggedUsers: 1 })
PhotoSchema.index({ location: 'text', title: 'text', description: 'text' })

export const Photo = models.Photo || model<IPhoto>('Photo', PhotoSchema)
