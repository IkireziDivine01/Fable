import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { signInUser, getUserProfile } from './lib/supabase';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string;
      householdId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    householdId?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        if (!normalizedEmail.includes('@')) {
          return null;
        }

        try {
          // Sign in with Supabase
          const supabaseUser = await signInUser(normalizedEmail, password);

          // Get user profile for additional data
          const profile = await getUserProfile(supabaseUser.id);

          return {
            id: supabaseUser.id,
            email: supabaseUser.email || normalizedEmail,
            name: profile?.name || normalizedEmail.split('@')[0],
            role: profile?.role || 'parent',
            householdId: profile?.household_id,
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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.householdId = user.householdId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === 'string' ? token.role : undefined;
        session.user.householdId = typeof token.householdId === 'string' ? token.householdId : undefined;
        session.user.id = typeof token.id === 'string' ? token.id : undefined;
      }
      return session;
    },
  },
});
