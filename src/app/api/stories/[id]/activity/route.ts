import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { recordKidReadingEvent } from '@/lib/stories-server';
import { NextResponse } from 'next/server';

type StoryActivityEvent =
  | 'STORY_STARTED'
  | 'STORY_COMPLETED'
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_COMPLETED';

const ALLOWED_EVENTS = new Set<StoryActivityEvent>([
  'STORY_STARTED',
  'STORY_COMPLETED',
  'ACTIVITY_STARTED',
  'ACTIVITY_COMPLETED',
]);

function parseEventType(raw: unknown): StoryActivityEvent | null {
  const value = String(raw ?? '');
  return ALLOWED_EVENTS.has(value as StoryActivityEvent)
    ? (value as StoryActivityEvent)
    : null;
}

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
    const eventType = parseEventType(body.eventType);
    if (!eventType) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const result = await recordKidReadingEvent({
      householdId: ctx.householdId,
      actorId: ctx.authorId,
      storyId,
      eventType,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({
      success: true,
      logged: result.logged,
      readStatus: result.readStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log activity' },
      { status: 500 }
    );
  }
}
