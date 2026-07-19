import { NextResponse } from 'next/server';

const MATEZA_SPEECH_URL = 'https://api.mateza.rw/api/v1/audio/speech';

type MatezaSpeechJson = {
  audio_base64?: string;
  audioBase64?: string;
  audio?: string;
  mime_type?: string;
  mimeType?: string;
  content_type?: string;
  contentType?: string;
  data?: MatezaSpeechJson;
  result?: MatezaSpeechJson;
};

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.error, obj.message, obj.detail];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && 'message' in value) {
      const nested = (value as { message?: unknown }).message;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }
  return fallback;
}

function stripDataUrl(value: string): { base64: string; mimeType?: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(value);
  if (!match) return { base64: value };
  return { base64: match[2], mimeType: match[1] };
}

function sniffAudioMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'audio/wav';
  }
  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') {
    return 'audio/mpeg';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return 'audio/ogg';
  }
  return null;
}

function pickBase64Candidate(payload: MatezaSpeechJson): {
  base64: string;
  mimeType?: string;
} | null {
  const nested = payload.data ?? payload.result ?? payload;
  const raw =
    nested.audio_base64 ?? nested.audioBase64 ?? nested.audio ?? payload.audio_base64 ?? payload.audio;
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const stripped = stripDataUrl(raw.trim());
  const mimeType =
    stripped.mimeType ??
    nested.mime_type ??
    nested.mimeType ??
    nested.content_type ??
    nested.contentType ??
    payload.mime_type ??
    payload.mimeType ??
    payload.content_type ??
    payload.contentType;

  return { base64: stripped.base64, mimeType };
}

function audioFromMatezaJson(payload: unknown): { buffer: Buffer; mimeType: string } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Unexpected Mateza response format');
  }

  const picked = pickBase64Candidate(payload as MatezaSpeechJson);
  if (!picked) {
    throw new Error('Mateza response did not include audio data');
  }

  const buffer = Buffer.from(picked.base64, 'base64');
  if (buffer.byteLength === 0) {
    throw new Error('Mateza returned empty audio');
  }

  const mimeType = picked.mimeType || sniffAudioMime(buffer) || 'audio/wav';
  return { buffer, mimeType };
}

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

    const matezaRes = await fetch(MATEZA_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, audio/*',
      },
      body: JSON.stringify({
        text,
        language: 'kin_Latn',
        mode: 'baseline',
      }),
    });

    if (!matezaRes.ok) {
      let fallback = 'Failed to generate speech';
      if (matezaRes.status === 401 || matezaRes.status === 403) {
        fallback = 'Mateza authentication failed. Check MATEZA_API_KEY.';
      } else if (matezaRes.status === 429) {
        fallback = 'Mateza rate limit exceeded. Try again shortly.';
      } else if (matezaRes.status >= 500) {
        fallback = 'Mateza service is temporarily unavailable.';
      }

      let errorPayload: unknown = null;
      const errorContentType = matezaRes.headers.get('content-type') ?? '';
      if (errorContentType.includes('application/json')) {
        errorPayload = await matezaRes.json().catch(() => null);
      } else {
        const errorText = await matezaRes.text().catch(() => '');
        if (errorText) errorPayload = { message: errorText.slice(0, 300) };
      }

      const status =
        matezaRes.status === 401 || matezaRes.status === 403
          ? 401
          : matezaRes.status === 429
            ? 429
            : matezaRes.status >= 500
              ? 502
              : matezaRes.status;

      return NextResponse.json(
        { error: extractErrorMessage(errorPayload, fallback) },
        { status }
      );
    }

    const contentType = matezaRes.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const json = await matezaRes.json();
      const { buffer, mimeType } = audioFromMatezaJson(json);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Raw audio bytestream (if Mateza returns binary instead of base64 JSON)
    const audioBuffer = Buffer.from(await matezaRes.arrayBuffer());
    if (audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Mateza returned empty audio' }, { status: 502 });
    }

    const mimeType =
      (contentType.startsWith('audio/') ? contentType.split(';')[0].trim() : null) ||
      sniffAudioMime(audioBuffer) ||
      'audio/wav';

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS request failed' },
      { status: 500 }
    );
  }
}
