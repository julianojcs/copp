// src/models/user.ts
import { Schema, model, models, Document, Types } from 'mongoose'
import {
  USER_ROLES,
  PF_CARGOS,
  USER_STATUS,
  type UserRole,
  type PFCargo,
  type UserStatus,
} from '@/lib/constants'
import { VALID_UFS } from '@/lib/constants/brazilian-states'
import { LOTACAO_TIPOS, type LotacaoTipo } from '@/models/lotacao'

export interface IUser extends Document {
  _id: Types.ObjectId
  email: string
  password?: string
  emailVerified: boolean
  verificationToken?: string
  verificationTokenExpires?: Date
  resetPasswordToken?: string
  resetPasswordTokenExpires?: Date
  name: string
  avatar?: string

  // V COPP fields
  role: UserRole
  cargo?: PFCargo
  whatsapp: string
  courseId?: Types.ObjectId
  courseName: string

  // lotacao (PF unit) — referenced by id + denormalized for listings
  lotacaoId: Types.ObjectId
  lotacaoSigla: string
  lotacaoNome: string
  lotacaoTipo: LotacaoTipo

  // location — derived from lotacao (not user-editable)
  state: string
  city: string

  // moderation
  status: UserStatus
  rejectedReason?: string
  approvedBy?: Types.ObjectId
  approvedAt?: Date

  // optional profile
  linkedin?: string
  instagram?: string
  twitter?: string
  bio?: string

  googleId?: string
  isActive: boolean
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },

    name: { type: String, required: true, trim: true },
    avatar: { type: String },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.ALUNO,
    },
    cargo: {
      type: String,
      enum: Object.values(PF_CARGOS),
    },
    whatsapp: { type: String, required: true, trim: true },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, required: true },

    lotacaoId: {
      type: Schema.Types.ObjectId,
      ref: 'Lotacao',
      required: [true, 'Lotação é obrigatória'],
    },
    lotacaoSigla: { type: String, required: true, uppercase: true, trim: true },
    lotacaoNome: { type: String, required: true, trim: true },
    lotacaoTipo: {
      type: String,
      required: true,
      enum: Object.values(LOTACAO_TIPOS),
    },

    state: {
      type: String,
      required: [true, 'Estado é obrigatório'],
      uppercase: true,
      trim: true,
      validate: {
        validator: (v: string) => VALID_UFS.has(v),
        message: 'Estado (UF) inválido',
      },
    },
    city: {
      type: String,
      required: [true, 'Cidade é obrigatória'],
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    rejectedReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    linkedin: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    bio: { type: String, maxlength: 500 },

    googleId: { type: String, unique: true, sparse: true },

    isActive: { type: Boolean, default: true },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

UserSchema.index({ courseId: 1, role: 1 })
UserSchema.index({ status: 1 })
UserSchema.index({ state: 1, city: 1 })
UserSchema.index({ lotacaoId: 1 })
UserSchema.index({ name: 'text', lotacaoSigla: 'text', lotacaoNome: 'text' })

UserSchema.pre('validate', async function () {
  if (this.role !== USER_ROLES.ADMIN && !this.cargo) {
    this.invalidate('cargo', 'Cargo é obrigatório para esta função')
  }
})

export const User = models.User || model<IUser>('User', UserSchema)
