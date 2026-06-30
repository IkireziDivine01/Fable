import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { getFullImmersiveStory, saveImmersiveStory } from '@/lib/immersive/immersive-server';
import type { EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';
import { getStoryById } from '@/lib/stories-server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await context.params;
    const story = await getStoryById(id);
    if (!story || story.story.household_id !== ctx.householdId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const immersive = await getFullImmersiveStory(id, ctx.householdId);
    return NextResponse.json({ immersive, story: story.story, sentences: story.sentences });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load immersive data' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    let ctx;
    try {
      ctx = await resolveStorySession(session);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!ctx) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (ctx.role !== 'parent' && ctx.role !== 'elder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const characters = Array.isArray(body.characters)
      ? (body.characters as StoryCharacterSlot[])
      : undefined;

    const immersive = await saveImmersiveStory(id, ctx.householdId, {
      environment: body.environment as EnvironmentType | undefined,
      characters,
      isImmersive: body.isImmersive !== undefined ? Boolean(body.isImmersive) : undefined,
      animationData: body.animationData,
      videoUrl: body.videoUrl ? String(body.videoUrl) : undefined,
    });

    return NextResponse.json({ immersive });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save immersive settings' },
      { status: 500 }
    );
  }
}
