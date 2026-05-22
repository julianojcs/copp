// scripts/seed.ts
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/models/user'
import { Course } from '../src/models/course'
import { AppSettings } from '../src/models/app-settings'
import { Lotacao } from '../src/models/lotacao'
import { DEFAULT_APP_SETTINGS } from '../src/lib/default-settings'
import { USER_ROLES, USER_STATUS } from '../src/lib/constants'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminName = process.env.SEED_ADMIN_NAME || 'Coordenador V COPP'
  const adminLotacaoSigla = (process.env.SEED_ADMIN_LOTACAO_SIGLA || 'ANP/PF').toUpperCase()
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

  // 3) Resolve admin lotacao (requires seed-lotacoes to have been run first)
  const lotacao = await Lotacao.findOne({ sigla: adminLotacaoSigla })
  if (!lotacao) {
    throw new Error(
      `Lotacao "${adminLotacaoSigla}" not found. Run "npx tsx scripts/seed-lotacoes.ts" first ` +
        `or override SEED_ADMIN_LOTACAO_SIGLA in .env.local.`
    )
  }

  const lotacaoFields = {
    lotacaoId: lotacao._id,
    lotacaoSigla: lotacao.sigla,
    lotacaoNome: lotacao.nome,
    lotacaoTipo: lotacao.tipo,
    state: lotacao.uf,
    city: lotacao.cidade,
  }

  // 4) Bootstrap or migrate admin
  const admin = await User.findOne({ email: adminEmail.toLowerCase() })
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 12)
    const created = await User.create({
      email: adminEmail.toLowerCase(),
      password: hash,
      name: adminName,
      role: USER_ROLES.ADMIN,
      whatsapp: adminWhats,
      status: USER_STATUS.APPROVED,
      isActive: true,
      profileCompleted: true,
      emailVerified: true,
      courseId: course._id,
      courseName: course.name,
      ...lotacaoFields,
    })
    console.log('Created admin:', created._id.toString())
  } else {
    // Heal legacy admin: ensure lotacao denormalized fields exist; drop dead legacy fields
    const needsBackfill = !admin.lotacaoId || !admin.state || !admin.city
    if (needsBackfill) {
      // strict:false so $unset can drop fields no longer present in the schema
      await User.updateOne(
        { _id: admin._id },
        {
          $set: {
            ...lotacaoFields,
            whatsapp: admin.whatsapp || adminWhats,
            profileCompleted: true,
          },
          $unset: {
            lotacao: '',
            country: '',
            github: '',
            company: '',
          },
        },
        { strict: false }
      )
      console.log('Healed admin (backfilled lotacao/state/city, dropped legacy):', admin._id.toString())
    } else {
      console.log('Admin already exists with lotacao set:', admin._id.toString())
    }
  }

  await mongoose.disconnect()
  console.log('\n✅ Seed done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
