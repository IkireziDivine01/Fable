import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI, ApiError } from '@google/genai';

/** Prebuilt Gemini TTS voices (see ai.google.dev speech-generation docs). */
export const GEMINI_TTS_VOICES = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
] as const;

export type GeminiTtsVoice = (typeof GEMINI_TTS_VOICES)[number];

/** Default: deep, warm storyteller presence. */
export const DEFAULT_GEMINI_TTS_VOICE: GeminiTtsVoice = 'Charon';

const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS = 16;
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ENTRIES = 128;
/** Never hold an HTTP request waiting for quota longer than this — fail fast instead. */
const MAX_INLINE_THROTTLE_MS = 2_500;
const DISK_CACHE_DIR = path.join(process.cwd(), '.cache', 'gemini-tts');

type CacheEntry = { buffer: Buffer; mimeType: string; expiresAt: number };

const audioCache = new Map<string, CacheEntry>();

/** Serialize Gemini calls and space them for free-tier RPM. */
let rateQueue: Promise<void> = Promise.resolve();
let lastApiCallAt = 0;

export class GeminiTtsBusyError extends Error {
  readonly status = 429;
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(
      `Gemini TTS is cooling down (free tier). Retry in ~${Math.ceil(retryAfterMs / 1000)}s.`
    );
    this.name = 'GeminiTtsBusyError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Mastery Storyteller system instruction — style + multilingual / code-switch handling.
 * Folded into the user prompt (TTS models 500 if systemInstruction is set).
 */
export const MASTERY_STORYTELLER_SYSTEM_INSTRUCTION = `You are the Mastery Storyteller, a virtuoso narrator for children's and family stories.

VOICE & DELIVERY (always):
- Deep vocal resonance — rich chest voice, never thin or clipped.
- Highly expressive pacing — stretch key phrases, accelerate through lively beats, then settle.
- Narrative warmth — intimate, inviting, as if speaking to a child by a fire.
- Dramatic pauses — purposeful silence before reveals, after emotional beats, and between scenes.

LANGUAGE (critical):
- Dynamically handle English, Kinyarwanda (Ikinyarwanda), or code-switched text.
- Pronounce each language authentically; never translate or correct the transcript.

OUTPUT RULES:
- Synthesize speech for the TRANSCRIPT only.
- Never read instructions or labels aloud.`;

export function isGeminiTtsVoice(value: string): value is GeminiTtsVoice {
  return (GEMINI_TTS_VOICES as readonly string[]).includes(value);
}

/** Free tier is the default — set GEMINI_TTS_FREE_TIER=0 to disable throttling. */
export function isFreeTierMode(): boolean {
  const raw = process.env.GEMINI_TTS_FREE_TIER?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false;
  return true;
}

function resolveModel(): string {
  return process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
}

/** Free tier ~3 RPM; default 1 RPM to leave headroom. */
function resolveMaxRpm(): number {
  const fromEnv = Number(process.env.GEMINI_TTS_MAX_RPM);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return isFreeTierMode() ? 1 : 30;
}

function normalizeVoice(value: string | undefined): GeminiTtsVoice {
  if (!value) return DEFAULT_GEMINI_TTS_VOICE;
  const trimmed = value.trim();
  const matched = GEMINI_TTS_VOICES.find((v) => v.toLowerCase() === trimmed.toLowerCase());
  return matched ?? DEFAULT_GEMINI_TTS_VOICE;
}

function cacheKey(model: string, voice: string, text: string): string {
  return createHash('sha256').update(`${model}\0${voice}\0${text}`).digest('hex');
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
    const buffer = await readFile(path.join(DISK_CACHE_DIR, `${key}.wav`));
    if (!buffer.byteLength) return null;
    return { buffer, mimeType: 'audio/wav', expiresAt: Date.now() + MEMORY_CACHE_TTL_MS };
  } catch {
    return null;
  }
}

async function writeDiskCache(key: string, buffer: Buffer): Promise<void> {
  try {
    await mkdir(DISK_CACHE_DIR, { recursive: true });
    await writeFile(path.join(DISK_CACHE_DIR, `${key}.wav`), buffer);
  } catch (error) {
    console.warn('[tts] disk cache write failed:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof GeminiTtsBusyError) return 429;
  if (error instanceof ApiError) return error.status;
  if (
    typeof error === 'object' &&
    error &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

function parseRetryDelayMs(error: unknown): number | null {
  const message = getErrorMessage(error);
  const match =
    /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i.exec(message) ||
    /Please retry in (\d+(?:\.\d+)?)s/i.exec(message) ||
    /Retry in ~(\d+)s/i.exec(message);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.ceil(seconds * 1000);
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof GeminiTtsBusyError) return true;
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);
  return status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit|cooling down/i.test(message);
}

/**
 * Fail fast if the next slot is far away — do not hold HTTP open for 60s+.
 * Tiny waits (<2.5s) are still slept inline.
 */
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const minIntervalMs = Math.ceil(60_000 / resolveMaxRpm());

  const run = rateQueue.then(async () => {
    const wait = Math.max(0, lastApiCallAt + minIntervalMs - Date.now());
    if (wait > MAX_INLINE_THROTTLE_MS) {
      console.info(`[tts] busy — need ${Math.ceil(wait / 1000)}s cooldown, failing fast`);
      throw new GeminiTtsBusyError(wait);
    }
    if (wait > 0) {
      await sleep(wait);
    }
    lastApiCallAt = Date.now();
    try {
      return await fn();
    } catch (error) {
      if (isQuotaError(error)) {
        const hinted = parseRetryDelayMs(error) ?? minIntervalMs;
        lastApiCallAt = Date.now() + hinted - minIntervalMs;
      }
      throw error;
    }
  });

  rateQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

/** Wrap raw PCM (s16le) in a WAV container for browser playback. */
export function encodePcmToWav(
  pcm: Buffer,
  channels = PCM_CHANNELS,
  sampleRate = PCM_SAMPLE_RATE,
  bitsPerSample = PCM_BITS
): Buffer {
  const dataLength = pcm.length;
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcm]);
}

