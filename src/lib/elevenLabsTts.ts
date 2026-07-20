import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { CharacterType, PersonalityPose } from '@/lib/immersive/types';

const DISK_CACHE_DIR = path.join(process.cwd(), '.cache', 'elevenlabs-tts');
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ENTRIES = 128;

/**
 * Premade ElevenLabs voices mapped to story character types.
 * Override any ID via ELEVENLABS_VOICE_<TYPE> (e.g. ELEVENLABS_VOICE_GRANDMA).
 */
const DEFAULT_VOICE_IDS: Record<CharacterType, string> = {
  grandma: 'XrExE9yKIg1WjnnlVkGX', // Matilda — warm mature female
  grandpa: 'JBFqnCBsd6RMkjVDRZzb', // George — warm mature male
  teacher: 'onwK4e9ZLuTAKqWW03F9', // Daniel — clear / informative
  boy: 'IKne3meq5aSn9XLyUdCD', // Charlie — youthful male
  girl: 'cgSgspJ2msm6clMCkdW9', // Jessica — youthful female
  dog: 'TX3LPaxmHKxFdv7VOQHJ', // Liam — bright / playful energy
};

export type CharacterTone = {
  characterType: CharacterType;
  personalityPose?: PersonalityPose;
};

type VoiceToneSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
};

type CacheEntry = { buffer: Buffer; mimeType: string; expiresAt: number };

const audioCache = new Map<string, CacheEntry>();

const BASE_TONE: Record<CharacterType, VoiceToneSettings> = {
  grandma: {
    stability: 0.68,
    similarityBoost: 0.8,
    style: 0.35,
    speed: 0.88,
    useSpeakerBoost: true,
  },
  grandpa: {
    stability: 0.7,
    similarityBoost: 0.78,
    style: 0.3,
    speed: 0.86,
    useSpeakerBoost: true,
  },
  teacher: {
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.15,
    speed: 0.98,
    useSpeakerBoost: true,
  },
  boy: {
    stability: 0.38,
    similarityBoost: 0.7,
    style: 0.55,
    speed: 1.06,
    useSpeakerBoost: true,
  },
  girl: {
    stability: 0.4,
    similarityBoost: 0.72,
    style: 0.5,
    speed: 1.05,
    useSpeakerBoost: true,
  },
  dog: {
    stability: 0.28,
    similarityBoost: 0.65,
    style: 0.7,
    speed: 1.1,
    useSpeakerBoost: true,
  },
};

export function isCharacterType(value: string): value is CharacterType {
  return value in DEFAULT_VOICE_IDS;
}

