import mongoose from 'mongoose'

interface MongooseCache {
	conn: typeof mongoose | null
	promise: Promise<typeof mongoose> | null
}

declare global {
	var mongoose: MongooseCache | undefined
}

const MONGO_URI_PATTERN = /^mongodb(\+srv)?:\/\//

const cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
	global.mongoose = cached
}

function resolveMongoUri(): string {
	const uri = process.env.MONGODB_URI
	if (!uri || !MONGO_URI_PATTERN.test(uri)) {
		throw new Error(
			'MONGODB_URI ausente ou inválida — deve começar com "mongodb://" ou "mongodb+srv://"'
		)
	}
	return uri
}

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Uses connection caching to reuse existing connections in serverless environments.
 * URI validation runs lazily on first connect (not at module load) so that
 * build-time imports do not crash when env vars are unavailable.
 */
export async function connectDB(): Promise<typeof mongoose> {
	if (cached.conn) {
		return cached.conn
	}

	if (!cached.promise) {
		const uri = resolveMongoUri()
		const opts = {
			bufferCommands: false,
		}

		cached.promise = mongoose.connect(uri, opts).then((m) => m)
	}

	try {
		cached.conn = await cached.promise
	} catch (err) {
		cached.promise = null
		throw err
	}

	return cached.conn
}

export default connectDB
