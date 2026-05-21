// src/app/(admin)/admin/turmas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Course { id: string; name: string; code: string; location: string; isActive: boolean }

export default function AdminTurmasPage() {
  const [items, setItems] = useState<Course[]>([])
  useEffect(() => {
    fetch('/api/admin/courses').then((r) => r.json()).then((d) => setItems(d.items))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Link href="/admin/turmas/new">
          <Button>Nova turma</Button>
        </Link>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.location}</TableCell>
                <TableCell>{c.isActive ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}</TableCell>
                <TableCell>
                  <Link href={`/admin/turmas/${c.id}`}><Button variant="outline" size="sm">Editar</Button></Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
