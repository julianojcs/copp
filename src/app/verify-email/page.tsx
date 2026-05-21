'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function VerifyEmailContent() {
	const searchParams = useSearchParams()
	const token = searchParams.get('token')
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
	const [message, setMessage] = useState('')

	useEffect(() => {
		const verifyEmail = async () => {
			if (!token) {
				setStatus('error')
				setMessage('Link de verificação inválido.')
				return
			}

			try {
				const response = await fetch('/api/auth/verify-email', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token }),
				})

				const result = await response.json()

				if (response.ok) {
					setStatus('success')
					setMessage(result.message)
				} else {
					setStatus('error')
					setMessage(result.error)
				}
			} catch {
				setStatus('error')
				setMessage('Ocorreu um erro. Tente novamente.')
			}
		}

		verifyEmail()
	}, [token])

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-2xl font-bold text-center">
					Verificação de e-mail
				</CardTitle>
			</CardHeader>
			<CardContent className="text-center space-y-4">
				{status === 'loading' && (
					<>
						<Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
						<p className="text-muted-foreground">Verificando seu e-mail...</p>
					</>
				)}

				{status === 'success' && (
					<>
						<CheckCircle className="h-12 w-12 mx-auto text-green-500" />
						<p className="text-green-600 font-medium">{message}</p>
						<Link href="/login">
							<Button className="w-full">Acessar minha conta</Button>
						</Link>
					</>
				)}

				{status === 'error' && (
					<>
						<XCircle className="h-12 w-12 mx-auto text-destructive" />
						<p className="text-destructive font-medium">{message}</p>
						<Link href="/login">
							<Button variant="outline" className="w-full">
								Voltar para o login
							</Button>
						</Link>
					</>
				)}
			</CardContent>
		</Card>
	)
}

function LoadingFallback() {
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-2xl font-bold text-center">
					Verificação de e-mail
				</CardTitle>
			</CardHeader>
			<CardContent className="text-center space-y-4">
				<Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
				<p className="text-muted-foreground">Carregando...</p>
			</CardContent>
		</Card>
	)
}

export default function VerifyEmailPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
			<Suspense fallback={<LoadingFallback />}>
				<VerifyEmailContent />
			</Suspense>
		</div>
	)
}
