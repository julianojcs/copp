// src/models/app-settings.ts
import { Schema, model, models, Document, Types } from 'mongoose'

export interface IAppSettings extends Document {
  _id: Types.ObjectId
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  activeCourseId?: Types.ObjectId
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
  createdAt: Date
  updatedAt: Date
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    brandName: { type: String, required: true, trim: true },
    brandFullName: { type: String, required: true, trim: true },
    institutionName: { type: String, required: true, trim: true },
    institutionFullName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    activeCourseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    peerApprovalEnabled: { type: Boolean, default: false },
    developerName: { type: String, required: true, trim: true },
    developerLinkedinUrl: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const AppSettings =
  models.AppSettings || model<IAppSettings>('AppSettings', AppSettingsSchema)