function buildSpeakPrompt(transcript: string, languageHint?: string): string {
  const lang = (languageHint ?? '').toLowerCase();
  const isKinyarwanda = lang.startsWith('rw');

  const languageBlock = isKinyarwanda
    ? `LANGUAGE FOR THIS TAKE (critical):
- The TRANSCRIPT is Kinyarwanda (Ikinyarwanda). Speak it as native Kinyarwanda speech.
- Do not translate into English. Speak the words exactly as written.`
    : `LANGUAGE FOR THIS TAKE:
- Detect the language automatically. If Kinyarwanda appears, pronounce it as authentic Ikinyarwanda.`;

  return `${MASTERY_STORYTELLER_SYSTEM_INSTRUCTION}

# AUDIO PROFILE: Mastery Storyteller

### DIRECTOR'S NOTES
Style: Deep vocal resonance, narrative warmth, expressive pacing, dramatic pauses.
${languageBlock}

#### TRANSCRIPT
"""
${transcript.trim()}
"""

Now generate the audio for this transcript only. Do not reply with text.`;
}

function extractInlineAudio(response: {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
  }>;
}): { base64: string; mimeType?: string } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      return { base64: data, mimeType: part.inlineData?.mimeType };
    }
  }
  return null;
}

async function callGeminiTts(options: {
  apiKey: string;
  model: string;
  voiceName: GeminiTtsVoice;
  text: string;
  languageHint?: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });

  // Free tier: one attempt only. Waiting/retrying inside the HTTP request causes timeouts
  // and burns the remaining RPM.
  const response = await withRateLimit(() =>
    ai.models.generateContent({
      model: options.model,
      contents: [{ parts: [{ text: buildSpeakPrompt(options.text, options.languageHint) }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: options.voiceName },
          },
        },
      },
    })
  );

  const audio = extractInlineAudio(response);
  if (!audio?.base64) {
    throw new Error('Gemini TTS response did not include audio data');
  }

  const pcm = Buffer.from(audio.base64, 'base64');
  if (!pcm.byteLength) {
    throw new Error('Gemini TTS returned empty audio');
  }

  const isWav =
    pcm.length >= 12 &&
    pcm.toString('ascii', 0, 4) === 'RIFF' &&
    pcm.toString('ascii', 8, 12) === 'WAVE';

  const buffer = isWav ? pcm : encodePcmToWav(pcm);
  return { buffer, mimeType: 'audio/wav' };
}

export async function synthesizeSpeech(options: {
  apiKey: string;
  text: string;
  voice?: string;
  languageHint?: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const text = options.text.trim();
  if (!text) {
    throw new Error('text is required');
  }

  const voiceName = normalizeVoice(options.voice);
  const model = resolveModel();
  const languageHint = options.languageHint?.trim() || undefined;
  const key = cacheKey(model, voiceName, `${languageHint ?? ''}\0${text}`);

  const memoryHit = readMemoryCache(key);
  if (memoryHit) {
    return { buffer: memoryHit.buffer, mimeType: memoryHit.mimeType };
  }

  const diskHit = await readDiskCache(key);
  if (diskHit) {
    writeMemoryCache(key, diskHit);
    return { buffer: diskHit.buffer, mimeType: diskHit.mimeType };
  }

  const result = await callGeminiTts({
    apiKey: options.apiKey,
    model,
    voiceName,
    text,
    languageHint,
  });

  writeMemoryCache(key, result);
  void writeDiskCache(key, result.buffer);
  return result;
}

export function geminiTtsErrorStatus(error: unknown): number {
  const status = getErrorStatus(error);
  if (status === undefined) return 500;
  if (status === 401 || status === 403) return 401;
  if (status === 429 || isQuotaError(error)) return 429;
  if (status >= 500) return 502;
  return status || 500;
}

export function geminiTtsErrorMessage(error: unknown): string {
  if (error instanceof GeminiTtsBusyError) {
    return error.message;
  }
  if (isQuotaError(error)) {
    const delayMs = parseRetryDelayMs(error);
    const waitHint =
      delayMs != null
        ? ` Retry in ~${Math.ceil(delayMs / 1000)}s.`
        : ' Free tier allows about 1 request per minute.';
    return `Gemini TTS free-tier limit reached.${waitHint}`;
  }
  if (error instanceof ApiError) {
    if (error.status === 504 || /504|timeout/i.test(error.message)) {
      return 'Gemini TTS timed out. Try again in a moment.';
    }
    const nested = /"message"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(error.message);
    if (nested?.[1]) {
      return nested[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
    }
    return error.message || 'Gemini TTS request failed';
  }
  if (error instanceof Error) {
    if (/PROHIBITED_CONTENT|blocked/i.test(error.message)) {
      return 'Gemini TTS rejected this text. Try rephrasing the line.';
    }
    return error.message;
  }
  return 'TTS request failed';
}

export function geminiTtsRetryAfterSeconds(error: unknown): number | undefined {
  if (error instanceof GeminiTtsBusyError) {
    return Math.ceil(error.retryAfterMs / 1000);
  }
  const ms = parseRetryDelayMs(error);
  return ms != null ? Math.ceil(ms / 1000) : undefined;
}
