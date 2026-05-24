import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/date-utils'
import type { NewMemberEvent } from '@/lib/timeline-types'

interface Props {
	event: NewMemberEvent
}

function getInitials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

export function NewMemberItem({ event }: Props) {
	const { user } = event
	return (
		<Card aria-label="Novo membro entrou">
			<CardContent className="flex items-center gap-3 py-4">
				<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
					<UserPlus className="h-4 w-4 text-primary" aria-hidden />
				</div>
				<Link
					href={`/colleagues/${user._id}`}
					className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80"
				>
					<Avatar>
						<AvatarImage src={user.avatar ?? undefined} alt={user.name} />
						<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="text-sm">
							<span className="font-semibold">{user.name}</span>{' '}
							<span className="text-muted-foreground">entrou na turma</span>
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{[user.cargo, user.lotacaoSigla].filter(Boolean).join(' · ')}
							{' · '}
							{formatRelativeTime(event.createdAt)}
						</p>
					</div>
				</Link>
			</CardContent>
		</Card>
	)
}
