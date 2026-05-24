// src/models/reaction.ts
import { Schema, model, models, Document, Types } from 'mongoose'
import {
	REACTION_TYPES,
	REACTION_TARGET_TYPES,
	type ReactionType,
	type ReactionTargetType,
} from '@/lib/constants'

/**
 * Reaction document — polymorphic emoji reaction on a Photo or Message.
 *
 * The unique compound index on (userId, targetType, targetId) enforces
 * a single reaction per user per target. Switching reactions
 * (e.g. "like" → "love") is a substitution via upsert, not an append.
 */
export interface IReaction extends Document {
	_id: Types.ObjectId
	userId: Types.ObjectId
	targetType: ReactionTargetType
	targetId: Types.ObjectId
	type: ReactionType
	createdAt: Date
	updatedAt: Date
}

const ReactionSchema = new Schema<IReaction>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Usuário é obrigatório'],
		},
		targetType: {
			type: String,
			enum: Object.values(REACTION_TARGET_TYPES),
			required: [true, 'Tipo do alvo é obrigatório'],
		},
		targetId: {
			type: Schema.Types.ObjectId,
			required: [true, 'Alvo é obrigatório'],
		},
		type: {
			type: String,
			enum: Object.values(REACTION_TYPES),
			required: [true, 'Tipo de reação é obrigatório'],
		},
	},
	{ timestamps: true },
)

// One reaction per (user, target). Switching emoji is a substitution.
ReactionSchema.index(
	{ userId: 1, targetType: 1, targetId: 1 },
	{ unique: true },
)

// Listing reactions for a given target, newest first.
ReactionSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })

export const Reaction =
	models.Reaction || model<IReaction>('Reaction', ReactionSchema)
