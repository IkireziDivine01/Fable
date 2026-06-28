import { createInvitation } from '@/lib/auth-server';
import { isAuthFailure, requireParentSession } from '@/lib/auth-session';
import { normalizeInviteRole } from '@/lib/roles';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const body = await request.json();
    const role = normalizeInviteRole(body.role);
    const nameHint = body.nameHint ? String(body.nameHint) : undefined;

    if (!role) {
      return NextResponse.json({ error: 'Role must be "kid" or "elder"' }, { status: 400 });
    }

    const invitation = await createInvitation({
      householdId: parent.householdId,
      invitedBy: parent.userId,
      role,
      nameHint,
    });

    return NextResponse.json({
      success: true,
      code: invitation.code,
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
