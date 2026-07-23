import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { persistSentenceAudio, setSentenceAudioUrl } from '@/lib/story-audio-server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; sentenceId: string }> }
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

    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (ctx.role !== 'parent' && ctx.role !== 'elder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: storyId, sentenceId } = await context.params;
    const body = await request.json();
    const audioBase64 = String(body.audioBase64 ?? '');
    const mimeType = String(body.mimeType ?? 'audio/webm');
    const langRaw = String(body.lang ?? 'en').toLowerCase();
    const lang = langRaw === 'rw' || langRaw === 'rw-rw' ? 'rw' : 'en';

    if (!audioBase64) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Invalid audio data' }, { status: 400 });
    }

    const audioUrl = await persistSentenceAudio({
      householdId: ctx.householdId,
      storyId,
      sentenceId,
      buffer,
      mimeType,
      lang,
    });

    const savedUrl = await setSentenceAudioUrl(
      storyId,
      sentenceId,
      ctx.householdId,
      audioUrl,
      lang
    );
    return NextResponse.json({ audioUrl: savedUrl, lang });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload audio' },
      { status: 500 }
    );
  }
}
