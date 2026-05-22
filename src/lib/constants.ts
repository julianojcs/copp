// User functional roles in the system
export const USER_ROLES = {
  ALUNO: 'aluno',
  INSTRUTOR: 'instrutor',
  COORDENADOR: 'coordenador',
  ADMIN: 'admin',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Police Federal job titles (cargo) — required for everyone except admin
export const PF_CARGOS = {
  APF: 'APF', // Agente de Polícia Federal
  DPF: 'DPF', // Delegado de Polícia Federal
  EPF: 'EPF', // Escrivão de Polícia Federal
  PPF: 'PPF', // Papiloscopista de Polícia Federal
} as const

export type PFCargo = typeof PF_CARGOS[keyof typeof PF_CARGOS]

// User moderation status
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

// Course types (kept for compatibility with Course model)
export const COURSE_TYPES = {
  UNDERGRADUATE: 'undergraduate',
  POSTGRADUATE: 'postgraduate',
  SHORT_COURSE: 'short-course',
} as const

export type CourseType = typeof COURSE_TYPES[keyof typeof COURSE_TYPES]

