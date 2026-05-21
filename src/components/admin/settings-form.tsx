// src/components/admin/settings-form.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Course { id: string; name: string; code: string }
interface Settings {
  brandName: string
  brandFullName: string
  institutionName: string
  institutionFullName: string
  description: string
  activeCourseId?: string
  peerApprovalEnabled: boolean
  developerName: string
  developerLinkedinUrl: string
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then(setSettings)
    fetch('/api/admin/courses').then((r) => r.json()).then((d) => setCourses(d.items || []))
  }, [])

  if (!settings) return <p>Carregando...</p>

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) toast.success('Configurações salvas')
    else toast.error('Falha ao salvar')
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save() }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Marca</Label>
          <Input value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
        </div>
        <div>
          <Label>Nome completo da marca</Label>
          <Input value={settings.brandFullName} onChange={(e) => setSettings({ ...settings, brandFullName: e.target.value })} />
        </div>
        <div>
          <Label>Instituição (sigla)</Label>
          <Input value={settings.institutionName} onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })} />
        </div>
        <div>
          <Label>Instituição (nome completo)</Label>
          <Input value={settings.institutionFullName} onChange={(e) => setSettings({ ...settings, institutionFullName: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          <Textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} />
        </div>
        <div>
          <Label>Turma ativa</Label>
          <Select
            value={settings.activeCourseId || ''}
            onValueChange={(v) => setSettings({ ...settings, activeCourseId: v || undefined })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={settings.peerApprovalEnabled}
            onCheckedChange={(v) => setSettings({ ...settings, peerApprovalEnabled: v })}
          />
          <Label className="cursor-pointer">Permitir que alunos aprovem novos cadastros</Label>
        </div>
        <div>
          <Label>Desenvolvedor (nome)</Label>
          <Input value={settings.developerName} onChange={(e) => setSettings({ ...settings, developerName: e.target.value })} />
        </div>
        <div>
          <Label>Desenvolvedor (LinkedIn)</Label>
          <Input value={settings.developerLinkedinUrl} onChange={(e) => setSettings({ ...settings, developerLinkedinUrl: e.target.value })} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>Salvar configurações</Button>
    </form>
  )
}
