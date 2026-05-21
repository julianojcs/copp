'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { MESSAGES } from '@/lib/i18n'

export function LoginForm() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	})

	const callbackUrl = '/dashboard'

	const handleFormSubmit = async (data: LoginFormData) => {
		setIsLoading(true)

		try {
			const result = await signIn('credentials', {
				email: data.email,
				password: data.password,
				redirect: false,
			})

			if (result?.error) {
				switch (result.error) {
					case 'STATUS_PENDING':
						router.push('/aguardando-aprovacao')
						return
					case 'STATUS_REJECTED':
						toast.error(MESSAGES.auth.rejected)
						return
					case 'STATUS_INACTIVE':
						toast.error(MESSAGES.auth.inactive)
						return
					default:
						toast.error(MESSAGES.auth.invalidCredentials)
						return
				}
			}

			router.push(callbackUrl)
			router.refresh()
		} catch (err) {
			if (err instanceof TypeError && err.message.includes('fetch')) {
				toast.error('Não foi possível conectar ao servidor. Verifique sua conexão.')
			} else {
				toast.error('Ocorreu um erro inesperado. Tente novamente mais tarde.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleTogglePassword = () => {
		setShowPassword((prev) => !prev)
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-bold text-center">
					Bem-vindo de volta
				</CardTitle>
				<CardDescription className="text-center">
					Entre na sua conta
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								placeholder="voce@pf.gov.br"
								className="pl-10"
								disabled={isLoading}
								aria-describedby={errors.email ? 'email-error' : undefined}
								{...register('email')}
							/>
						</div>
						{errors.email && (
							<p id="email-error" className="text-sm text-destructive">
								{errors.email.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="password">Senha</Label>
							<Link
								href="/forgot-password"
								className="text-sm text-primary hover:underline"
								tabIndex={0}
							>
								Esqueci minha senha
							</Link>
						</div>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="••••••••"
								className="pl-10 pr-10"
								disabled={isLoading}
								aria-describedby={errors.password ? 'password-error' : undefined}
								{...register('password')}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
								onClick={handleTogglePassword}
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
							<p id="password-error" className="text-sm text-destructive">
								{errors.password.message}
							</p>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Entrando...
							</>
						) : (
							'Entrar'
						)}
					</Button>
				</form>
			</CardContent>
			<CardFooter className="flex justify-center">
				<p className="text-sm text-muted-foreground">
					Não tem uma conta?{' '}
					<Link href="/register" className="text-primary hover:underline">
						Cadastre-se
					</Link>
				</p>
			</CardFooter>
		</Card>
	)
}
