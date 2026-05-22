import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import {
	MapPin,
	Mail,
	Linkedin,
	Instagram,
	ArrowLeft,
	GraduationCap,
	CheckCircle2,
	AlertCircle,
	Twitter,
	MessageCircle,
} from 'lucide-react'
import { getStateName } from '@/lib/constants/brazilian-states'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Photo } from '@/models/photo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'

interface PageParams {
	params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
	const { id } = await params
	await connectDB()
	const user = await User.findById(id).lean()

	if (!user) {
		return { title: 'Usuário não encontrado' }
	}

	return { title: user.name }
}

const roleColors: Record<string, string> = {
	aluno: 'bg-blue-500/10 text-blue-500',
	instrutor: 'bg-purple-500/10 text-purple-500',
	coordenador: 'bg-orange-500/10 text-orange-500',
	admin: 'bg-gray-500/10 text-gray-500',
}

export default async function ColleagueDetailPage({ params }: PageParams) {
	const { id } = await params
	const session = await auth()

	await connectDB()

	const [user, photos] = await Promise.all([
		User.findById(id)
			.select('-password -verificationToken -resetPasswordToken')
			.lean(),
		Photo.find({ uploadedBy: id, isPublic: true })
			.sort({ createdAt: -1 })
			.limit(6)
			.lean(),
	])

	if (!user) {
		notFound()
	}

	const isOwnProfile = session?.user?.id === id

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Back Button */}
			<Link href="/colleagues">
				<Button variant="ghost" size="sm">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Voltar para colegas
				</Button>
			</Link>

			{/* Profile Card */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
						<Avatar className="h-32 w-32 ring-4 ring-offset-4 ring-primary/20">
							<AvatarImage src={user.avatar} alt={user.name} />
							<AvatarFallback className="text-4xl bg-primary/10">
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>

						<div className="flex-1 text-center md:text-left">
							<div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
								<h1 className="text-3xl font-bold">{user.name}</h1>
								<Badge
									className={`${roleColors[user.role] || 'bg-gray-500/10 text-gray-500'} w-fit mx-auto md:mx-0`}
								>
									{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
								</Badge>
							</div>

							<div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-4">
								<GraduationCap className="h-4 w-4" />
								<span>{user.courseName}</span>
							</div>

							{user.lotacaoSigla && (
								<div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-2">
									<MapPin className="h-4 w-4" />
									<span>
										<span className="font-medium text-foreground">{user.lotacaoSigla}</span>
										{user.lotacaoNome && (
											<span className="text-muted-foreground"> — {user.lotacaoNome}</span>
										)}
										{user.lotacaoTipo && (
											<span className="block text-xs">{user.lotacaoTipo}</span>
										)}
									</span>
								</div>
							)}

							{(user.city || user.state) && (
								<div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-6">
									<MapPin className="h-4 w-4" />
									<span>
										{user.city ? `${user.city} — ${getStateName(user.state || '') || user.state || ''}` : getStateName(user.state || '') || user.state || ''}
									</span>
								</div>
							)}

							{user.bio && (
								<div className="mb-6 py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
									<p className="text-foreground/90 whitespace-pre-wrap italic text-sm md:text-base leading-relaxed">
										&quot;{user.bio}&quot;
									</p>
								</div>
							)}

							<div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
								{user.email && (
									<Button variant="outline" size="sm" asChild className="relative">
										<a href={`mailto:${user.email}`}>
											<Mail className="mr-2 h-4 w-4" />
											Email
											<div className="absolute -top-1 -right-1">
												{user.emailVerified ? (
													<CheckCircle2 className="h-3 w-3 text-green-500 fill-white" />
												) : (
													<AlertCircle className="h-3 w-3 text-amber-500 fill-white" />
												)}
											</div>
										</a>
									</Button>
								)}

								{user.whatsapp && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<MessageCircle className="mr-2 h-4 w-4" />
											WhatsApp
										</a>
									</Button>
								)}

								{isOwnProfile && (
									<Link href="/profile">
										<Button size="sm">Editar perfil</Button>
									</Link>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Social Links */}
			{(user.linkedin || user.instagram || user.twitter) && (
				<Card>
					<CardHeader>
						<CardTitle>Redes sociais</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-4">
						{user.linkedin && (
							<Button variant="outline" className="border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30" asChild>
								<a
									href={user.linkedin}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Linkedin className="mr-2 h-4 w-4 text-blue-600" />
									<span className="text-blue-700 dark:text-blue-300">LinkedIn</span>
								</a>
							</Button>
						)}

						{user.instagram && (
							<Button variant="outline" className="border-pink-200 dark:border-pink-900/50 hover:bg-pink-50 dark:hover:bg-pink-950/30" asChild>
								<a
									href={`https://instagram.com/${user.instagram.replace('@', '')}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Instagram className="mr-2 h-4 w-4 text-pink-600" />
									<span className="text-pink-700 dark:text-pink-300">@{user.instagram.replace('@', '')}</span>
								</a>
							</Button>
						)}

						{user.twitter && (
							<Button variant="outline" className="border-sky-200 dark:border-sky-900/50 hover:bg-sky-50 dark:hover:bg-sky-950/30" asChild>
								<a
									href={`https://x.com/${user.twitter.replace('@', '')}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Twitter className="mr-2 h-4 w-4 text-sky-500" />
									<span className="text-sky-700 dark:text-sky-300">@{user.twitter.replace('@', '')}</span>
								</a>
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{/* Photos */}
			{photos.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Fotos</CardTitle>
						<Link href={`/gallery?userId=${id}`}>
							<Button variant="ghost" size="sm">
								View all
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							{photos.map((photo) => (
								<div
									key={photo._id.toString()}
									className="relative aspect-square rounded-lg overflow-hidden"
								>
									<Image
										src={photo.thumbnailUrl || photo.url}
										alt={photo.title || 'Photo'}
										fill
										className="object-cover hover:scale-105 transition-transform"
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
