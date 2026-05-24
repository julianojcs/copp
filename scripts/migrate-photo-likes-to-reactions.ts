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
import { Photo } from '../src/models/photo'
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
}

async function main() {
	const uri = process.env.MONGODB_URI
	if (!uri) throw new Error('MONGODB_URI not set')

	const dryRun = process.argv.includes('--dry-run')

	console.log(`\n📸 Photo.likes → Reaction migration${dryRun ? ' (DRY RUN)' : ''}\n`)

	await mongoose.connect(uri)

	const stats: MigrationStats = {
		photosScanned: 0,
		likesFound: 0,
		reactionsCreated: 0,
		duplicatesSkipped: 0,
		errors: 0,
	}

	type PhotoLite = {
		_id: Types.ObjectId
		likes?: Types.ObjectId[]
		createdAt: Date
	}

	const cursor = Photo.find({ likes: { $exists: true, $ne: [] } })
		.select('_id likes createdAt')
		.cursor() as unknown as AsyncIterable<PhotoLite>

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

	await mongoose.disconnect()

	console.log('\n✅ Done')
	console.log('  photos scanned     :', stats.photosScanned)
	console.log('  likes found        :', stats.likesFound)
	console.log('  reactions created  :', stats.reactionsCreated)
	console.log('  duplicates skipped :', stats.duplicatesSkipped)
	console.log('  errors             :', stats.errors)
	if (dryRun) {
		console.log('\n(dry run — no writes performed)')
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
