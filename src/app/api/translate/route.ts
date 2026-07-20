import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { translateLinesToKinyarwanda } from '@/lib/translate';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ctx = await resolveStorySession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as {
      texts?: unknown;
      target?: unknown;
    };

    const target = String(body.target ?? 'rw').toLowerCase();
    if (target !== 'rw' && target !== 'rw-rw') {
      return NextResponse.json(
        { error: 'Only Kinyarwanda (rw) translation is supported' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.texts) || body.texts.length === 0) {
      return NextResponse.json({ error: 'texts array is required' }, { status: 400 });
    }

    const texts = body.texts.map((t) => String(t ?? ''));
    const translations = await translateLinesToKinyarwanda(texts);
    return NextResponse.json({ translations, target: 'rw' });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Translation failed',
      },
      { status: 500 }
    );
  }
}
