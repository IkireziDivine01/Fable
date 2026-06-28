import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  createStoryWithSentences,
  listStoriesForHousehold,
} from '@/lib/stories-server';
import type { StoryGenerationType, StorySentenceInput } from '@/lib/storyHelpers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const publishedOnly = ctx.role === 'kid';
    const stories = await listStoriesForHousehold(ctx.householdId, { publishedOnly });
    return NextResponse.json(stories);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = ctx.role;
    if (role !== 'parent' && role !== 'elder') {
      return NextResponse.json({ error: 'Only parents and authors can create stories' }, { status: 403 });
    }

    const body = await request.json();
    const generationType = String(body.generationType ?? 'manual') as StoryGenerationType;

    if (generationType !== 'manual' && role !== 'parent') {
      return NextResponse.json({ error: 'AI stories are created by parents only' }, { status: 403 });
    }

    const title = String(body.title ?? '').trim();
    const transcript = String(body.transcript ?? '').trim();
    const themes = Array.isArray(body.themes) ? body.themes.map(String) : [];
    const sentences = (body.sentences ?? []) as StorySentenceInput[];
    const audioUrl = body.audioUrl ? String(body.audioUrl) : undefined;

    if (!title || !transcript || sentences.length < 3) {
      return NextResponse.json(
        { error: 'Title, transcript, and at least 3 sentences are required.' },
        { status: 400 }
      );
    }

    const result = await createStoryWithSentences({
      householdId: ctx.householdId,
      authorId: ctx.authorId,
      title,
      transcript,
      generationType,
      themes,
      sentences,
      status: 'draft',
      audioUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create story' },
      { status: 500 }
    );
  }
}
