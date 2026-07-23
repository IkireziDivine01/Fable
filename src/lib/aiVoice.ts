/** Story narration TTS — ElevenLabs (English), Proto (Kinyarwanda). */

import type { RhubarbViseme, CharacterType, PersonalityPose } from '@/lib/immersive/types';
import { nextTtsViseme } from '@/lib/immersive/lipSync';

export type AiVoiceName = 'grandma' | 'parent' | 'teacher';
export type TtsEngine = 'proto' | 'elevenlabs' | 'gemini';

/** Don't hang the player waiting forever on network TTS. */
const TTS_FETCH_TIMEOUT_MS = 30_000;

function aiVoiceNameForCharacter(characterType?: CharacterType | string): AiVoiceName {
  if (characterType === 'teacher') return 'teacher';
  if (characterType === 'grandma' || characterType === 'grandpa') return 'grandma';
  return 'parent';
}

type TtsPlaybackControls = {
  stop: () => void;
  pause: () => void;
  resume: () => Promise<void>;
};

type SpeakOptions = {
  voice?: AiVoiceName;
  lang?: string;
  characterType?: CharacterType;
  personalityPose?: PersonalityPose;
  /** TTS backend for /api/tts. Defaults by language when omitted. */
  provider?: TtsEngine;
  onEnd?: () => void;
  onStart?: () => void;
  /** Called immediately with a stop fn so callers can cancel during fetch latency. */
  registerStop?: (stop: () => void) => void;
  /** Pause/resume once audio is ready (no-ops until then). */
  registerPlaybackControls?: (controls: TtsPlaybackControls) => void;
};

type ApiSpeakResult =
  | { status: 'playing'; stop: () => void }
  | { status: 'cancelled' }
  | { status: 'error'; message?: string };

function isKinyarwandaLang(lang?: string): boolean {
  return Boolean(lang && lang.toLowerCase().startsWith('rw'));
}

/** Resolve provider: Proto for Kinyarwanda, ElevenLabs for English. */
export function ttsProviderForLang(lang?: string): TtsEngine {
  return isKinyarwandaLang(lang) ? 'proto' : 'elevenlabs';
}

let sharedAudioCtx: AudioContext | null = null;
let apiFlight: Promise<ApiSpeakResult> | null = null;

async function ensureAudioUnlocked(): Promise<void> {
  if (typeof window === 'undefined') return;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    await sharedAudioCtx.resume();
  }
}

async function speakWithApiTts(
  text: string,
  options?: SpeakOptions
): Promise<ApiSpeakResult> {
  if (typeof window === 'undefined') return { status: 'error', message: 'No window' };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let settled = false;
  let cancelled = false;

  const cleanup = () => {
    window.clearTimeout(timeoutId);
    controller.abort();
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  const stop = () => {
    cancelled = true;
    if (settled) return;
    settled = true;
    cleanup();
  };

  const pause = () => {
    if (audio && !audio.paused) audio.pause();
  };

  const resume = async () => {
    if (!audio || cancelled || settled) return;
    if (audio.paused) await audio.play();
  };

  options?.registerStop?.(stop);
  options?.registerPlaybackControls?.({ stop, pause, resume });

  const finish = () => {
    if (settled) return;
    settled = true;
    cleanup();
    options?.onEnd?.();
  };

  try {
    const provider = options?.provider ?? ttsProviderForLang(options?.lang);
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        lang: options?.lang,
        characterType: options?.characterType,
        personalityPose: options?.personalityPose,
        provider,
      }),
      signal: controller.signal,
    });

    if (cancelled) return { status: 'cancelled' };

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      cleanup();
      return {
        status: 'error',
        message: payload?.error || `TTS failed (${response.status})`,
      };
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/mpeg';
    const bytes = await response.arrayBuffer();
    if (cancelled) return { status: 'cancelled' };
    if (!bytes.byteLength) {
      cleanup();
      return { status: 'error', message: 'Empty audio from TTS' };
    }

    const blob = new Blob([bytes], { type: mimeType });
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.preload = 'auto';
    audio.onended = () => finish();
    audio.onerror = () => finish();

    await ensureAudioUnlocked();
    if (cancelled) return { status: 'cancelled' };

    options?.onStart?.();
    try {
      await audio.play();
    } catch {
      await ensureAudioUnlocked();
      if (cancelled) return { status: 'cancelled' };
      await audio.play();
    }

    if (cancelled) {
      stop();
      return { status: 'cancelled' };
    }

    return { status: 'playing', stop };
  } catch (error) {
    if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
      if (!cancelled) {
        cleanup();
        return { status: 'error', message: 'TTS timed out — try again shortly.' };
      }
      return { status: 'cancelled' };
    }
    cleanup();
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'TTS playback failed',
    };
  }
}

