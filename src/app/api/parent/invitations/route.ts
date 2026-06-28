import { assertHouseholdAccess, cancelInvitation, listHouseholdInvitations } from '@/lib/auth-server';
import { isAuthFailure, requireParentSession } from '@/lib/auth-session';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const householdId = new URL(request.url).searchParams.get('householdId');
    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    await assertHouseholdAccess(parent.userId, parent.householdId, householdId);
    const invitations = await listHouseholdInvitations(householdId);
    return NextResponse.json(invitations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invitations';
    const status = message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const invitationId = new URL(request.url).searchParams.get('id');
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation id is required' }, { status: 400 });
    }

    await cancelInvitation(invitationId, parent.householdId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel invitation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
