import { getHouseholdReadingActivity } from '@/lib/stories-server';
import { isAuthFailure, requireParentSession } from '@/lib/auth-session';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const activity = await getHouseholdReadingActivity(parent.householdId);
    return NextResponse.json(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
