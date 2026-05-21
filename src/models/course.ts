import { Schema, model, models, Document, Types } from 'mongoose'

/**
 * Course document interface for MongoDB
 */
export interface ICourse extends Document {
	_id: Types.ObjectId
	name: string
	code: string
	description?: string
	startDate: Date
	endDate: Date
	location: string
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}

/**
 * Course schema for MongoDB with Mongoose
 * Supports multiple courses/cohorts for the IBS program
 */
const CourseSchema = new Schema<ICourse>(
	{
		name: {
			type: String,
			required: [true, 'Course name is required'],
			trim: true,
		},
		code: {
			type: String,
			required: [true, 'Course code is required'],
			unique: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		startDate: {
			type: Date,
			required: [true, 'Start date is required'],
		},
		endDate: {
			type: Date,
			required: [true, 'End date is required'],
		},
		location: {
			type: String,
			required: [true, 'Location is required'],
			trim: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
)

CourseSchema.index({ isActive: 1 })

export const Course = models.Course || model<ICourse>('Course', CourseSchema)
