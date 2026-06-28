import { auth } from '@/auth';
import { getProfileByEmail, getProfileById } from '@/lib/auth-server';
import { normalizeRole } from '@/lib/roles';
import { NextResponse } from 'next/server';

export interface AuthenticatedParent {
  userId: string;
  householdId: string;
  role: 'parent';
  email?: string | null;
  name?: string | null;
}

type AuthFailure = { error: NextResponse };

/**
 * Resolve a parent session for API routes.
 * Hydrates id / householdId from the database when the JWT is missing fields.
 */
export async function requireParentSession():
  Promise<AuthenticatedParent | AuthFailure> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  let userId = session.user.id;
  if (!userId && session.user.email) {
    const byEmail = await getProfileByEmail(session.user.email);
    userId = byEmail?.id;
  }

  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const profile = await getProfileById(userId);
  if (!profile) {
    return {
      error: NextResponse.json(
        { error: 'Profile not found. Try signing out and back in.' },
        { status: 401 }
      ),
    };
  }

  const role = normalizeRole(profile.role);
  if (role !== 'parent') {
    return {
      error: NextResponse.json({ error: 'Parent access only' }, { status: 403 }),
    };
  }

  const householdId = profile.householdId ?? session.user.householdId;
  if (!householdId) {
    return {
      error: NextResponse.json(
        {
          error:
            'No household linked to your account. Sign up again as a parent or contact support.',
        },
        { status: 400 }
      ),
    };
  }

  return {
    userId,
    householdId,
    role: 'parent',
    email: profile.email ?? session.user.email,
    name: profile.name ?? session.user.name,
  };
}

export function isAuthFailure(
  result: AuthenticatedParent | AuthFailure
): result is AuthFailure {
  return 'error' in result;
}
