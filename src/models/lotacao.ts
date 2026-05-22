import { Schema, model, models, Document, Types } from 'mongoose'
import { VALID_UFS } from '@/lib/constants/brazilian-states'

export const LOTACAO_TIPOS = {
  UNIDADE_CENTRAL: 'Unidade Central',
  SUPERINTENDENCIA_REGIONAL: 'Superintendência Regional',
  DELEGACIA_REGIONAL: 'Delegacia Regional',
  DELEGACIA_FRONTEIRA: 'Delegacia de Fronteira',
  DELEGACIA_REGIONAL_PORTUARIA: 'Delegacia Regional / Portuária',
} as const

export type LotacaoTipo = typeof LOTACAO_TIPOS[keyof typeof LOTACAO_TIPOS]

export interface ILotacao extends Document {
  _id: Types.ObjectId
  sigla: string
  nome: string
  tipo: LotacaoTipo
  uf: string
  cidade: string
  createdAt: Date
  updatedAt: Date
}

const LotacaoSchema = new Schema<ILotacao>(
  {
    sigla: {
      type: String,
      required: [true, 'Sigla é obrigatória'],
      trim: true,
      uppercase: true,
    },
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    tipo: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: Object.values(LOTACAO_TIPOS),
    },
    uf: {
      type: String,
      required: [true, 'UF é obrigatória'],
      uppercase: true,
      trim: true,
      validate: {
        validator: (v: string) => VALID_UFS.has(v),
        message: 'UF inválida',
      },
    },
    cidade: {
      type: String,
      required: [true, 'Cidade é obrigatória'],
      trim: true,
    },
  },
  { timestamps: true }
)

LotacaoSchema.index({ sigla: 1, uf: 1 }, { unique: true })
LotacaoSchema.index({ uf: 1 })
LotacaoSchema.index({ tipo: 1 })
LotacaoSchema.index({ nome: 'text', sigla: 'text' })

export const Lotacao = models.Lotacao || model<ILotacao>('Lotacao', LotacaoSchema)
