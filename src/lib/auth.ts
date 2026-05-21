// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import type { SessionUser } from '@/types'
import { USER_STATUS } from '@/lib/constants'

declare module 'next-auth' {
  interface Session {
    user: SessionUser
  }
  interface User extends SessionUser {}
}

const SESSION_KEYS: ReadonlyArray<keyof SessionUser> = [
  'id', 'email', 'name', 'avatar', 'role', 'cargo', 'lotacao', 'status',
  'courseId', 'courseName', 'city', 'country', 'whatsapp',
  'linkedin', 'instagram', 'github', 'twitter', 'company', 'bio',
  'isEmailVerified', 'profileCompleted',
]

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()
        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        }).select('+password')

        if (!user || !user.password) return null

        const ok = await bcrypt.compare(credentials.password as string, user.password)
        if (!ok) return null

        if (!user.isActive) throw new Error('STATUS_INACTIVE')
        if (user.status !== USER_STATUS.APPROVED) {
          throw new Error(`STATUS_${String(user.status).toUpperCase()}`)
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          cargo: user.cargo,
          lotacao: user.lotacao,
          status: user.status,
          courseId: user.courseId?.toString(),
          courseName: user.courseName,
          city: user.city,
          country: user.country,
          whatsapp: user.whatsapp,
          linkedin: user.linkedin,
          instagram: user.instagram,
          github: user.github,
          twitter: user.twitter,
          company: user.company,
          bio: user.bio,
          isEmailVerified: user.emailVerified,
          profileCompleted: user.profileCompleted,
        } satisfies SessionUser
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        for (const key of SESSION_KEYS) {
          // @ts-expect-error — index assignment from SessionUser
          token[key] = user[key]
        }
      }
      if (trigger === 'update' && session) {
        return { ...token, ...session }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        for (const key of SESSION_KEYS) {
          // @ts-expect-error — index assignment to session.user
          session.user[key] = token[key]
        }
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
})
