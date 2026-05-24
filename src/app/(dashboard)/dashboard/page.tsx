import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { Photo } from '@/models/photo'
import {
	StatsRail,
	RecentMembersCard,
	TimelinePlaceholder,
	type RecentMember,
} from '@/components/dashboard'

export const metadata: Metadata = {
	title: 'Dashboard',
}

interface DashboardStats {
	totalUsers: number
	totalPhotos: number
	recentUsers: RecentMember[]
}

async function getStats(): Promise<DashboardStats> {
	await connectDB()

	const [totalUsers, totalPhotos, rawRecentUsers] = await Promise.all([
		User.countDocuments({ isActive: true, status: 'approved' }),
		Photo.countDocuments({ isPublic: true }),
		User.find({ isActive: true, status: 'approved' })
			.select('name avatar role cargo lotacaoSigla')
			.sort({ createdAt: -1 })
			.limit(5)
			.lean(),
	])

	const recentUsers: RecentMember[] = rawRecentUsers.map((u) => ({
		_id: u._id.toString(),
		name: u.name,
		avatar: u.avatar,
		role: u.role,
		cargo: u.cargo,
		lotacaoSigla: u.lotacaoSigla,
	}))

	return { totalUsers, totalPhotos, recentUsers }
}

export default async function DashboardPage() {
	const session = await auth()
	const { totalUsers, totalPhotos, recentUsers } = await getStats()

	return (
		<div className="space-y-6">
			{/* Welcome */}
			<div className="border rounded-lg p-4 bg-muted/30">
				<h1 className="text-xl font-semibold text-foreground">
					Olá, {session?.user?.name?.split(' ')[0]}!
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Conecte-se com os colegas da turma e compartilhe suas memórias.
				</p>
			</div>

			{/* Main grid: timeline (col-span-8) + sidebar (col-span-4) on desktop.
			    Mobile uses `display: contents` on the sidebar so Stats and Recent
			    members become direct grid items, interleaved with the timeline via
			    `order`. Desktop turns the sidebar into a real flex container that
			    sticks as a single unit — preventing Recent Members from overlapping
			    Stats while the timeline scrolls. */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Timeline — mobile: middle (order-2); desktop: main column */}
				<main className="order-2 min-w-0 lg:order-0 lg:col-span-8 lg:col-start-1 lg:row-start-1">
					<TimelinePlaceholder />
				</main>

				{/* Sidebar wrapper: Stats + Recent share a single sticky container on desktop */}
				<aside className="contents lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-6 lg:self-start">
					{/* Stats — mobile: top (order-1) */}
					<div className="order-1 lg:order-0">
						<StatsRail totalUsers={totalUsers} totalPhotos={totalPhotos} />
					</div>

					{/* Recent members — mobile: bottom (order-3) */}
					<div className="order-3 lg:order-0">
						<RecentMembersCard members={recentUsers} />
					</div>
				</aside>
			</div>
		</div>
	)
}
