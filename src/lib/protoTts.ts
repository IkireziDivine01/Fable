import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Proto Voice API TTS — fine-tuned Kinyarwanda (and other local languages).
 * Docs: https://documentation.proto.cx/docs/developers/apis/voice-api
 *
 * Note: Proto's docs say the TTS body is Base64, but the live API returns raw
 * binary audio (Content-Type: audio/mp3|audio/wav). We accept both.
 */

const PROTO_TTS_URL =
  'https://v3-api.proto.cx/api/platform/v1/voice/{teamspace_id}/tts';
const DISK_CACHE_DIR = path.join(process.cwd(), '.cache', 'proto-tts');
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ENTRIES = 128;
const MAX_TEXT_CHARS = 5_000;

export type ProtoTtsGender = 'male' | 'female';
export type ProtoTtsFormat = 'mp3' | 'wav';

type CacheEntry = { buffer: Buffer; mimeType: string; expiresAt: number };

const audioCache = new Map<string, CacheEntry>();

/** Kinyarwanda (and Kuanyama) only expose a female TTS voice. */
export function resolveProtoGender(lang: string, preferred?: ProtoTtsGender): ProtoTtsGender {
  const code = lang.toLowerCase().split('-')[0] ?? 'en';
  if (code === 'rw' || code === 'kj') return 'female';
  return preferred === 'male' ? 'male' : 'female';
}

function resolveLang(languageHint?: string): string {
  const raw = (languageHint ?? 'en').trim().toLowerCase();
  if (!raw) return 'en';
  // Proto uses bare codes (rw, en); strip region (rw-RW → rw).
  if (raw.startsWith('zh-hans')) return 'zh-Hans';
  if (raw.startsWith('zh-hant')) return 'zh-Hant';
  return raw.split('-')[0] || 'en';
}

function cacheKey(
  teamspaceId: string,
  lang: string,
  gender: ProtoTtsGender,
  format: ProtoTtsFormat,
  speed: number,
  text: string
): string {
  return createHash('sha256')
    .update(`${teamspaceId}\0${lang}\0${gender}\0${format}\0${speed}\0${text}`)
    .digest('hex');
}

