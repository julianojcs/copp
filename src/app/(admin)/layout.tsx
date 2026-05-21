import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/constants'
import { AdminHeader } from '@/components/admin/admin-header'

const MODERATORS = [USER_ROLES.ADMIN, USER_ROLES.COORDENADOR, USER_ROLES.INSTRUTOR] as readonly string[]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || !MODERATORS.includes(session.user.role)) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={session.user} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
