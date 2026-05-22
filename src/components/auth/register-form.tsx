'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Lock, Eye, EyeOff, User, Phone, MapPin } from 'lucide-react'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { LotacaoSelect, type LotacaoOption } from '@/components/profile/lotacao-select'
import { PF_CARGOS } from '@/lib/constants'
import { CARGO_LABELS } from '@/lib/i18n'
import { registerSchema, type RegisterFormData } from '@/lib/validations'

export function RegisterForm() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [selectedLotacao, setSelectedLotacao] = useState<LotacaoOption | null>(null)

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
	})

	const lotacaoId = watch('lotacaoId')

	const handleLotacaoChange = (option: LotacaoOption | null) => {
		setSelectedLotacao(option)
		setValue('lotacaoId', option?.id ?? '', { shouldValidate: true })
	}

	const handleFormSubmit = async (data: RegisterFormData) => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			const result = await response.json()

			if (!response.ok) {
				setError(result.error || 'Erro ao criar conta. Verifique seus dados e tente novamente.')
				return
			}

			router.push('/aguardando-aprovacao')
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
					Criar conta
				</CardTitle>
				<CardDescription className="text-center">
					Cadastre-se no sistema da turma
				</CardDescription>
			</CardHeader>
			<CardContent>
				{error && (
					<div
						className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4"
						role="alert"
					>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					{/* Nome completo */}
					<div className="space-y-2">
						<Label htmlFor="name">Nome completo</Label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="name"
								placeholder="João Silva"
								className="pl-10"
								disabled={isLoading}
								{...register('name')}
							/>
						</div>
						{errors.name && (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						)}
					</div>

					{/* Email */}
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
								{...register('email')}
							/>
						</div>
						{errors.email && (
							<p className="text-sm text-destructive">{errors.email.message}</p>
						)}
					</div>

					{/* Senha + Confirmar senha */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="password">Senha</Label>
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
									onClick={() => setShowPassword(!showPassword)}
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
								<p className="text-sm text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirmar</Label>
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
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									tabIndex={0}
									aria-label={
										showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
									}
								>
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4 text-muted-foreground" />
									) : (
										<Eye className="h-4 w-4 text-muted-foreground" />
									)}
								</Button>
							</div>
							{errors.confirmPassword && (
								<p className="text-sm text-destructive">
									{errors.confirmPassword.message}
								</p>
							)}
						</div>
					</div>

					{/* WhatsApp */}
					<div className="space-y-2">
						<Label htmlFor="whatsapp">WhatsApp</Label>
						<div className="relative">
							<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								id="whatsapp"
								placeholder="(11) 99999-9999"
								className="pl-10"
								disabled={isLoading}
								{...register('whatsapp')}
							/>
						</div>
						{errors.whatsapp && (
							<p className="text-sm text-destructive">{errors.whatsapp.message}</p>
						)}
					</div>

					{/* Lotação */}
					<div className="space-y-2">
						<Label htmlFor="lotacaoId">Lotação</Label>
						<input type="hidden" {...register('lotacaoId')} value={lotacaoId || ''} readOnly />
						<LotacaoSelect
							id="lotacaoId"
							value={lotacaoId || null}
							onChange={handleLotacaoChange}
							disabled={isLoading}
						/>
						{errors.lotacaoId && (
							<p className="text-sm text-destructive">{errors.lotacaoId.message}</p>
						)}
					</div>

					{/* Cargo */}
					<div className="space-y-2">
						<Label htmlFor="cargo">Cargo</Label>
						<Select
							onValueChange={(v) => setValue('cargo', v as keyof typeof CARGO_LABELS, { shouldValidate: true })}
							disabled={isLoading}
						>
							<SelectTrigger id="cargo">
								<SelectValue placeholder="Selecione seu cargo" />
							</SelectTrigger>
							<SelectContent>
								{Object.values(PF_CARGOS).map((c) => (
									<SelectItem key={c} value={c}>
										{CARGO_LABELS[c]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.cargo && (
							<p className="text-sm text-destructive">{errors.cargo.message}</p>
						)}
					</div>

					{/* Localização derivada (read-only) */}
					{selectedLotacao && (
						<div
							className="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm"
							aria-live="polite"
						>
							<MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
							<div className="text-muted-foreground">
								Localização derivada da lotação:{' '}
								<span className="font-medium text-foreground">
									{selectedLotacao.cidade}/{selectedLotacao.uf}
								</span>
							</div>
						</div>
					)}

					{/* Bio (opcional) */}
					<div className="space-y-2">
						<Label htmlFor="bio">
							Mini bio{' '}
							<span className="text-muted-foreground text-xs">(opcional)</span>
						</Label>
						<textarea
							id="bio"
							rows={3}
							className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Breve apresentação..."
							{...register('bio')}
							disabled={isLoading}
						/>
						{errors.bio && (
							<p className="text-sm text-destructive">
								{errors.bio.message}
							</p>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Criando conta...
							</>
						) : (
							'Criar conta'
						)}
					</Button>
				</form>
			</CardContent>
			<CardFooter className="flex justify-center">
				<p className="text-sm text-muted-foreground">
					Já tem uma conta?{' '}
					<Link href="/login" className="text-primary hover:underline">
						Entrar
					</Link>
				</p>
			</CardFooter>
		</Card>
	)
}
