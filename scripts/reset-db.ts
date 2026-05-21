// scripts/reset-db.ts
import 'dotenv/config'
import mongoose from 'mongoose'
import readline from 'node:readline/promises'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const dbName = mongoose.connection.db.databaseName

  console.log(`\n⚠️  This will DROP collections in DB: ${dbName}`)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Type the DB name to confirm: `)
  rl.close()

  if (answer.trim() !== dbName) {
    console.error('Confirmation does not match. Aborting.')
    process.exit(1)
  }

  const targets = ['users', 'photos', 'courses', 'appsettings']
  for (const name of targets) {
    try {
      await mongoose.connection.db.dropCollection(name)
      console.log(`  dropped ${name}`)
    } catch (e: any) {
      if (e.codeName === 'NamespaceNotFound') console.log(`  ${name} not present`)
      else throw e
    }
  }

  await mongoose.disconnect()
  console.log('\n✅ Done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