export function resolveElevenLabsVoiceId(characterType: CharacterType): string {
  const envKey = `ELEVENLABS_VOICE_${characterType.toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim();
  return fromEnv || DEFAULT_VOICE_IDS[characterType];
}

function toneFor(characterType: CharacterType, pose?: PersonalityPose): VoiceToneSettings {
  const base = { ...BASE_TONE[characterType] };
  switch (pose) {
    case 'wise':
      base.stability = Math.min(0.85, base.stability + 0.12);
      base.speed = Math.max(0.8, base.speed - 0.06);
      base.style = Math.max(0.1, base.style - 0.05);
      break;
    case 'playful':
      base.stability = Math.max(0.2, base.stability - 0.12);
      base.style = Math.min(0.85, base.style + 0.2);
      base.speed = Math.min(1.2, base.speed + 0.06);
      break;
    case 'confident':
      base.stability = Math.min(0.75, base.stability + 0.05);
      base.style = Math.min(0.7, base.style + 0.1);
      break;
    case 'shy':
      base.stability = Math.min(0.8, base.stability + 0.08);
      base.speed = Math.max(0.82, base.speed - 0.05);
      base.style = Math.max(0.05, base.style - 0.1);
      break;
    default:
      break;
  }
  return base;
}

function cacheKey(voiceId: string, tone: VoiceToneSettings, text: string): string {
  return createHash('sha256')
    .update(
      `${voiceId}\0${tone.stability}\0${tone.similarityBoost}\0${tone.style}\0${tone.speed}\0${text}`
    )
    .digest('hex');
}

function readMemoryCache(key: string): CacheEntry | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    audioCache.delete(key);
    return null;
  }
  return entry;
}

function writeMemoryCache(key: string, value: Omit<CacheEntry, 'expiresAt'>): void {
  if (audioCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    const oldest = audioCache.keys().next().value;
    if (oldest) audioCache.delete(oldest);
  }
  audioCache.set(key, { ...value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
}

async function readDiskCache(key: string): Promise<CacheEntry | null> {
  try {
    const buffer = await readFile(path.join(DISK_CACHE_DIR, `${key}.mp3`));
    if (!buffer.byteLength) return null;
    return { buffer, mimeType: 'audio/mpeg', expiresAt: Date.now() + MEMORY_CACHE_TTL_MS };
  } catch {
    return null;
  }
}

async function writeDiskCache(key: string, buffer: Buffer): Promise<void> {
  try {
    await mkdir(DISK_CACHE_DIR, { recursive: true });
    await writeFile(path.join(DISK_CACHE_DIR, `${key}.mp3`), buffer);
  } catch (error) {
    console.warn('[tts] ElevenLabs disk cache write failed:', error);
  }
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export async function synthesizeCharacterSpeech(options: {
  apiKey: string;
  text: string;
  characterType?: CharacterType | string;
  personalityPose?: PersonalityPose | string;
  languageHint?: string;
}): Promise<{ buffer: Buffer; mimeType: string; characterType: CharacterType }> {
  const text = options.text.trim();
  if (!text) throw new Error('text is required');

  const characterType =
    options.characterType && isCharacterType(String(options.characterType))
      ? (options.characterType as CharacterType)
      : 'grandma';

  const personalityPose =
    options.personalityPose === 'shy' ||
    options.personalityPose === 'confident' ||
    options.personalityPose === 'wise' ||
    options.personalityPose === 'playful'
      ? options.personalityPose
      : undefined;

  const voiceId = resolveElevenLabsVoiceId(characterType);
  const tone = toneFor(characterType, personalityPose);
  const langKey = (options.languageHint ?? '').toLowerCase();
  const key = cacheKey(voiceId, tone, `${langKey}\0${text}`);

  const memoryHit = readMemoryCache(key);
  if (memoryHit) {
    return { ...memoryHit, characterType };
  }

  const diskHit = await readDiskCache(key);
  if (diskHit) {
    writeMemoryCache(key, diskHit);
    return { ...diskHit, characterType };
  }

  const client = new ElevenLabsClient({ apiKey: options.apiKey });
  // Flash is faster/cheaper for story lines; multilingual still handles many languages.
  const modelId =
    process.env.ELEVENLABS_TTS_MODEL?.trim() ||
    (langKey.startsWith('rw') ? 'eleven_multilingual_v2' : 'eleven_flash_v2_5');

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId,
    outputFormat: 'mp3_44100_128',
    voiceSettings: {
      stability: tone.stability,
      similarityBoost: tone.similarityBoost,
      style: tone.style,
      speed: tone.speed,
      useSpeakerBoost: tone.useSpeakerBoost,
    },
  });

  const buffer = await streamToBuffer(audioStream);
  if (!buffer.byteLength) {
    throw new Error('ElevenLabs returned empty audio');
  }

  const result = { buffer, mimeType: 'audio/mpeg' as const };
  writeMemoryCache(key, result);
  void writeDiskCache(key, buffer);
  return { ...result, characterType };
}

/** @deprecated Use synthesizeCharacterSpeech */
export const synthesizeEnglishSpeech = synthesizeCharacterSpeech;

export function elevenLabsErrorStatus(error: unknown): number {
  if (
    typeof error === 'object' &&
    error &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    const status = (error as { statusCode: number }).statusCode;
    if (status === 401 || status === 403) return 401;
    if (status === 429) return 429;
    if (status >= 500) return 502;
    return status || 500;
  }
  if (
    typeof error === 'object' &&
    error &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403) return 401;
    if (status === 429) return 429;
    if (status >= 500) return 502;
    return status || 500;
  }
  return 500;
}

export function elevenLabsErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/quota|rate.?limit|429/i.test(error.message)) {
      return 'ElevenLabs quota or rate limit reached. Try again shortly.';
    }
    return error.message;
  }
  return 'ElevenLabs TTS request failed';
}

/** Map a story character type onto AiVoiceName personas. */
export function aiVoiceNameForCharacter(characterType?: CharacterType | string): 'grandma' | 'parent' | 'teacher' {
  if (characterType === 'teacher') return 'teacher';
  if (characterType === 'grandma' || characterType === 'grandpa') return 'grandma';
  return 'parent';
}
