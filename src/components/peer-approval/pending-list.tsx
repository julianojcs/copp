'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CARGO_SHORT_LABELS } from '@/lib/i18n'
import { toast } from 'sonner'

interface Pending {
  id: string
  name: string
  email: string
  cargo?: string
  lotacaoSigla?: string
  lotacaoNome?: string
  createdAt: string
}

export function PendingList() {
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/peer/pending')
    if (res.ok) {
      const data = await res.json()
      setItems(data.items || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const approve = async (id: string) => {
    const res = await fetch(`/api/peer/users/${id}/approve`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Aprovado')
      fetchData()
    } else {
      const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      toast.error(data.error || 'Falha ao aprovar')
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>
  }

  if (!items.length) {
    return <p className="text-muted-foreground">Sem cadastros pendentes no momento.</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Lotação</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                {u.cargo && u.cargo in CARGO_SHORT_LABELS
                  ? CARGO_SHORT_LABELS[u.cargo as keyof typeof CARGO_SHORT_LABELS]
                  : '—'}
              </TableCell>
              <TableCell>{u.lotacaoSigla || '—'}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => approve(u.id)}>
                  Aprovar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
