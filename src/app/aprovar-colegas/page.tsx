import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAppSettings } from '@/lib/app-settings'
import { canApprove } from '@/lib/permissions'
import { PendingList } from '@/components/peer-approval/pending-list'

export default async function AprovarColegasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const settings = await getAppSettings()
  if (!settings.peerApprovalEnabled) notFound()
  if (!(await canApprove(session.user))) notFound()

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Aprovar colegas</h1>
      <p className="text-sm text-muted-foreground">
        Confirme novos cadastros de colegas da turma. Você só pode aprovar;
        para rejeitar ou editar dados, fale com a coordenação.
      </p>
      <PendingList />
    </div>
  )
}