async function speakWithApiSingleFlight(
  text: string,
  options?: SpeakOptions
): Promise<ApiSpeakResult> {
  if (apiFlight) {
    return { status: 'error', message: 'Another TTS request is already in progress.' };
  }
  const flight = speakWithApiTts(text, options).finally(() => {
    if (apiFlight === flight) apiFlight = null;
  });
  apiFlight = flight;
  return flight;
}

/**
 * Fetch narration audio bytes without playing (for save-as-sentence-voice).
 * Does not share the playback single-flight lock.
 */
export async function fetchNarrationAudio(
  text: string,
  options?: {
    lang?: string;
    characterType?: CharacterType;
    personalityPose?: PersonalityPose;
    provider?: TtsEngine;
  }
): Promise<Blob> {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('Nothing to narrate — add sentence text first.');
  }

  if (typeof window === 'undefined') {
    throw new Error('TTS is only available in the browser');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

  try {
    const provider = options?.provider ?? ttsProviderForLang(options?.lang);
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        lang: options?.lang,
        characterType: options?.characterType ?? 'grandma',
        personalityPose: options?.personalityPose,
        provider,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || `TTS failed (${response.status})`);
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/mpeg';
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) {
      throw new Error('Empty audio from TTS');
    }
    return new Blob([bytes], { type: mimeType });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('TTS timed out — try again shortly.');
    }
    throw error instanceof Error ? error : new Error('TTS generation failed');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Speak narration via ElevenLabs (English) or Proto (Kinyarwanda).
 * No browser speechSynthesis fallback.
 */
export async function speakNarration(
  text: string,
  options?: SpeakOptions & {
    engine?: TtsEngine;
    voice?: AiVoiceName;
    lang?: string;
    characterType?: CharacterType;
    personalityPose?: PersonalityPose;
  }
): Promise<() => void> {
  const voice = options?.voice ?? aiVoiceNameForCharacter(options?.characterType);
  const provider = options?.engine ?? options?.provider ?? ttsProviderForLang(options?.lang);

  const result = await speakWithApiSingleFlight(text, {
    ...options,
    voice,
    provider,
  });

  if (result.status === 'playing') return result.stop;
  if (result.status === 'cancelled') return () => undefined;

  if (result.message) {
    console.warn('[tts] API TTS failed:', result.message);
  }

  options?.onEnd?.();
  return () => undefined;
}

/** Drive lip-sync while TTS is active (no audio analyser available) */
export function runTtsLipSync(
  onViseme: (value: RhubarbViseme) => void,
  isActive: () => boolean
): () => void {
  let frame = 0;
  const id = window.setInterval(() => {
    if (!isActive()) {
      onViseme('X');
      return;
    }
    frame += 1;
    onViseme(nextTtsViseme(frame));
  }, 80);

  return () => {
    window.clearInterval(id);
    onViseme('X');
  };
}

/** Unlock audio during a user gesture so playback and TTS are allowed */
export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined') return;

  await ensureAudioUnlocked();

  if (!sharedAudioCtx) return;
  const buffer = sharedAudioCtx.createBuffer(1, 1, 22050);
  const source = sharedAudioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(sharedAudioCtx.destination);
  source.start(0);
}
