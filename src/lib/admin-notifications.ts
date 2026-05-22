import { User } from '@/models/user'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'
import { sendNewRegistrationNotificationEmail } from '@/lib/email'

export interface NewRegistrationPayload {
  name: string
  email: string
  cargo?: string
  lotacao?: string
}

/**
 * Lista de admins que devem receber notificações operacionais.
 * Considera apenas usuários ativos e aprovados para evitar enviar e-mail a contas
 * desativadas ou que ainda não foram moderadas.
 */
export async function listAdminNotificationEmails(): Promise<string[]> {
  const admins = await User.find({
    role: USER_ROLES.ADMIN,
    isActive: true,
    status: USER_STATUS.APPROVED,
  })
    .select('email')
    .lean()
  return admins.map((a) => a.email).filter((e): e is string => typeof e === 'string' && e.length > 0)
}

/**
 * Dispara notificação aos admins sobre um novo cadastro.
 * Silencioso em falhas: nenhum erro propaga para o fluxo de registro.
 */
export async function notifyAdminsOfNewRegistration(
  payload: NewRegistrationPayload
): Promise<void> {
  try {
    const adminEmails = await listAdminNotificationEmails()
    if (adminEmails.length === 0) return
    await sendNewRegistrationNotificationEmail(adminEmails, payload)
  } catch (err) {
    console.error('[admin-notifications] Failed to notify admins of new registration:', err)
  }
}
