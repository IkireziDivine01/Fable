import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { getKidLibraryWithProgress } from '@/lib/stories-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (ctx.role !== 'kid') {
      return NextResponse.json({ error: 'Learners only' }, { status: 403 });
    }

    const stories = await getKidLibraryWithProgress(ctx.householdId, ctx.authorId);

    const counts = {
      new: stories.filter((s) => s.readStatus === 'new').length,
      reading: stories.filter((s) => s.readStatus === 'reading').length,
      completed: stories.filter((s) => s.readStatus === 'completed').length,
      total: stories.length,
    };

    return NextResponse.json({ stories, counts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load library' },
      { status: 500 }
    );
  }
}
