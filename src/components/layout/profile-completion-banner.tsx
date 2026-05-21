'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { X, UserCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { USER_ROLES } from '@/lib/constants'

const STORAGE_KEY = 'copp_profile_banner_dismissed'

export function ProfileCompletionBanner() {
	const { data: session } = useSession()
	const router = useRouter()
	const [isDismissed, setIsDismissed] = useState(false)
	const [isClient, setIsClient] = useState(false)

	// Garantir que estamos no lado do cliente
	useEffect(() => {
		setIsClient(true)

		if (typeof window !== 'undefined') {
			const dismissed = localStorage.getItem(STORAGE_KEY)
			if (dismissed === 'true') {
				setIsDismissed(true)
			}
		}
	}, [])

	if (!isClient || !session?.user || isDismissed) {
		return null
	}

	const u = session.user
	const isAdmin = u.role === USER_ROLES.ADMIN

	// Campos obrigatórios: whatsapp, lotacao, e cargo (exceto admin)
	const missingFields: string[] = []
	if (!u.whatsapp) missingFields.push('WhatsApp')
	if (!u.lotacao) missingFields.push('Lotação')
	if (!isAdmin && !u.cargo) missingFields.push('Cargo')

	const isProfileComplete = missingFields.length === 0

	// Se completo, dispensar permanentemente
	if (isProfileComplete) {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, 'true')
		}
		return null
	}

	const handleDismiss = () => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, 'true')
		}
		setIsDismissed(true)
	}

	return (
		<div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6 relative">
			<button
				onClick={handleDismiss}
				className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
				aria-label="Fechar aviso"
			>
				<X className="h-5 w-5" />
			</button>

			<div className="flex items-start gap-4">
				<div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-800/50 rounded-full">
					<UserCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-amber-900 dark:text-amber-100 text-lg">
						Complete seu perfil para acessar o diretório!
					</h3>
					<p className="text-amber-700 dark:text-amber-300 mt-1 text-sm">
						Falta{missingFields.length > 1 ? 'm' : ''} preencher:{' '}
						<strong>{missingFields.join(', ')}</strong>.
					</p>

					<Button
						onClick={() => router.push('/profile?complete=1')}
						className="mt-4 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white"
					>
						Completar perfil
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
