import { generateStoryFromPrompt } from '@/lib/claude';
import { validateGeneratedStory } from '@/lib/storyHelpers';
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
      return NextResponse.json({ error: 'Only parents can generate AI stories' }, { status: 403 });
    }

    const body = await request.json();
    const prompt = String(body.prompt ?? '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const parsed = await generateStoryFromPrompt(prompt);
    const story = validateGeneratedStory(parsed);

    return NextResponse.json({ story });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Story generation failed' },
      { status: 500 }
    );
  }
}
