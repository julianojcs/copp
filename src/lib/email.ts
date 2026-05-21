import nodemailer from 'nodemailer'
import { getAppSettings } from '@/lib/app-settings'

interface EmailOptions {
	to: string
	subject: string
	html: string
}

const port = parseInt(process.env.EMAIL_PORT || '465')

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port,
	secure: port === 465, // true for 465, false for other ports
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
})

function brandedShell(opts: { brandName: string; title: string; bodyHtml: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin:0; padding:0; background:#f4f4f5;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <div style="background:white; border-radius:12px; padding:40px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <div style="text-align:center; margin-bottom:30px;">
        <h1 style="color:#18181b; margin:0; font-size:24px;">${opts.brandName}</h1>
        <p style="color:#71717a; margin-top:8px;">Sistema da turma</p>
      </div>
      <h2 style="color:#18181b; font-size:20px; margin-bottom:16px;">${opts.title}</h2>
      ${opts.bodyHtml}
    </div>
    <p style="text-align:center; color:#a1a1aa; font-size:12px; margin-top:24px;">
      © ${new Date().getFullYear()} ${opts.brandName}. Todos os direitos reservados.
    </p>
  </div>
</body></html>`
}

/**
 * Sends an email using Nodemailer
 * @param options - Email options including recipient, subject, and HTML content
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
	await transporter.sendMail({
		from: process.env.EMAIL_FROM,
		to: options.to,
		subject: options.subject,
		html: options.html,
	})
}

/**
 * Envia email de boas-vindas informando que o cadastro está em análise
 */
export async function sendWelcomePendingEmail(email: string, name: string): Promise<void> {
  const settings = await getAppSettings()
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Cadastro recebido',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Seu cadastro no <strong>${settings.brandName}</strong> foi recebido com sucesso e está em análise pela coordenação do curso.
      </p>
      <p style="color:#3f3f46; line-height:1.6;">
        Assim que sua conta for aprovada, você receberá outro email confirmando a liberação.
      </p>`,
  })
  await sendEmail({ to: email, subject: `Cadastro recebido — ${settings.brandName}`, html })
}

/**
 * Envia email confirmando que a conta foi aprovada pela coordenação
 */
