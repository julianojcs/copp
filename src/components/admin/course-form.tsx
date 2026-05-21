// src/components/admin/course-form.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface CourseData {
  name: string
  code: string
  description?: string
  location: string
  startDate: string
  endDate: string
  isActive: boolean
}

const EMPTY: CourseData = {
  name: '',
  code: '',
  description: '',
  location: 'ANP — Brasília/DF',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  isActive: true,
}

export function CourseForm({ id }: { id: string | null }) {
  const router = useRouter()
  const [data, setData] = useState<CourseData>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/courses/${id}`)
      .then((r) => r.json())
      .then((c) =>
        setData({
          name: c.name,
          code: c.code,
          description: c.description || '',
          location: c.location,
          startDate: new Date(c.startDate).toISOString().split('T')[0],
          endDate: new Date(c.endDate).toISOString().split('T')[0],
          isActive: c.isActive,
        })
      )
  }, [id])

  const save = async () => {
    setSaving(true)
    const url = id ? `/api/admin/courses/${id}` : `/api/admin/courses`
    const method = id ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Turma salva')
      router.push('/admin/turmas')
    } else {
      const d = await res.json().catch(() => ({ error: 'Erro' }))
      toast.error(d.error || 'Falha')
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required />
        </div>
        <div>
          <Label>Código</Label>
          <Input value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} required />
        </div>
        <div>
          <Label>Local</Label>
          <Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} required />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Checkbox
            checked={data.isActive}
            onCheckedChange={(v) => setData({ ...data, isActive: Boolean(v) })}
          />
          <Label>Ativa</Label>
        </div>
        <div>
          <Label>Início</Label>
          <Input type="date" value={data.startDate} onChange={(e) => setData({ ...data, startDate: e.target.value })} />
        </div>
        <div>
          <Label>Término</Label>
          <Input type="date" value={data.endDate} onChange={(e) => setData({ ...data, endDate: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          <Textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
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
