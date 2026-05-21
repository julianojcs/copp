'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Settings, GraduationCap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { USER_ROLES } from '@/lib/constants'
import { PendingBadge } from './pending-badge'

const tabs = [
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/turmas', label: 'Turmas', icon: GraduationCap },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
]

export function AdminHeader({ user }: { user: { role: string } }) {
  const pathname = usePathname()
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="font-semibold text-lg">Painel de Administração</div>
          <nav className="flex items-center gap-1">
            {tabs
              .filter((t) => !t.adminOnly || user.role === USER_ROLES.ADMIN)
              .map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(t.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {t.href === '/admin/usuarios' && <PendingBadge />}
                </Link>
              ))}
          </nav>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair do admin
          </Button>
        </Link>
      </div>
    </header>
  )
}