export async function sendAccountApprovedEmail(email: string, name: string): Promise<void> {
  const settings = await getAppSettings()
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Conta aprovada',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Sua conta foi aprovada! Você já pode acessar o sistema do <strong>${settings.brandName}</strong>.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${loginUrl}" style="background:#2563eb; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
          Acessar o sistema
        </a>
      </div>`,
  })
  await sendEmail({ to: email, subject: `Conta aprovada — ${settings.brandName}`, html })
}

/**
 * Envia email informando que o cadastro foi rejeitado pela coordenação
 */
export async function sendAccountRejectedEmail(
  email: string,
  name: string,
  reason?: string
): Promise<void> {
  const settings = await getAppSettings()
  const reasonBlock = reason
    ? `<p style="color:#3f3f46; line-height:1.6;"><strong>Motivo:</strong> ${reason}</p>`
    : ''
  const html = brandedShell({
    brandName: settings.brandName,
    title: 'Cadastro não aprovado',
    bodyHtml: `
      <p style="color:#3f3f46; line-height:1.6;">
        Olá ${name},<br><br>
        Infelizmente seu cadastro no <strong>${settings.brandName}</strong> não foi aprovado pela coordenação do curso.
      </p>
      ${reasonBlock}
      <p style="color:#3f3f46; line-height:1.6;">
        Em caso de dúvidas, entre em contato com a coordenação.
      </p>`,
  })
  await sendEmail({ to: email, subject: `Cadastro não aprovado — ${settings.brandName}`, html })
}

/**
 * Envia link de verificação de email ao usuário
 * @param email - Endereço de email do usuário
 * @param token - Token de verificação
 */
export async function sendVerificationEmail(
	email: string,
	token: string
): Promise<void> {
	const settings = await getAppSettings()
	const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

	const html = brandedShell({
		brandName: settings.brandName,
		title: 'Verifique seu email',
		bodyHtml: `
			<p style="color:#3f3f46; line-height:1.6; margin-bottom:24px;">
				Obrigado por se cadastrar! Clique no botão abaixo para verificar seu email e concluir o cadastro.
			</p>
			<div style="text-align:center; margin:32px 0;">
				<a href="${verifyUrl}" style="background:#2563eb; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
					Verificar email
				</a>
			</div>
			<p style="color:#71717a; font-size:14px; line-height:1.6;">
				Se você não criou uma conta, ignore este email.
			</p>
			<p style="color:#71717a; font-size:14px; line-height:1.6; margin-top:24px;">
				Se o botão não funcionar, copie e cole este link no navegador:<br>
				<a href="${verifyUrl}" style="color:#2563eb; word-break:break-all;">${verifyUrl}</a>
			</p>`,
	})

	await sendEmail({
		to: email,
		subject: `Verifique seu email — ${settings.brandName}`,
		html,
	})
}

/**
 * Envia link de verificação quando o usuário altera seu email
 * @param email - Novo endereço de email do usuário
 * @param token - Token de verificação
 * @param userName - Nome do usuário para personalização
 */
export async function sendEmailChangeVerification(
	email: string,
	token: string,
	userName?: string
): Promise<void> {
	const settings = await getAppSettings()
	const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
	const greeting = userName ? `Olá ${userName},` : 'Olá,'

	const html = brandedShell({
		brandName: settings.brandName,
		title: 'Confirme seu novo email',
		bodyHtml: `
			<p style="color:#3f3f46; line-height:1.6; margin-bottom:24px;">
				${greeting}<br><br>
				Você solicitou a alteração do email associado à sua conta. Clique no botão abaixo para confirmar esta alteração e verificar seu novo email.
			</p>
			<div style="text-align:center; margin:32px 0;">
				<a href="${verifyUrl}" style="background:#2563eb; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
					Confirmar novo email
				</a>
			</div>
			<p style="color:#dc2626; font-size:14px; line-height:1.6; font-weight:500;">
				Até verificar este email, você não poderá acessar sua conta.
			</p>
			<p style="color:#71717a; font-size:14px; line-height:1.6;">
				Se você não solicitou essa alteração, entre em contato com a coordenação imediatamente.
			</p>
			<p style="color:#71717a; font-size:14px; line-height:1.6; margin-top:24px;">
				Se o botão não funcionar, copie e cole este link no navegador:<br>
				<a href="${verifyUrl}" style="color:#2563eb; word-break:break-all;">${verifyUrl}</a>
			</p>`,
	})

	await sendEmail({
		to: email,
		subject: `Confirme seu novo email — ${settings.brandName}`,
		html,
	})
}

/**
 * Envia link de redefinição de senha ao usuário
 * @param email - Endereço de email do usuário
 * @param token - Token de redefinição
 */
export async function sendPasswordResetEmail(
	email: string,
	token: string
): Promise<void> {
	const settings = await getAppSettings()
	const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

	const html = brandedShell({
		brandName: settings.brandName,
		title: 'Redefinir sua senha',
		bodyHtml: `
			<p style="color:#3f3f46; line-height:1.6; margin-bottom:24px;">
				Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.
			</p>
			<div style="text-align:center; margin:32px 0;">
				<a href="${resetUrl}" style="background:#2563eb; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
					Redefinir senha
				</a>
			</div>
			<p style="color:#71717a; font-size:14px; line-height:1.6;">
				Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.
			</p>
			<p style="color:#71717a; font-size:14px; line-height:1.6; margin-top:24px;">
				Se o botão não funcionar, copie e cole este link no navegador:<br>
				<a href="${resetUrl}" style="color:#2563eb; word-break:break-all;">${resetUrl}</a>
			</p>`,
	})

	await sendEmail({
		to: email,
		subject: `Redefinição de senha — ${settings.brandName}`,
		html,
	})
}
