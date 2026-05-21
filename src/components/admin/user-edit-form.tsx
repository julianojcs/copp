'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { USER_ROLES, USER_STATUS, PF_CARGOS } from '@/lib/constants'
import { ROLE_LABELS, CARGO_LABELS, STATUS_LABELS } from '@/lib/i18n'
import { toast } from 'sonner'

interface UserData {
  id: string; name: string; email: string; role: string; cargo?: string; lotacao: string;
  whatsapp: string; status: string; isActive: boolean; bio?: string; company?: string;
  linkedin?: string; instagram?: string; github?: string; twitter?: string;
  city?: string; country?: string; courseName?: string;
}

export function UserEditForm({ userId }: { userId: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setUser(data))
  }, [userId])

  if (!user) return <p>Carregando...</p>

  const actorIsAdmin = session?.user?.role === USER_ROLES.ADMIN

  const save = async (patch: Partial<UserData>) => {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Usuário atualizado')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(data.error || 'Falha ao atualizar')
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save({
          name: user.name, email: user.email, role: user.role, cargo: user.cargo,
          lotacao: user.lotacao, whatsapp: user.whatsapp, status: user.status,
          isActive: user.isActive, bio: user.bio, company: user.company,
          linkedin: user.linkedin, instagram: user.instagram, github: user.github,
          twitter: user.twitter, city: user.city, country: user.country,
        })
      }}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome completo</Label>
          <Input value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={user.whatsapp} onChange={(e) => setUser({ ...user, whatsapp: e.target.value })} />
        </div>
        <div>
          <Label>Lotação</Label>
          <Input value={user.lotacao} onChange={(e) => setUser({ ...user, lotacao: e.target.value })} />
        </div>
        <div>
          <Label>Função</Label>
          <Select
            value={user.role}
            onValueChange={(v) => setUser({ ...user, role: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(USER_ROLES)
                .filter((r) => actorIsAdmin || r !== USER_ROLES.ADMIN)
                .map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cargo</Label>
          <Select
            value={user.cargo || ''}
            onValueChange={(v) => setUser({ ...user, cargo: v || undefined })}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Object.values(PF_CARGOS).map((c) => (
                <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={user.status}
            onValueChange={(v) => setUser({ ...user, status: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={USER_STATUS.PENDING}>{STATUS_LABELS.pending}</SelectItem>
              <SelectItem value={USER_STATUS.APPROVED}>{STATUS_LABELS.approved}</SelectItem>
              <SelectItem value={USER_STATUS.REJECTED}>{STATUS_LABELS.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Checkbox
            checked={user.isActive}
            onCheckedChange={(v) => setUser({ ...user, isActive: Boolean(v) })}
          />
          <Label>Ativo</Label>
        </div>
        <div className="col-span-2">
          <Label>Bio</Label>
          <Textarea
            value={user.bio || ''}
            onChange={(e) => setUser({ ...user, bio: e.target.value })}
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>Salvar</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
