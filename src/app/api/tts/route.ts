import { NextResponse } from 'next/server';
import {
  isTtsVoice,
  matezaErrorMessage,
  matezaErrorStatus,
  synthesizeKinyarwandaSpeech,
} from '@/lib/matezaTts';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.MATEZA_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MATEZA_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const text =
      body && typeof body === 'object' && 'text' in body
        ? String((body as { text?: unknown }).text ?? '').trim()
        : '';

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 20000) {
      return NextResponse.json({ error: 'text exceeds the 20,000 character limit' }, { status: 400 });
    }

    const rawVoice =
      body && typeof body === 'object' && 'voice' in body
        ? String((body as { voice?: unknown }).voice ?? '')
            .trim()
            .toLowerCase()
        : '';
    const voice = isTtsVoice(rawVoice) ? rawVoice : 'female';

    const { buffer, mimeType } = await synthesizeKinyarwandaSpeech({
      apiKey,
      text,
      voice,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: matezaErrorMessage(error) },
      { status: matezaErrorStatus(error) }
    );
  }
}
