'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ROLE_LABELS, CARGO_SHORT_LABELS, STATUS_LABELS } from '@/lib/i18n'
import { USER_STATUS, USER_ROLES, PF_CARGOS } from '@/lib/constants'
import { ModerationActions } from './moderation-actions'
import { toast } from 'sonner'
import type { UserRow } from '@/types/admin-users'

export function UsersTable({ initialParams }: { initialParams: Record<string, string | undefined> }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()
  const [items, setItems] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const ALL = '__all'

  const status = sp.get('status') ?? initialParams.status ?? USER_STATUS.PENDING
  const role = sp.get('role') ?? ''
  const cargo = sp.get('cargo') ?? ''
  const q = sp.get('q') ?? ''

  const fetchData = async () => {
    const params = new URLSearchParams({ status, role, cargo, q }).toString()
    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) return
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role, cargo, q])

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value && value !== ALL) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.replace(`/admin/usuarios?${params.toString()}`))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkApprove = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    const res = await fetch('/api/admin/users/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      toast.success(`${ids.length} aluno(s) aprovado(s)`)
      setSelected(new Set())
      fetchData()
    } else {
      toast.error('Falha ao aprovar em lote')
    }
  }

  const statusBadge = (s: string) => {
    if (s === USER_STATUS.PENDING) return <Badge className="bg-yellow-500">Pendente</Badge>
    if (s === USER_STATUS.APPROVED) return <Badge className="bg-green-600">Aprovado</Badge>
    return <Badge className="bg-red-500">Rejeitado</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar nome, email ou lotação..."
          defaultValue={q}
          onBlur={(e) => updateParam('q', e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(v) => updateParam('status', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
            <SelectItem value="approved">{STATUS_LABELS.approved}</SelectItem>
            <SelectItem value="rejected">{STATUS_LABELS.rejected}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={role || ALL} onValueChange={(v) => updateParam('role', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Função" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {Object.values(USER_ROLES).map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cargo || ALL} onValueChange={(v) => updateParam('cargo', v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {Object.values(PF_CARGOS).map((c) => (
              <SelectItem key={c} value={c}>{CARGO_SHORT_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && status === USER_STATUS.PENDING && (
          <Button onClick={bulkApprove}>Aprovar {selected.size} selecionados</Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Lotação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {status === USER_STATUS.PENDING && (
                    <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} />
                  )}
                </TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</TableCell>
                <TableCell>{u.cargo ? CARGO_SHORT_LABELS[u.cargo as keyof typeof CARGO_SHORT_LABELS] : '—'}</TableCell>
                <TableCell>{u.lotacaoSigla || '—'}</TableCell>
                <TableCell>{statusBadge(u.status)}</TableCell>
                <TableCell><ModerationActions user={u} onChanged={fetchData} /></TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">Total: {total}</div>
    </div>
  )
}
