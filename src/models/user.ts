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
  lotacao: string
  whatsapp: string
  courseId?: Types.ObjectId
  courseName: string

  // legacy fields kept
  city?: string
  country?: string

  // moderation
  status: UserStatus
  rejectedReason?: string
  approvedBy?: Types.ObjectId
  approvedAt?: Date

  // optional profile
  linkedin?: string
  instagram?: string
  github?: string
  twitter?: string
  bio?: string
  company?: string

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
    lotacao: { type: String, required: true, trim: true, maxlength: 200 },
    whatsapp: { type: String, required: true, trim: true },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, required: true },

    city: { type: String },
    country: { type: String },

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
    github: { type: String },
    twitter: { type: String },
    bio: { type: String, maxlength: 500 },
    company: { type: String, trim: true },

    googleId: { type: String, unique: true, sparse: true },

    isActive: { type: Boolean, default: true },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Indices
UserSchema.index({ courseId: 1, role: 1 })
UserSchema.index({ status: 1 })
UserSchema.index({ name: 'text', lotacao: 'text' })

// Application-level invariant: cargo required if role !== 'admin'
UserSchema.pre('validate', async function () {
  if (this.role !== USER_ROLES.ADMIN && !this.cargo) {
    this.invalidate('cargo', 'Cargo é obrigatório para esta função')
  }
})

export const User = models.User || model<IUser>('User', UserSchema)
