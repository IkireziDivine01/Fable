import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        // Prototype credentials flow. Replace with Supabase verification when the user table lands.
        const email = credentials?.email;
        const password = credentials?.password;
        const role = credentials?.role;

        if (
          typeof email !== 'string' ||
          typeof password !== 'string' ||
          typeof role !== 'string' ||
          password.length < 6
        ) {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail.includes('@')) {
          return null;
        }

        return {
          id: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role,
        };
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === 'string' ? token.role : undefined;
      }
      return session;
    },
  },
});
