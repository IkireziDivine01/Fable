import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { defineWordForKids } from '@/lib/defineWord';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as {
      word?: unknown;
      sentence?: unknown;
    };

    const word = String(body.word ?? '').trim();
    if (!word) {
      return NextResponse.json({ error: 'word is required' }, { status: 400 });
    }

    const sentence = String(body.sentence ?? '').trim();
    const definition = await defineWordForKids({ word, sentence });
    return NextResponse.json(definition);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Define word failed',
      },
      { status: 500 }
    );
  }
}
