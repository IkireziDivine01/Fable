import { auth } from '@/auth';
import { getAccountHealth } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const report = await getAccountHealth(session);
  return NextResponse.json(report);
}
