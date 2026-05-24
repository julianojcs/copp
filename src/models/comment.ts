// src/models/comment.ts
import { Schema, model, models, Document, Types } from 'mongoose'
import {
	COMMENT_TARGET_TYPES,
	COMMENT_BODY_MAX_LENGTH,
	type CommentTargetType,
} from '@/lib/constants'

/**
 * Comment document — polymorphic comment on a Photo or Message.
 *
 * Soft deleted via `deletedAt`: when the author removes the comment,
 * the document stays in place so its position in the thread (and any
 * future replies) survive. The display layer masks the body when
 * `deletedAt` is set.
 */
export interface IComment extends Document {
	_id: Types.ObjectId
	userId: Types.ObjectId
	targetType: CommentTargetType
	targetId: Types.ObjectId
	body: string
	editedAt?: Date
	deletedAt?: Date
	createdAt: Date
	updatedAt: Date
}

const CommentSchema = new Schema<IComment>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Usuário é obrigatório'],
		},
		targetType: {
			type: String,
			enum: Object.values(COMMENT_TARGET_TYPES),
			required: [true, 'Tipo do alvo é obrigatório'],
		},
		targetId: {
			type: Schema.Types.ObjectId,
			required: [true, 'Alvo é obrigatório'],
		},
		body: {
			type: String,
			required: [true, 'Comentário é obrigatório'],
			trim: true,
			minlength: [1, 'Comentário não pode ser vazio'],
			maxlength: [
				COMMENT_BODY_MAX_LENGTH,
				`Comentário não pode exceder ${COMMENT_BODY_MAX_LENGTH} caracteres`,
			],
			validate: {
				validator: (v: string) => v.trim().length > 0,
				message: 'Comentário não pode ser vazio',
			},
		},
		editedAt: { type: Date },
		deletedAt: { type: Date },
	},
	{ timestamps: true },
)

// Listing comments for a given target, newest first.
CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })
// Listing a user's own comment history.
CommentSchema.index({ userId: 1, createdAt: -1 })

export const Comment =
	models.Comment || model<IComment>('Comment', CommentSchema)
