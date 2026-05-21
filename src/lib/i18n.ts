// src/lib/i18n.ts
import { USER_ROLES, PF_CARGOS, USER_STATUS } from '@/lib/constants'
import type { UserRole, PFCargo, UserStatus } from '@/lib/constants'

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ALUNO]: 'Aluno',
  [USER_ROLES.INSTRUTOR]: 'Instrutor',
  [USER_ROLES.COORDENADOR]: 'Coordenador',
  [USER_ROLES.ADMIN]: 'Administrador',
}

export const CARGO_LABELS: Record<PFCargo, string> = {
  [PF_CARGOS.APF]: 'Agente de Polícia Federal (APF)',
  [PF_CARGOS.DPF]: 'Delegado de Polícia Federal (DPF)',
  [PF_CARGOS.EPF]: 'Escrivão de Polícia Federal (EPF)',
  [PF_CARGOS.PPF]: 'Papiloscopista de Polícia Federal (PPF)',
}

export const CARGO_SHORT_LABELS: Record<PFCargo, string> = {
  [PF_CARGOS.APF]: 'APF',
  [PF_CARGOS.DPF]: 'DPF',
  [PF_CARGOS.EPF]: 'EPF',
  [PF_CARGOS.PPF]: 'PPF',
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.PENDING]: 'Aguardando aprovação',
  [USER_STATUS.APPROVED]: 'Aprovado',
  [USER_STATUS.REJECTED]: 'Rejeitado',
}

export const MESSAGES = {
  auth: {
    invalidCredentials: 'Email ou senha inválidos.',
    pendingApproval:
      'Sua conta está aguardando aprovação da coordenação. Você receberá um email assim que for liberada.',
    rejected:
      'Seu cadastro foi rejeitado. Entre em contato com a coordenação do curso.',
    inactive: 'Conta desativada. Entre em contato com a coordenação.',
    sessionExpired: 'Sessão expirada. Faça login novamente.',
    unauthorized: 'Você não tem permissão para acessar esta página.',
  },
  registration: {
    success:
      'Cadastro realizado! Sua conta está em análise pela coordenação. Você receberá um email assim que for liberada.',
    emailExists: 'Este email já está cadastrado.',
  },
  moderation: {
    approved: 'Aluno aprovado com sucesso.',
    rejected: 'Aluno rejeitado.',
    reactivated: 'Aluno reativado para nova análise.',
    bulkApproved: (n: number) => `${n} aluno(s) aprovado(s).`,
  },
  validation: {
    required: 'Campo obrigatório.',
    invalidEmail: 'Email inválido.',
  },
  forms: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    approve: 'Aprovar',
    reject: 'Rejeitar',
    edit: 'Editar',
    back: 'Voltar',
  },
} as const
