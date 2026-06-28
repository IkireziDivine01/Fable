import { approveKidAccount } from '@/lib/auth-server';
import { isAuthFailure, requireParentSession } from '@/lib/auth-session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const parent = await requireParentSession();
    if (isAuthFailure(parent)) return parent.error;

    const body = await request.json();
    const kidId = String(body.kidId || '');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    await approveKidAccount(parent.userId, kidId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve account' },
      { status: 400 }
    );
  }
}
