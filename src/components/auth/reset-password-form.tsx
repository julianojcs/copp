'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations'

export function ResetPasswordForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get('token') || ''

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
	})

	if (!token) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center text-destructive">
						Link inválido
					</CardTitle>
					<CardDescription className="text-center">
						O link de redefinição é inválido ou está incompleto.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center space-y-4">
					<p className="text-sm text-muted-foreground">
						Solicite um novo link em &quot;Esqueci minha senha&quot;.
					</p>
					<Link href="/forgot-password">
						<Button variant="outline" className="w-full">
							Solicitar novo link
						</Button>
					</Link>
					<Link href="/login">
						<Button variant="ghost" className="w-full">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Voltar para o login
						</Button>
					</Link>
				</CardContent>
			</Card>
		)
	}

	if (success) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center text-green-600">
						Senha redefinida!
					</CardTitle>
					<CardDescription className="text-center">
						Você já pode entrar com sua nova senha.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center space-y-4">
					<Link href="/login">
						<Button className="w-full">Ir para o login</Button>
					</Link>
				</CardContent>
			</Card>
		)
	}

	const handleFormSubmit = async (data: ResetPasswordFormData) => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token,
					password: data.password,
					confirmPassword: data.confirmPassword,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				setError(result.error || 'Não foi possível redefinir a senha. Tente novamente.')
				return
			}

			setSuccess(true)
			setTimeout(() => router.push('/login'), 2500)
		} catch (err) {
			if (err instanceof TypeError && err.message.includes('fetch')) {
				setError('Não foi possível conectar ao servidor. Verifique sua conexão.')
			} else {
				setError('Ocorreu um erro inesperado. Tente novamente mais tarde.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-bold text-center">
					Definir nova senha
				</CardTitle>
				<CardDescription className="text-center">
					Escolha uma senha com ao menos 8 caracteres, uma maiúscula, uma minúscula e um número.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div
						className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
						role="alert"
					>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="password">Nova senha</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								className="pl-10 pr-10"
								disabled={isLoading}
								{...register('password')}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
								onClick={() => setShowPassword((v) => !v)}
								tabIndex={0}
								aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4 text-muted-foreground" />
								) : (
									<Eye className="h-4 w-4 text-muted-foreground" />
								)}
							</Button>
						</div>
						{errors.password && (
							<p className="text-sm text-destructive">{errors.password.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirmar nova senha</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="••••••••"
								className="pl-10 pr-10"
								disabled={isLoading}
								{...register('confirmPassword')}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
								onClick={() => setShowConfirmPassword((v) => !v)}
								tabIndex={0}
								aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
							>
								{showConfirmPassword ? (
									<EyeOff className="h-4 w-4 text-muted-foreground" />
								) : (
									<Eye className="h-4 w-4 text-muted-foreground" />
								)}
							</Button>
						</div>
						{errors.confirmPassword && (
							<p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Redefinindo...
							</>
						) : (
							'Redefinir senha'
						)}
					</Button>
				</form>

				<div className="text-center">
					<Link
						href="/login"
						className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar para o login
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
