import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getProfileById } from './lib/auth-server';
import { normalizeRole } from './lib/roles';
import { signInUser } from './lib/supabase';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string;
      householdId?: string;
      accountStatus?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    householdId?: string;
    accountStatus?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (
          typeof email !== 'string' ||
          typeof password !== 'string' ||
          password.length < 6
        ) {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.includes('@')) return null;

        try {
          const supabaseUser = await signInUser(normalizedEmail, password);
          const profile = await getProfileById(supabaseUser.id);
          const role = normalizeRole(profile?.role) ?? 'parent';

          return {
            id: supabaseUser.id,
            email: supabaseUser.email || normalizedEmail,
            name: profile?.name || normalizedEmail.split('@')[0],
            role,
            householdId: profile?.householdId ?? undefined,
            accountStatus: profile?.accountStatus ?? 'active',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role;
        token.householdId = user.householdId;
        token.accountStatus = user.accountStatus;
      }

      const userId = (token.sub ?? token.id) as string | undefined;
      const needsRefresh =
        trigger === 'update' || !token.householdId || !token.role || !token.id;

      if (userId && needsRefresh) {
        const profile = await getProfileById(userId);
        if (profile) {
          token.id = profile.id;
          token.sub = profile.id;
          token.role = profile.role;
          token.householdId = profile.householdId ?? undefined;
          token.accountStatus = profile.accountStatus;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const userId =
          typeof token.id === 'string'
            ? token.id
            : typeof token.sub === 'string'
              ? token.sub
              : undefined;

        if (userId) session.user.id = userId;

        session.user.role =
          typeof token.role === 'string' ? token.role : undefined;
        session.user.householdId =
          typeof token.householdId === 'string' ? token.householdId : undefined;
        session.user.accountStatus =
          typeof token.accountStatus === 'string' ? token.accountStatus : 'active';
      }
      return session;
    },
  },
});
