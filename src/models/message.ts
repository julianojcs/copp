// src/models/message.ts
import { Schema, model, models, Document, Types } from 'mongoose'
import { MESSAGE_BODY_MAX_LENGTH } from '@/lib/constants'

/**
 * Attached image metadata. All fields required when an image is
 * attached — partial uploads are rejected at validation time.
 */
export interface IMessageImage {
	url: string
	publicId: string
	width: number
	height: number
}

/**
 * Message document — text post with an optional attached image.
 *
 * Soft deleted via `deletedAt`: when the author removes it, the
 * document stays so reactions and comments don't dangle. The display
 * layer masks the body and image when `deletedAt` is set.
 */
export interface IMessage extends Document {
	_id: Types.ObjectId
	authorId: Types.ObjectId
	body: string
	image?: IMessageImage
	editedAt?: Date
	deletedAt?: Date
	createdAt: Date
	updatedAt: Date
}

const MessageImageSchema = new Schema<IMessageImage>(
	{
		url: { type: String, required: true },
		publicId: { type: String, required: true },
		width: { type: Number, required: true, min: 1 },
		height: { type: Number, required: true, min: 1 },
	},
	{ _id: false },
)

const MessageSchema = new Schema<IMessage>(
	{
		authorId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Autor é obrigatório'],
		},
		body: {
			type: String,
			required: [true, 'Mensagem é obrigatória'],
			trim: true,
			minlength: [1, 'Mensagem não pode ser vazia'],
			maxlength: [
				MESSAGE_BODY_MAX_LENGTH,
				`Mensagem não pode exceder ${MESSAGE_BODY_MAX_LENGTH} caracteres`,
			],
			validate: {
				validator: (v: string) => v.trim().length > 0,
				message: 'Mensagem não pode ser vazia',
			},
		},
		image: { type: MessageImageSchema, default: undefined },
		editedAt: { type: Date },
		deletedAt: { type: Date },
	},
	{ timestamps: true },
)

// Chronological feed listing.
MessageSchema.index({ createdAt: -1 })
// Author's own message history.
MessageSchema.index({ authorId: 1, createdAt: -1 })
// Future full-text search.
MessageSchema.index({ body: 'text' })

export const Message =
	models.Message || model<IMessage>('Message', MessageSchema)
