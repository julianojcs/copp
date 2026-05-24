// scripts/migrate-photo-likes-to-reactions.ts
//
// One-shot, idempotent backfill: copies every entry in `Photo.likes`
// to the new polymorphic `Reaction` collection as `type: 'like'`.
//
// Safe to run multiple times — the unique compound index on
// (userId, targetType, targetId) prevents duplicates; conflicting
// inserts are skipped silently.
//
// NOTE: this script does NOT remove `Photo.likes` from documents nor
// from the schema. The legacy field stays in place until the gallery
// UI is migrated to ReactionPicker in issue #6. Both data sources
// coexist meanwhile.
//
// Usage:
//   npx tsx scripts/migrate-photo-likes-to-reactions.ts
//   npx tsx scripts/migrate-photo-likes-to-reactions.ts --dry-run

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

import mongoose, { Types } from 'mongoose'
// NOTE: this script reads `photos.likes` via the raw collection so it
// remains usable AFTER issue #12 removed the `likes` field from the
// Photo Mongoose schema. The data may still exist in MongoDB; this
// migration backfills it into the Reaction collection.
import { Reaction } from '../src/models/reaction'
import {
	REACTION_TYPES,
	REACTION_TARGET_TYPES,
} from '../src/lib/constants'

interface MigrationStats {
	photosScanned: number
	likesFound: number
	reactionsCreated: number
	duplicatesSkipped: number
	errors: number
	likesFieldDropped: number
}

async function main() {
	const uri = process.env.MONGODB_URI
	if (!uri) throw new Error('MONGODB_URI not set')

	const dryRun = process.argv.includes('--dry-run')
	const cleanup = process.argv.includes('--cleanup')

	console.log(
		`\n📸 Photo.likes → Reaction migration${dryRun ? ' (DRY RUN)' : ''}${
			cleanup ? ' + cleanup ($unset likes)' : ''
		}\n`,
	)

	await mongoose.connect(uri)

	const stats: MigrationStats = {
		photosScanned: 0,
		likesFound: 0,
		reactionsCreated: 0,
		duplicatesSkipped: 0,
		errors: 0,
		likesFieldDropped: 0,
	}

	type PhotoLite = {
		_id: Types.ObjectId
		likes?: Types.ObjectId[]
		createdAt: Date
	}

	const db = mongoose.connection.db
	if (!db) throw new Error('MongoDB connection has no `db` handle')

	// Raw collection access — bypasses the Mongoose schema (which no
	// longer declares `likes`) so we can still read the legacy field
	// from any document that still has it.
	const cursor = db
		.collection<PhotoLite>('photos')
		.find({ likes: { $exists: true, $ne: [] } }, {
			projection: { _id: 1, likes: 1, createdAt: 1 },
		})

	for await (const photo of cursor) {
		stats.photosScanned += 1
		const likes = photo.likes ?? []
		for (const userId of likes) {
			stats.likesFound += 1
			if (dryRun) continue

			try {
				await Reaction.create({
					userId,
					targetType: REACTION_TARGET_TYPES.PHOTO,
					targetId: photo._id,
					type: REACTION_TYPES.LIKE,
					createdAt: photo.createdAt,
					updatedAt: photo.createdAt,
				})
				stats.reactionsCreated += 1
			} catch (err: unknown) {
				const e = err as { code?: number; message?: string }
				if (e.code === 11000) {
					stats.duplicatesSkipped += 1
				} else {
					stats.errors += 1
					console.error(
						`  ❌ user=${userId.toString()} photo=${photo._id.toString()}: ${
							e.message ?? 'unknown'
						}`,
					)
				}
			}
		}
	}

	// Cleanup pass: $unset the legacy `likes` field from every photo.
	// Only runs with --cleanup AND not --dry-run. Backfill must have
	// succeeded with zero errors first.
	if (cleanup && !dryRun && stats.errors === 0) {
		const result = await db
			.collection('photos')
			.updateMany(
				{ likes: { $exists: true } },
				{ $unset: { likes: '' } },
			)
		stats.likesFieldDropped = result.modifiedCount
	}

	await mongoose.disconnect()

	console.log('\n✅ Done')
	console.log('  photos scanned       :', stats.photosScanned)
	console.log('  likes found          :', stats.likesFound)
	console.log('  reactions created    :', stats.reactionsCreated)
	console.log('  duplicates skipped   :', stats.duplicatesSkipped)
	console.log('  errors               :', stats.errors)
	if (cleanup && !dryRun) {
		console.log('  likes field dropped  :', stats.likesFieldDropped)
	}
	if (dryRun) {
		console.log('\n(dry run — no writes performed)')
	} else if (!cleanup) {
		console.log(
			'\nℹ️  Re-run with `--cleanup` to also $unset the legacy `likes` field from photos.',
		)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
