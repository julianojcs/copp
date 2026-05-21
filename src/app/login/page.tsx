import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
	title: 'Entrar',
	description: 'Acesse sua conta',
}

export default async function LoginPage() {
	const session = await auth()

	if (session?.user) {
		redirect('/dashboard')
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
			<LoginForm />
		</div>
	)
}
