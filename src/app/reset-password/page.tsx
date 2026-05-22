import { Suspense } from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
	title: 'Redefinir senha',
	description: 'Escolha uma nova senha para sua conta',
}

export default async function ResetPasswordPage() {
	const session = await auth()

	if (session?.user) {
		redirect('/dashboard')
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
			<Suspense
				fallback={
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				}
			>
				<ResetPasswordForm />
			</Suspense>
		</div>
	)
}
