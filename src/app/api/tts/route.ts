import { NextResponse } from 'next/server';
import {
  elevenLabsErrorMessage,
  elevenLabsErrorStatus,
  isCharacterType,
  synthesizeCharacterSpeech,
} from '@/lib/elevenLabsTts';
import {
  geminiTtsErrorMessage,
  geminiTtsErrorStatus,
  geminiTtsRetryAfterSeconds,
  isGeminiTtsVoice,
  synthesizeSpeech as synthesizeGeminiSpeech,
} from '@/lib/geminiTts';
import {
  protoTtsErrorMessage,
  protoTtsErrorStatus,
  resolveProtoGender,
  synthesizeProtoSpeech,
} from '@/lib/protoTts';
import type { CharacterType } from '@/lib/immersive/types';

/** Fail-fast TTS should return quickly; avoid long-held connections. */
export const maxDuration = 60;

type TtsProvider = 'elevenlabs' | 'proto' | 'gemini';

function preferredGenderForCharacter(characterType?: string): 'male' | 'female' {
  if (
    characterType === 'grandpa' ||
    characterType === 'boy' ||
    characterType === 'teacher' ||
    characterType === 'dog'
  ) {
    return 'male';
  }
  return 'female';
}

function resolveProvider(providerRaw: string, isKinyarwanda: boolean): TtsProvider {
  if (providerRaw === 'elevenlabs' || providerRaw === 'proto' || providerRaw === 'gemini') {
    return providerRaw;
  }
  // Default: Proto for Kinyarwanda (native RW model); ElevenLabs for English.
  return isKinyarwanda ? 'proto' : 'elevenlabs';
}

export async function POST(request: Request) {
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

  const languageHint =
    body && typeof body === 'object' && 'lang' in body
      ? String((body as { lang?: unknown }).lang ?? '').trim()
      : '';

  const providerRaw =
    body && typeof body === 'object' && 'provider' in body
      ? String((body as { provider?: unknown }).provider ?? '')
          .trim()
          .toLowerCase()
      : '';

  const isKinyarwanda = languageHint.toLowerCase().startsWith('rw');
  const provider = resolveProvider(providerRaw, isKinyarwanda);

  const characterTypeRaw =
    body && typeof body === 'object' && 'characterType' in body
      ? String((body as { characterType?: unknown }).characterType ?? '').trim()
      : '';
  const personalityPose =
    body && typeof body === 'object' && 'personalityPose' in body
      ? String((body as { personalityPose?: unknown }).personalityPose ?? '').trim()
      : '';

  if (provider === 'elevenlabs') {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
      if (!apiKey) {
        return NextResponse.json(
          { error: 'ELEVENLABS_API_KEY is not configured on the server' },
          { status: 500 }
        );
      }

      const { buffer, mimeType } = await synthesizeCharacterSpeech({
        apiKey,
        text,
        characterType: isCharacterType(characterTypeRaw) ? characterTypeRaw : 'grandma',
        personalityPose: personalityPose || undefined,
        languageHint: languageHint || undefined,
      });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store',
          'X-TTS-Provider': 'elevenlabs',
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: elevenLabsErrorMessage(error) },
        { status: elevenLabsErrorStatus(error) }
      );
    }
  }

  if (provider === 'proto') {
    try {
      const teamspaceId = process.env.PROTO_TEAMSPACE_ID?.trim();
      const apiKey = process.env.PROTO_TAKEOVER_SECRET?.trim();
      if (!teamspaceId || !apiKey) {
        return NextResponse.json(
          {
            error:
              'PROTO_TEAMSPACE_ID and PROTO_TAKEOVER_SECRET must be configured on the server',
          },
          { status: 500 }
        );
      }

      const characterType: CharacterType | undefined = isCharacterType(characterTypeRaw)
        ? characterTypeRaw
        : undefined;
      const preferredGender = preferredGenderForCharacter(characterType);
      const gender = resolveProtoGender(languageHint || 'rw', preferredGender);

      const { buffer, mimeType } = await synthesizeProtoSpeech({
        teamspaceId,
        apiKey,
        text,
        languageHint: languageHint || 'rw',
        gender,
      });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store',
          'X-TTS-Provider': 'proto',
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: protoTtsErrorMessage(error) },
        { status: protoTtsErrorStatus(error) }
      );
    }
  }

  // Optional Gemini path (explicit provider=gemini).
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const rawVoice =
      body && typeof body === 'object' && 'voice' in body
        ? String((body as { voice?: unknown }).voice ?? '').trim()
        : '';
    const voice = isGeminiTtsVoice(rawVoice) ? rawVoice : undefined;

    const { buffer, mimeType } = await synthesizeGeminiSpeech({
      apiKey,
      text,
      voice,
      languageHint: languageHint || undefined,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
        'X-TTS-Provider': 'gemini',
      },
    });
  } catch (error) {
    const status = geminiTtsErrorStatus(error);
    const retryAfter = geminiTtsRetryAfterSeconds(error);
    return NextResponse.json(
      { error: geminiTtsErrorMessage(error) },
      {
        status,
        headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
      }
    );
  }
}
