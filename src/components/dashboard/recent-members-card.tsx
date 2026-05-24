import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface RecentMember {
	_id: string
	name: string
	avatar?: string
	role: string
	cargo?: string
	lotacaoSigla?: string
}

interface RecentMembersCardProps {
	members: RecentMember[]
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function getFirstName(name: string) {
	return name.split(' ')[0]
}

export function RecentMembersCard({ members }: RecentMembersCardProps) {
	if (members.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Novos membros</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-center py-8 text-sm">
						Nenhum membro ainda. Seja o primeiro!
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<>
			{/* Mobile: horizontal "stories"-like carousel */}
			<section className="lg:hidden" aria-labelledby="recent-members-mobile">
				<div className="mb-3 flex items-center justify-between">
					<h2
						id="recent-members-mobile"
						className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
					>
						Novos membros
					</h2>
					<Link href="/colleagues">
						<Button variant="ghost" size="sm">
							Ver todos
							<ArrowRight className="ml-1 h-4 w-4" />
						</Button>
					</Link>
				</div>
				<ul className="flex snap-x gap-4 overflow-x-auto pb-2">
					{members.map((member) => (
						<li key={member._id} className="snap-start">
							<Link
								href={`/colleagues/${member._id}`}
								className="flex w-20 flex-col items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted"
							>
								<Avatar className="h-16 w-16">
									<AvatarImage src={member.avatar} alt={member.name} />
									<AvatarFallback>{getInitials(member.name)}</AvatarFallback>
								</Avatar>
								<span className="w-full truncate text-center text-xs">
									{getFirstName(member.name)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>

			{/* Desktop: vertical list inside a card */}
			<Card className="hidden lg:block">
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle>Novos membros</CardTitle>
					<Link href="/colleagues">
						<Button variant="ghost" size="sm">
							Ver todos
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-1">
						{members.map((member) => (
							<li key={member._id}>
								<Link
									href={`/colleagues/${member._id}`}
									className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
								>
									<Avatar>
										<AvatarImage src={member.avatar} alt={member.name} />
										<AvatarFallback>{getInitials(member.name)}</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{member.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{member.cargo || member.role}
											{member.lotacaoSigla ? ` · ${member.lotacaoSigla}` : ''}
										</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</>
	)
}
