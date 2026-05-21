import { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Photo } from '@/models/photo'
import { Users, Image, Camera, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const metadata: Metadata = {
	title: 'Dashboard',
}

async function getStats() {
	await connectDB()

	const [totalUsers, totalPhotos, recentUsers] = await Promise.all([
		User.countDocuments({ isActive: true, status: 'approved' }),
		Photo.countDocuments({ isPublic: true }),
		User.find({ isActive: true, status: 'approved' })
			.select('name avatar role cargo lotacao')
			.sort({ createdAt: -1 })
			.limit(5)
			.lean(),
	])

	return { totalUsers, totalPhotos, recentUsers }
}

export default async function DashboardPage() {
	const session = await auth()
	const { totalUsers, totalPhotos, recentUsers } = await getStats()

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="border rounded-lg p-4 bg-muted/30">
				<h1 className="text-xl font-semibold text-foreground">
					Olá, {session?.user?.name?.split(' ')[0]}!
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Conecte-se com os colegas da turma e compartilhe suas memórias.
				</p>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<Link href="/colleagues">
					<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total de colegas
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{totalUsers}</div>
							<p className="text-xs text-muted-foreground">
								Participantes cadastrados
							</p>
						</CardContent>
					</Card>
				</Link>

				<Link href="/gallery">
					<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Fotos compartilhadas</CardTitle>
							<Image className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{totalPhotos}</div>
							<p className="text-xs text-muted-foreground">
								Memórias da turma
							</p>
						</CardContent>
					</Card>
				</Link>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Ações rápidas</CardTitle>
						<Camera className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Link href="/gallery">
							<Button variant="outline" className="w-full justify-start text-sm">
								<Camera className="mr-2 h-4 w-4" />
								Enviar foto
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* Novos membros */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Novos membros</CardTitle>
					<Link href="/colleagues">
						<Button variant="ghost" size="sm">
							Ver todos
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{recentUsers.length === 0 ? (
						<p className="text-muted-foreground text-center py-8">
							Nenhum membro ainda. Seja o primeiro!
						</p>
					) : (
						<div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-4">
							{recentUsers.map((user) => (
								<Link
									key={user._id.toString()}
									href={`/colleagues/${user._id}`}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full md:w-auto"
								>
									<Avatar>
										<AvatarImage src={user.avatar} alt={user.name} />
										<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-medium text-sm">{user.name}</p>
										<p className="text-xs text-muted-foreground capitalize">
											{user.role}
										</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
