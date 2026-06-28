import {
  assertHouseholdAccess,
  listHouseholdMembers,
} from '@/lib/auth-server';
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
    const members = await listHouseholdMembers(householdId);
    return NextResponse.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch family';
    const status = message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