function readMemoryCache(key: string): CacheEntry | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt || !looksLikeAudioBuffer(entry.buffer)) {
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

async function readDiskCache(key: string, format: ProtoTtsFormat): Promise<CacheEntry | null> {
  try {
    const ext = format === 'wav' ? 'wav' : 'mp3';
    const buffer = await readFile(path.join(DISK_CACHE_DIR, `${key}.${ext}`));
    // Skip corrupt entries left by the old Base64-only decoder.
    if (!looksLikeAudioBuffer(buffer)) return null;
    return {
      buffer,
      mimeType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

async function writeDiskCache(key: string, format: ProtoTtsFormat, buffer: Buffer): Promise<void> {
  try {
    await mkdir(DISK_CACHE_DIR, { recursive: true });
    const ext = format === 'wav' ? 'wav' : 'mp3';
    await writeFile(path.join(DISK_CACHE_DIR, `${key}.${ext}`), buffer);
  } catch (error) {
    console.warn('[tts] Proto disk cache write failed:', error);
  }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function looksLikeAudioBuffer(buffer: Buffer): boolean {
  if (buffer.byteLength < 12) return false;
  // MP3 with ID3 tag
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return true;
  // MPEG frame sync
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
  // WAV
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return true;
  }
  return false;
}

/** Decode Base64 text (docs) or JSON-wrapped Base64. */
function decodeProtoBase64Payload(raw: string): Buffer {
  let payload = raw.trim();
  if (!payload) {
    throw new Error('Proto TTS returned an empty response');
  }

  // JSON string or { audio / data / ... } wrapper
  if (payload.startsWith('{') || payload.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (typeof parsed === 'string') {
        payload = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const candidate =
          obj.audio ?? obj.data ?? obj.content ?? obj.result ?? obj.base64 ?? obj.payload;
        if (typeof candidate === 'string') {
          payload = candidate;
        } else {
          throw new Error('Proto TTS JSON response did not include audio');
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Not JSON — treat as raw Base64 below.
      } else {
        throw error;
      }
    }
  }

  if (payload.startsWith('data:') && payload.includes('base64,')) {
    payload = payload.slice(payload.indexOf('base64,') + 'base64,'.length);
  }

  payload = stripQuotes(payload).replace(/\s/g, '');
  const buffer = Buffer.from(payload, 'base64');
  if (!buffer.byteLength) {
    throw new Error('Proto TTS returned empty audio after Base64 decode');
  }
  return buffer;
}

/**
 * Live Proto TTS returns raw binary MP3/WAV. Docs describe Base64 — support both.
 */
function decodeProtoAudioPayload(body: Buffer, contentType: string | null): Buffer {
  if (looksLikeAudioBuffer(body)) {
    return body;
  }

  const type = (contentType ?? '').toLowerCase();
  if (type.includes('audio/') || type.includes('octet-stream')) {
    if (body.byteLength > 0) return body;
  }

  const asText = body.toString('utf8');
  const decoded = decodeProtoBase64Payload(asText);
  if (!looksLikeAudioBuffer(decoded) && decoded.byteLength < 256) {
    throw new Error('Proto TTS response was not valid audio');
  }
  return decoded;
}

function getErrorStatus(error: unknown): number | undefined {
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

export async function synthesizeProtoSpeech(options: {
  teamspaceId: string;
  apiKey: string;
  text: string;
  languageHint?: string;
  gender?: ProtoTtsGender;
  responseFormat?: ProtoTtsFormat;
  speed?: number;
}): Promise<{ buffer: Buffer; mimeType: string; lang: string }> {
  const text = options.text.trim();
  if (!text) throw new Error('text is required');
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`text exceeds Proto TTS limit of ${MAX_TEXT_CHARS} characters`);
  }

  const teamspaceId = options.teamspaceId.trim();
  const apiKey = options.apiKey.trim();
  if (!teamspaceId) throw new Error('PROTO_TEAMSPACE_ID is required');
  if (!apiKey) throw new Error('PROTO_TAKEOVER_SECRET is required');

  const lang = resolveLang(options.languageHint);
  const gender = resolveProtoGender(lang, options.gender);
  const responseFormat: ProtoTtsFormat = options.responseFormat === 'wav' ? 'wav' : 'mp3';
  const speed =
    typeof options.speed === 'number' && Number.isFinite(options.speed)
      ? Math.min(4, Math.max(0.25, options.speed))
      : 1;

  const key = cacheKey(teamspaceId, lang, gender, responseFormat, speed, text);

  const memoryHit = readMemoryCache(key);
  if (memoryHit) {
    return { buffer: memoryHit.buffer, mimeType: memoryHit.mimeType, lang };
  }

  const diskHit = await readDiskCache(key, responseFormat);
  if (diskHit) {
    writeMemoryCache(key, diskHit);
    return { buffer: diskHit.buffer, mimeType: diskHit.mimeType, lang };
  }

  const url = PROTO_TTS_URL.replace('{teamspace_id}', encodeURIComponent(teamspaceId));
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
    body: JSON.stringify({
      text,
      lang,
      response_format: responseFormat,
      speed,
      gender,
    }),
  });

  const rawBody = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const err = new Error(
      rawBody.toString('utf8').trim().slice(0, 400) || `Proto TTS failed (${response.status})`
    ) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  const buffer = decodeProtoAudioPayload(rawBody, response.headers.get('content-type'));
  const mimeType = responseFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
  const result = { buffer, mimeType };

  writeMemoryCache(key, result);
  void writeDiskCache(key, responseFormat, buffer);
  return { ...result, lang };
}

export function protoTtsErrorStatus(error: unknown): number {
  const status = getErrorStatus(error);
  if (status === undefined) return 500;
  if (status === 401 || status === 403) return 401;
  if (status === 429) return 429;
  if (status >= 500) return 502;
  return status || 500;
}

export function protoTtsErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/quota|rate.?limit|429|interaction/i.test(error.message)) {
      return 'Proto Voice API quota or rate limit reached. Try again shortly.';
    }
    if (/401|403|unauthorized|forbidden|takeover/i.test(error.message)) {
      return 'Proto Voice API credentials were rejected. Check PROTO_TEAMSPACE_ID and PROTO_TAKEOVER_SECRET.';
    }
    return error.message;
  }
  return 'Proto TTS request failed';
}
