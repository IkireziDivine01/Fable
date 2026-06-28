import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { logStoryActivity } from '@/lib/stories-server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (ctx.role !== 'kid') {
      return NextResponse.json({ error: 'Only learners log reading activity' }, { status: 403 });
    }

    const { id: storyId } = await context.params;
    const body = await request.json();
    const eventType =
      body.eventType === 'STORY_COMPLETED' ? 'STORY_COMPLETED' : 'STORY_STARTED';

    await logStoryActivity({
      householdId: ctx.householdId,
      actorId: ctx.authorId,
      storyId,
      eventType,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log activity' },
      { status: 500 }
    );
  }
}
