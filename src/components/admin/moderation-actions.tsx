'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { USER_STATUS } from '@/lib/constants'
import { toast } from 'sonner'
import type { UserRow } from '@/types/admin-users'

export function ModerationActions({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const call = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) {
      onChanged()
      toast.success('Atualizado')
    } else {
      const data = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(data.error || 'Falha na operação')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user.status === USER_STATUS.PENDING && (
            <>
              <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}/approve`)}>Aprovar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRejectOpen(true)}>Rejeitar</DropdownMenuItem>
            </>
          )}
          {user.status === USER_STATUS.REJECTED && (
            <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}/approve`)}>Reativar (aprovar)</DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/admin/usuarios/${user.id}`}>Editar</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => call(`/api/admin/users/${user.id}`, { isActive: !user.isActive })}>
            {user.isActive ? 'Desativar' : 'Reativar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogTrigger asChild><span style={{ display: 'none' }} /></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe um motivo (opcional). O aluno receberá um email com esta mensagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await call(`/api/admin/users/${user.id}/reject`, { reason })
                setRejectOpen(false)
                setReason('')
              }}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
