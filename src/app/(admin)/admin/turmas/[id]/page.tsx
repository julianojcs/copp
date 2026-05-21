// src/app/(admin)/admin/turmas/[id]/page.tsx
import { CourseForm } from '@/components/admin/course-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminTurmaEditPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{id === 'new' ? 'Nova turma' : 'Editar turma'}</h1>
      <CourseForm id={id === 'new' ? null : id} />
    </div>
  )
}
