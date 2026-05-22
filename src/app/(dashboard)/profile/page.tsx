'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Camera, Save, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { profileSchema, type ProfileFormData, changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations'
import { USER_ROLES, PF_CARGOS } from '@/lib/constants'
import { ROLE_LABELS, CARGO_LABELS } from '@/lib/i18n'
import { StateSelect } from '@/components/profile/state-select'
import { CitySelect } from '@/components/profile/city-select'
import { useIBGE } from '@/hooks/use-ibge'

export default function ProfilePage() {
	const { data: session, update } = useSession()
	const [isLoading, setIsLoading] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
	const [showOnboardingBanner, setShowOnboardingBanner] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const searchParams = useSearchParams()

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: session?.user?.name || '',
			email: session?.user?.email || '',
			role: (session?.user?.role as ProfileFormData['role']) || USER_ROLES.ALUNO,
			cargo: (session?.user?.cargo as ProfileFormData['cargo']) || undefined,
			lotacao: session?.user?.lotacao || '',
			whatsapp: session?.user?.whatsapp || '',
			state: session?.user?.state || '',
			city: session?.user?.city || '',
			linkedin: session?.user?.linkedin || '',
			instagram: session?.user?.instagram || '',
			twitter: session?.user?.twitter || '',
			bio: session?.user?.bio || '',
		},
	})

	const selectedRole = watch('role')
	const selectedCargo = watch('cargo')
	const selectedState = watch('state') || ''
	const selectedCity = watch('city') || ''
	const isAdmin = selectedRole === USER_ROLES.ADMIN

	const { states, cities, loadingStates, loadingCities, setSelectedUF } = useIBGE(selectedState)

	const handleStateChange = (uf: string) => {
		setValue('state', uf, { shouldValidate: true })
		setValue('city', '', { shouldValidate: false })
		setSelectedUF(uf)
	}

	const handleCityChange = (city: string) => {
		setValue('city', city, { shouldValidate: true })
	}

	const {
		register: registerPassword,
		handleSubmit: handleSubmitPassword,
		reset: resetPassword,
		formState: { errors: passwordErrors },
	} = useForm<ChangePasswordFormData>({ resolver: zodResolver(changePasswordSchema) })

	const [isPasswordLoading, setIsPasswordLoading] = useState(false)

	const onChangePassword = async (data: ChangePasswordFormData) => {
		if (!session?.user?.id) return
		setIsPasswordLoading(true)
		try {
			const res = await fetch(`/api/users/${session.user.id}/change-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})
			const result = await res.json()
			if (!res.ok) throw new Error(result.error || 'Erro ao alterar senha')
			toast.success('Senha alterada com sucesso.')
			resetPassword()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
		} finally {
			setIsPasswordLoading(false)
		}
	}

	// Update form values when session is loaded
	useEffect(() => {
		if (session?.user) {
			reset({
				name: session.user.name || '',
				email: session.user.email || '',
				role: (session.user.role as ProfileFormData['role']) || USER_ROLES.ALUNO,
				cargo: (session.user.cargo as ProfileFormData['cargo']) || undefined,
				lotacao: session.user.lotacao || '',
				whatsapp: session.user.whatsapp || '',
				state: session.user.state || '',
				city: session.user.city || '',
				linkedin: session.user.linkedin || '',
				instagram: session.user.instagram || '',
				twitter: session.user.twitter || '',
				bio: session.user.bio || '',
			})
			if (session.user.state) {
				setSelectedUF(session.user.state)
			}
		}
	}, [session, reset, setSelectedUF])

	// Check for onboarding / complete parameter
	useEffect(() => {
		const param = searchParams.get('onboarding') || searchParams.get('complete')
		if (param) {
			setShowOnboardingBanner(true)
			window.history.replaceState({}, '', '/profile')
		}
	}, [searchParams])

	const handleAvatarClick = () => {
		fileInputRef.current?.click()
	}

	const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			toast.error('Selecione uma imagem válida (JPEG, PNG ou WebP)')
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error('O arquivo deve ter no máximo 5MB')
			return
		}

		setAvatarPreview(URL.createObjectURL(file))
		setIsUploading(true)

		try {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('type', 'avatar')

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Falha no envio')
			}

			const result = await response.json()
			await update({ avatar: result.url })
			toast.success('Foto de perfil atualizada!')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erro ao enviar foto')
			setAvatarPreview(null)
		} finally {
			setIsUploading(false)
		}
	}

	const handleFormSubmit = async (data: ProfileFormData) => {
		if (!session?.user?.id) return

		setIsLoading(true)

		try {
			const response = await fetch(`/api/users/${session.user.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'Erro ao atualizar perfil')
			}

			await update({
				name: data.name,
				email: data.email,
				role: data.role,
				cargo: data.cargo,
				lotacao: data.lotacao,
				whatsapp: data.whatsapp,
				state: data.state,
				city: data.city,
				linkedin: data.linkedin,
				instagram: data.instagram,
				twitter: data.twitter,
				bio: data.bio,
				profileCompleted: result.user?.profileCompleted ?? false,
			})

			toast.success('Perfil atualizado com sucesso!')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
		} finally {
			setIsLoading(false)
		}
	}

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Meu Perfil</h1>
				<p className="text-muted-foreground">
					Gerencie suas informações e perfil público
				</p>
			</div>

			{/* Banner de boas-vindas / completar perfil */}
			{showOnboardingBanner && (
				<div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white relative">
					<button
						onClick={() => setShowOnboardingBanner(false)}
						className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
						aria-label="Fechar aviso"
					>
						<X className="h-5 w-5" />
					</button>
					<div className="flex items-start gap-4">
						<div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
							<Sparkles className="h-8 w-8" />
						</div>
						<div>
							<h2 className="text-xl font-bold mb-2">
								Complete seu cadastro!
							</h2>
							<p className="text-blue-100">
								Para acessar o sistema, preencha seu <strong>WhatsApp</strong>, <strong>lotação</strong>
								{!isAdmin && <> e <strong>cargo</strong></>} antes de continuar.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Foto de Perfil */}
			<Card>
				<CardHeader>
					<CardTitle>Foto de Perfil</CardTitle>
				</CardHeader>
				<CardContent className="flex items-center gap-6">
					<div className="relative">
						<Avatar className="h-24 w-24">
							<AvatarImage
								src={avatarPreview || session?.user?.avatar}
								alt={session?.user?.name}
							/>
							<AvatarFallback className="text-2xl">
								{getInitials(session?.user?.name || '')}
							</AvatarFallback>
						</Avatar>
						{isUploading && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
								<Loader2 className="h-6 w-6 animate-spin text-white" />
							</div>
						)}
					</div>
					<div>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleAvatarChange}
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
						/>
						<Button
							variant="outline"
							onClick={handleAvatarClick}
							disabled={isUploading}
						>
							<Camera className="mr-2 h-4 w-4" />
							Alterar foto
						</Button>
						<p className="text-xs text-muted-foreground mt-2">
							JPG, PNG ou WebP. Máximo 5MB.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Formulário de Perfil */}
			<Card>
				<CardHeader>
					<CardTitle>Informações do Perfil</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							{/* Nome completo */}
							<div className="col-span-2 space-y-2">
								<Label htmlFor="name">Nome Completo</Label>
								<Input id="name" {...register('name')} disabled={isLoading} />
								{errors.name && (
									<p className="text-sm text-destructive">
										{errors.name.message}
									</p>
								)}
							</div>

							{/* Email */}
							<div className="col-span-2 space-y-2">
								<div className="flex items-center gap-2">
									<Label htmlFor="email">E-mail</Label>
									{session?.user?.isEmailVerified ? (
										<div className="flex items-center gap-1 text-xs text-green-600 font-medium">
											<CheckCircle2 className="h-3 w-3" />
											<span>Verificado</span>
										</div>
									) : (
										<div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
											<AlertCircle className="h-3 w-3" />
											<span>Não verificado</span>
										</div>
									)}
								</div>
								<Input id="email" type="email" {...register('email')} disabled={isLoading} />
								{errors.email && (
									<p className="text-sm text-destructive">
										{errors.email.message}
									</p>
								)}
							</div>

							{/* Função */}
							<div className="space-y-2">
								<Label htmlFor="role">Função</Label>
								<Select
									value={selectedRole}
									onValueChange={(value) =>
										setValue('role', value as ProfileFormData['role'])
									}
									disabled={isLoading || session?.user?.role !== USER_ROLES.ADMIN}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione a função" />
									</SelectTrigger>
									<SelectContent>
										{Object.values(USER_ROLES).map((role) => (
											<SelectItem key={role} value={role}>
												{ROLE_LABELS[role]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.role && (
									<p className="text-sm text-destructive">
										{errors.role.message}
									</p>
								)}
							</div>

							{/* Cargo (obrigatório para não-admin) */}
							{!isAdmin && (
								<div className="space-y-2">
									<Label htmlFor="cargo">
										Cargo <span className="text-destructive">*</span>
									</Label>
									<Select
										value={selectedCargo ?? ''}
										onValueChange={(value) =>
											setValue('cargo', value as ProfileFormData['cargo'], { shouldValidate: true })
										}
										disabled={isLoading}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione o cargo" />
										</SelectTrigger>
										<SelectContent>
											{Object.values(PF_CARGOS).map((cargo) => (
												<SelectItem key={cargo} value={cargo}>
													{CARGO_LABELS[cargo]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.cargo && (
										<p className="text-sm text-destructive">
											{errors.cargo.message}
										</p>
									)}
								</div>
							)}

							{/* Lotação */}
							<div className="col-span-2 space-y-2">
								<Label htmlFor="lotacao">
									Lotação <span className="text-destructive">*</span>
								</Label>
								<Input
									id="lotacao"
									placeholder="Ex: SR/DPF/DF, DELEPAC, ANP"
									{...register('lotacao')}
									disabled={isLoading}
								/>
								{errors.lotacao && (
									<p className="text-sm text-destructive">
										{errors.lotacao.message}
									</p>
								)}
							</div>

							{/* WhatsApp */}
							<div className="col-span-2 space-y-2">
								<Label htmlFor="whatsapp">
									WhatsApp <span className="text-destructive">*</span>
								</Label>
								<Input
									id="whatsapp"
									placeholder="(61) 99999-9999"
									{...register('whatsapp')}
									disabled={isLoading}
								/>
								{errors.whatsapp && (
									<p className="text-sm text-destructive">
										{errors.whatsapp.message}
									</p>
								)}
							</div>

							{/* Estado */}
							<div className="space-y-2">
								<Label htmlFor="state">
									Estado <span className="text-destructive">*</span>
								</Label>
								<StateSelect
									id="state"
									value={selectedState}
									onValueChange={handleStateChange}
									states={states}
									loading={loadingStates}
									disabled={isLoading}
								/>
								{errors.state && (
									<p className="text-sm text-destructive">
										{errors.state.message}
									</p>
								)}
							</div>

							{/* Cidade (opcional, depende de Estado) */}
							<div className="space-y-2">
								<Label htmlFor="city">Cidade</Label>
								<CitySelect
									id="city"
									value={selectedCity}
									onValueChange={handleCityChange}
									cities={cities}
									loading={loadingCities}
									disabled={isLoading}
									hasState={!!selectedState}
								/>
								{errors.city && (
									<p className="text-sm text-destructive">
										{errors.city.message}
									</p>
								)}
							</div>

							{/* LinkedIn */}
							<div className="col-span-2 space-y-2">
								<Label htmlFor="linkedin">LinkedIn</Label>
								<Input
									id="linkedin"
									placeholder="https://linkedin.com/in/seuperfil"
									{...register('linkedin')}
									disabled={isLoading}
								/>
								{errors.linkedin && (
									<p className="text-sm text-destructive">
										{errors.linkedin.message}
									</p>
								)}
							</div>

							{/* Instagram */}
							<div className="space-y-2">
								<Label htmlFor="instagram">Instagram</Label>
								<Input
									id="instagram"
									placeholder="@usuario"
									{...register('instagram')}
									disabled={isLoading}
								/>
							</div>

							{/* X (Twitter) */}
							<div className="space-y-2">
								<Label htmlFor="twitter">X (Twitter)</Label>
								<Input
									id="twitter"
									placeholder="@usuario"
									{...register('twitter')}
									disabled={isLoading}
								/>
							</div>

							{/* Bio */}
							<div className="col-span-2 space-y-2">
								<Label htmlFor="bio">Mini Bio</Label>
								<textarea
									id="bio"
									rows={4}
									className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
									placeholder="Conte um pouco sobre você..."
									{...register('bio')}
									disabled={isLoading}
								/>
								{errors.bio && (
									<p className="text-sm text-destructive">
										{errors.bio.message}
									</p>
								)}
							</div>
						</div>

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Salvando...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Salvar alterações
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Alterar Senha */}
			<Card>
				<CardHeader>
					<CardTitle>Alterar senha</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">Senha atual</Label>
							<Input
								id="currentPassword"
								type="password"
								{...registerPassword('currentPassword')}
								disabled={isPasswordLoading}
							/>
							{passwordErrors.currentPassword && (
								<p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="newPassword">Nova senha</Label>
							<Input
								id="newPassword"
								type="password"
								{...registerPassword('newPassword')}
								disabled={isPasswordLoading}
							/>
							{passwordErrors.newPassword && (
								<p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirmar nova senha</Label>
							<Input
								id="confirmPassword"
								type="password"
								{...registerPassword('confirmPassword')}
								disabled={isPasswordLoading}
							/>
							{passwordErrors.confirmPassword && (
								<p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
							)}
						</div>
						<Button type="submit" disabled={isPasswordLoading}>
							{isPasswordLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Alterando...
								</>
							) : (
								'Alterar senha'
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
