// src/app/(admin)/admin/configuracoes/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/constants'
import { SettingsForm } from '@/components/admin/settings-form'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (session?.user?.role !== USER_ROLES.ADMIN) redirect('/admin/usuarios')
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <SettingsForm />
    </div>
  )
}
