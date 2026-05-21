import { UserEditForm } from '@/components/admin/user-edit-form'

export default function AdminUserEditPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar usuário</h1>
      <UserEditForm userId={params.id} />
    </div>
  )
}
