import { getPendingKidsForHousehold } from '@/lib/auth-server';
import { isAuthFailure, requireParentSession } from '@/lib/auth-session';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const pending = await getPendingKidsForHousehold(parent.householdId);
    return NextResponse.json(pending);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pending learners';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
