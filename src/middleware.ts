import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES, USER_STATUS } from '@/lib/constants'

const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/aguardando-aprovacao',
  '/api/courses',
]

const MODERATOR_ROLES: ReadonlyArray<string> = [
  USER_ROLES.ADMIN,
  USER_ROLES.COORDENADOR,
  USER_ROLES.INSTRUTOR,
]

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicRoutes.some((r) => pathname === r) || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Guard /admin/* and /api/admin/*: moderator only
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!MODERATOR_ROLES.includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Guard /aprovar-colegas and /api/peer: must be approved
  if (pathname.startsWith('/aprovar-colegas') || pathname.startsWith('/api/peer')) {
    if (session.user.status !== USER_STATUS.APPROVED) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
  runtime: 'nodejs',
}
