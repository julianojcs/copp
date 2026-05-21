// scripts/seed.ts
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/models/user'
import { Course } from '../src/models/course'
import { AppSettings } from '../src/models/app-settings'
import { DEFAULT_APP_SETTINGS } from '../src/lib/default-settings'
import { USER_ROLES, USER_STATUS } from '../src/lib/constants'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminName = process.env.SEED_ADMIN_NAME || 'Coordenador V COPP'
  const adminLotacao = process.env.SEED_ADMIN_LOTACAO || 'ANP'
  const adminWhats = process.env.SEED_ADMIN_WHATSAPP || '(61) 99999-9999'

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  }

  await mongoose.connect(uri)

  // 1) Course V COPP
  let course = await Course.findOne({ code: 'V-COPP' })
  if (!course) {
    course = await Course.create({
      name: 'V COPP',
      code: 'V-COPP',
      description: '5º Curso de Operadores de Proteção a Pessoa',
      location: 'ANP — Brasília/DF',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    })
    console.log('Created Course V COPP:', course._id.toString())
  } else {
    console.log('Course V COPP already exists:', course._id.toString())
  }

  // 2) AppSettings (singleton) pointing to V COPP
  let settings = await AppSettings.findOne()
  if (!settings) {
    settings = await AppSettings.create({
      ...DEFAULT_APP_SETTINGS,
      activeCourseId: course._id,
    })
    console.log('Created AppSettings:', settings._id.toString())
  } else {
    if (!settings.activeCourseId) {
      settings.activeCourseId = course._id
      await settings.save()
    }
    console.log('AppSettings already exists:', settings._id.toString())
  }

  // 3) Bootstrap admin
  let admin = await User.findOne({ email: adminEmail.toLowerCase() })
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 12)
    admin = await User.create({
      email: adminEmail.toLowerCase(),
      password: hash,
      name: adminName,
      role: USER_ROLES.ADMIN,
      lotacao: adminLotacao,
      whatsapp: adminWhats,
      status: USER_STATUS.APPROVED,
      isActive: true,
      profileCompleted: true,
      emailVerified: true,
      courseId: course._id,
      courseName: course.name,
    })
    console.log('Created admin:', admin._id.toString())
  } else {
    console.log('Admin already exists:', admin._id.toString())
  }

  await mongoose.disconnect()
  console.log('\n✅ Seed done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
