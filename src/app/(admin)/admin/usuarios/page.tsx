import { UsersTable } from '@/components/admin/users-table'

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string; role?: string; cargo?: string; q?: string; page?: string }
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
      </div>
      <UsersTable initialParams={searchParams} />
    </div>
  )
}
