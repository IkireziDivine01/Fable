import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  getStoryById,
  publishStory,
  updateStoryDraft,
  updateStorySentences,
} from '@/lib/stories-server';
import type { StorySentenceInput } from '@/lib/storyHelpers';
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
    const data = await getStoryById(id);
    if (!data || data.story.household_id !== ctx.householdId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (ctx.role === 'kid' && data.story.status !== 'published') {
      return NextResponse.json({ error: 'Story not available' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load story' },
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
    const action = String(body.action ?? '');

    if (action === 'publish') {
      const story = await publishStory(id, ctx.householdId);
      return NextResponse.json({ story });
    }

    if (action === 'updateSentences') {
      const sentences = (body.sentences ?? []) as StorySentenceInput[];
      const updated = await updateStorySentences(id, ctx.householdId, sentences);
      return NextResponse.json({ sentences: updated });
    }

    const story = await updateStoryDraft(id, ctx.householdId, {
      title: body.title ? String(body.title) : undefined,
      transcript: body.transcript ? String(body.transcript) : undefined,
      audioUrl: body.audioUrl ? String(body.audioUrl) : undefined,
    });

    return NextResponse.json({ story });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update story' },
      { status: 500 }
    );
  }
}
