import Link from 'next/link'
import { Users, Image as ImageIcon, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface StatsRailProps {
	totalUsers: number
	totalPhotos: number
}

export function StatsRail({ totalUsers, totalPhotos }: StatsRailProps) {
	return (
		<div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
			<Link
				href="/colleagues"
				className="min-w-[75%] flex-shrink-0 snap-start sm:min-w-[60%] lg:min-w-0 lg:flex-shrink lg:snap-align-none"
			>
				<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
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

			<Link
				href="/gallery"
				className="min-w-[75%] flex-shrink-0 snap-start sm:min-w-[60%] lg:min-w-0 lg:flex-shrink lg:snap-align-none"
			>
				<Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Fotos compartilhadas
						</CardTitle>
						<ImageIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalPhotos}</div>
						<p className="text-xs text-muted-foreground">Memórias da turma</p>
					</CardContent>
				</Card>
			</Link>

			<Card className="min-w-[75%] flex-shrink-0 snap-start sm:min-w-[60%] lg:min-w-0 lg:flex-shrink lg:snap-align-none">
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
	)
}
