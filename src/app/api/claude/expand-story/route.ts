import { expandTwoSentences } from '@/lib/claude';
import { parseClaudeJson, validateGeneratedStory } from '@/lib/storyHelpers';
import { auth } from '@/auth';
import { normalizeRole } from '@/lib/roles';
import { getProfileById } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const profile = await getProfileById(session.user.id);
    if (normalizeRole(profile?.role ?? session.user.role) !== 'parent') {
      return NextResponse.json({ error: 'Only parents can expand quick stories' }, { status: 403 });
    }

    const body = await request.json();
    const sentenceOne = String(body.sentenceOne ?? '').trim();
    const sentenceTwo = String(body.sentenceTwo ?? '').trim();

    if (!sentenceOne || !sentenceTwo) {
      return NextResponse.json({ error: 'Both sentences are required' }, { status: 400 });
    }

    const raw = await expandTwoSentences(sentenceOne, sentenceTwo);
    const parsed = parseClaudeJson(raw);
    const story = validateGeneratedStory(parsed);

    return NextResponse.json({ story });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Story expansion failed' },
      { status: 500 }
    );
  }
}
