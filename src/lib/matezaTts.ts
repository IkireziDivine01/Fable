import { ApiError, createClient, TTS_VOICES, type TtsVoice } from '@withmateza/sdk';

const FORMAT_MIME: Record<string, string> = {
  wav: 'audio/wav',
  wave: 'audio/wav',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
};

/** Mateza + Cloudflare often 504 on longer Kinyarwanda lines (~30s). Keep chunks short. */
const MAX_CHUNK_CHARS = 85;
const MAX_CHUNK_ATTEMPTS = 2;

export function isTtsVoice(value: string): value is TtsVoice {
  return (TTS_VOICES as readonly string[]).includes(value);
}

export function splitTtsChunks(text: string, maxLen = MAX_CHUNK_CHARS): string[] {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const parts = trimmed.split(/(?<=[.!?…,;:])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  const pushHardSplit = (value: string) => {
    const words = value.split(' ');
    for (const word of words) {
      if (!word) continue;
      if (!current) {
        current = word;
        continue;
      }
      if (`${current} ${word}`.length <= maxLen) {
        current = `${current} ${word}`;
      } else {
        pushCurrent();
        current = word;
      }
    }
  };

  for (const part of parts) {
    if (part.length > maxLen) {
      pushCurrent();
      pushHardSplit(part);
      continue;
    }
    if (!current) {
      current = part;
      continue;
    }
    if (`${current} ${part}`.length <= maxLen) {
      current = `${current} ${part}`;
    } else {
      pushCurrent();
      current = part;
    }
  }
  pushCurrent();
  return chunks.length > 0 ? chunks : [trimmed.slice(0, maxLen)];
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

export function mimeFromFormat(format: string | undefined, buffer: Buffer): string {
  const key = (format ?? '').toLowerCase().replace(/^\./, '');
  return FORMAT_MIME[key] || sniffAudioMime(buffer) || 'audio/wav';
}

function readWavPcm(buffer: Buffer): {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  pcm: Buffer;
} {
  if (
    buffer.length < 44 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new Error('Expected WAV audio from Mateza');
  }

  let offset = 12;
  let channels = 1;
  let sampleRate = 22050;
  let bitsPerSample = 16;
  let pcm: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = Math.min(dataStart + size, buffer.length);

    if (id === 'fmt ' && size >= 16) {
      channels = buffer.readUInt16LE(dataStart + 2);
      sampleRate = buffer.readUInt32LE(dataStart + 4);
      bitsPerSample = buffer.readUInt16LE(dataStart + 14);
    } else if (id === 'data') {
      pcm = buffer.subarray(dataStart, dataEnd);
      break;
    }

    offset = dataStart + size + (size % 2);
  }

  if (!pcm) {
    throw new Error('WAV audio was missing a data chunk');
  }

  return { channels, sampleRate, bitsPerSample, pcm };
}

function encodeWav(pcmParts: Buffer[], channels: number, sampleRate: number, bitsPerSample: number): Buffer {
  const dataLength = pcmParts.reduce((sum, part) => sum + part.length, 0);
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

  return Buffer.concat([header, ...pcmParts]);
}

export function concatWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error('No audio buffers to concatenate');
  }
  if (buffers.length === 1) return buffers[0];

  const parsed = buffers.map(readWavPcm);
  const { channels, sampleRate, bitsPerSample } = parsed[0];
  for (const part of parsed.slice(1)) {
    if (
      part.channels !== channels ||
      part.sampleRate !== sampleRate ||
      part.bitsPerSample !== bitsPerSample
    ) {
      throw new Error('Mateza returned mismatched WAV formats across chunks');
    }
  }

  return encodeWav(
    parsed.map((part) => part.pcm),
    channels,
    sampleRate,
    bitsPerSample
  );
}

async function synthesizeChunk(
  apiKey: string,
  text: string,
  voice: TtsVoice
): Promise<{ buffer: Buffer; format: string }> {
  const mateza = createClient({ apiKey });
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
    try {
      const speech = await mateza.synthesizeSpeech({
        text,
        language: 'rw',
        voice,
        mode: 'baseline',
      });

      let buffer: Buffer | null = null;
      if (speech.data.audio_base64) {
        buffer = Buffer.from(speech.data.audio_base64, 'base64');
      } else if (speech.data.media_url) {
        const mediaRes = await fetch(speech.data.media_url, { cache: 'no-store' });
        if (!mediaRes.ok) {
          throw new Error('Mateza media URL could not be downloaded');
        }
        buffer = Buffer.from(await mediaRes.arrayBuffer());
      }

      if (!buffer || buffer.byteLength === 0) {
        throw new Error(speech.data.warning?.trim() || 'Mateza response did not include audio data');
      }

      return { buffer, format: speech.data.format || 'wav' };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ApiError &&
        (error.statusCode === 502 || error.statusCode === 503 || error.statusCode === 504);
      if (!retryable || attempt === MAX_CHUNK_ATTEMPTS) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Mateza speech synthesis failed');
}

export async function synthesizeKinyarwandaSpeech(options: {
  apiKey: string;
  text: string;
  voice?: TtsVoice;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const voice = options.voice && isTtsVoice(options.voice) ? options.voice : 'female';
  const chunks = splitTtsChunks(options.text);
  if (chunks.length === 0) {
    throw new Error('text is required');
  }

  // Parallelize short chunks — sequential often exceeds Cloudflare's ~30s edge timeout.
  const results = await Promise.all(
    chunks.map((chunk) => synthesizeChunk(options.apiKey, chunk, voice))
  );

  const format = results[0].format.toLowerCase();
  const allWav = results.every(
    (result) =>
      result.format.toLowerCase() === 'wav' ||
      result.format.toLowerCase() === 'wave' ||
      sniffAudioMime(result.buffer) === 'audio/wav'
  );

  const buffer =
    results.length === 1
      ? results[0].buffer
      : allWav
        ? concatWavBuffers(results.map((result) => result.buffer))
        : (() => {
            throw new Error('Mateza returned non-WAV audio that cannot be merged');
          })();

  return {
    buffer,
    mimeType: mimeFromFormat(allWav ? 'wav' : format, buffer),
  };
}

export function matezaErrorStatus(error: unknown): number {
  if (!(error instanceof ApiError)) return 500;
  if (error.statusCode === 401 || error.statusCode === 403) return 401;
  if (error.statusCode === 429) return 429;
  if (error.statusCode >= 500) return 502;
  return error.statusCode || 500;
}

export function matezaErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 504 || /504/.test(error.message)) {
      return 'Mateza timed out generating speech. Try again in a moment.';
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (/Unexpected token|<!DOCTYPE|is not valid JSON/i.test(error.message)) {
      return 'Mateza returned an invalid response (often a timeout). Try again.';
    }
    return error.message;
  }
  return 'TTS request failed';
}
