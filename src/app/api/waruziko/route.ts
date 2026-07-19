import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  getTodaysWaruzikoFact,
  listWaruzikoFacts,
  recordWaruzikoView,
} from '@/lib/waruziko-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchive = searchParams.get('archive') === '1';

    const today = await getTodaysWaruzikoFact();
    if (!today) {
      return NextResponse.json(
        {
          error:
            'Waruziko is not set up yet. Run supabase/waruziko_schema.sql in the Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }

    const archive = includeArchive ? await listWaruzikoFacts() : undefined;

    return NextResponse.json({ today, archive });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Waruziko' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (ctx.role !== 'kid') {
      return NextResponse.json({ error: 'Only learners log Waruziko views' }, { status: 403 });
    }

    const body = await request.json();
    const factId = String(body.factId ?? '').trim();
    if (!factId) {
      return NextResponse.json({ error: 'factId is required' }, { status: 400 });
    }

    await recordWaruzikoView({
      householdId: ctx.householdId,
      kidId: ctx.authorId,
      factId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record view' },
      { status: 500 }
    );
  }
}
