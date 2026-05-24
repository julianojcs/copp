'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Users,
  Image as ImageIcon,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  Home,
  ShieldCheck,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PendingBadge } from '@/components/admin/pending-badge'
import { USER_ROLES } from '@/lib/constants'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAppSettings } from '@/hooks/use-app-settings'

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const branding = useAppSettings()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const role = session?.user?.role
  const isModerator =
    role === USER_ROLES.ADMIN ||
    role === USER_ROLES.COORDENADOR ||
    role === USER_ROLES.INSTRUTOR

  type NavItem = { href: string; label: string; icon: LucideIcon; badge?: React.ReactNode }
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/colleagues', label: 'Colegas', icon: Users },
    { href: '/gallery', label: 'Galeria', icon: ImageIcon },
    ...(branding.peerApprovalEnabled && session?.user?.status === 'approved'
      ? [{ href: '/aprovar-colegas', label: 'Aprovar colegas', icon: ShieldCheck }]
      : []),
    ...(isModerator
      ? [{ href: '/admin/usuarios', label: 'Admin', icon: LayoutDashboard, badge: <PendingBadge /> }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              {/* suppressHydrationWarning: Radix gera aria-controls via useId, que pode
                  divergir entre SSR e CSR no React 19 + Next 16 com streaming. O ID se
                  estabiliza após a hidratação e aponta corretamente para o conteúdo. */}
              <Button variant="ghost" size="icon" suppressHydrationWarning>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                  <Image src="/logo.svg" alt={branding.brandName} width={32} height={32} className="rounded-lg" />
                  <span>{branding.brandName}</span>
                </Link>
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {item.badge}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl hidden md:flex">
            <Image src="/logo.svg" alt={branding.brandName} width={36} height={36} className="rounded-lg" />
            <span>{branding.brandName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleTheme}
            aria-label="Alternar tema"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* User Menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={session.user.avatar}
                      alt={session.user.name}
                    />
                    <AvatarFallback>
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
