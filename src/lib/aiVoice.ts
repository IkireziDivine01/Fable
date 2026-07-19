/** Story narration TTS — Mateza for Kinyarwanda, browser speechSynthesis as fallback */

export type AiVoiceName = 'grandma' | 'parent' | 'teacher';
export type TtsEngine = 'mateza' | 'browser';
export type MatezaTtsVoice = 'default' | 'male' | 'female';

const VOICE_PREFS: Record<AiVoiceName, { pitch: number; rate: number }> = {
  grandma: { pitch: 0.85, rate: 0.88 },
  parent: { pitch: 1, rate: 0.92 },
  teacher: { pitch: 0.95, rate: 0.9 },
};

/** Map story voice personas onto Mateza TTS voices. */
function matezaVoiceFor(name?: AiVoiceName): MatezaTtsVoice {
  if (name === 'teacher') return 'male';
  return 'female';
}

function pickVoice(name: AiVoiceName): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefer =
    name === 'grandma'
      ? voices.find((v) => /female|samantha|karen|victoria/i.test(v.name))
      : voices.find((v) => /en/i.test(v.lang));
  return prefer ?? voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

/** Browser text-to-speech (accent/pronunciation is weak for Kinyarwanda) */
export function speakText(
  text: string,
  options?: { voice?: AiVoiceName; lang?: string; onEnd?: () => void; onStart?: () => void }
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options?.onEnd?.();
    return () => undefined;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const prefs = VOICE_PREFS[options?.voice ?? 'parent'];
  utterance.pitch = prefs.pitch;
  utterance.rate = prefs.rate;
  utterance.lang = options?.lang ?? 'en-US';

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = utterance.lang.split('-')[0];
  const voice =
    pickVoice(options?.voice ?? 'parent') ??
    voices.find((v) => v.lang.startsWith(langPrefix)) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null;
  if (voice) utterance.voice = voice;

  utterance.onstart = () => options?.onStart?.();
  utterance.onend = () => options?.onEnd?.();
  utterance.onerror = () => options?.onEnd?.();

  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

type SpeakOptions = {
  voice?: AiVoiceName;
  onEnd?: () => void;
  onStart?: () => void;
  /** Called immediately with a stop fn so callers can cancel during fetch latency. */
  registerStop?: (stop: () => void) => void;
};

type MatezaSpeakResult =
  | { status: 'playing'; stop: () => void }
  | { status: 'cancelled' }
  | { status: 'error'; message?: string };

let sharedAudioCtx: AudioContext | null = null;

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

/**
 * Mateza Kinyarwanda TTS via /api/tts.
 */
async function speakWithMateza(
  text: string,
  options?: SpeakOptions
): Promise<MatezaSpeakResult> {
  if (typeof window === 'undefined') return { status: 'error', message: 'No window' };

  const controller = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let settled = false;
  let cancelled = false;

  const cleanup = () => {
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

  options?.registerStop?.(stop);

  const finish = () => {
    if (settled) return;
    settled = true;
    cleanup();
    options?.onEnd?.();
  };

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: matezaVoiceFor(options?.voice),
      }),
      signal: controller.signal,
    });

    if (cancelled) return { status: 'cancelled' };

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      cleanup();
      return { status: 'error', message: payload?.error || `TTS failed (${response.status})` };
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/wav';
    const bytes = await response.arrayBuffer();
    if (cancelled) return { status: 'cancelled' };
    if (!bytes.byteLength) {
      cleanup();
      return { status: 'error', message: 'Empty audio from Mateza' };
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
      // Autoplay can still block after a long fetch — retry once after unlock.
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
      return { status: 'cancelled' };
    }
    cleanup();
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Mateza playback failed',
    };
  }
}

/**
 * Speak narration. Defaults to Mateza for Kinyarwanda (`rw*`), browser otherwise.
 * Mateza failures fall back to browser speechSynthesis unless cancelled.
 */
export async function speakNarration(
  text: string,
  options?: SpeakOptions & {
    engine?: TtsEngine;
    voice?: AiVoiceName;
    lang?: string;
  }
): Promise<() => void> {
  const lang = options?.lang ?? 'en-US';
  const preferMateza =
    options?.engine === 'mateza' ||
    (options?.engine !== 'browser' && lang.toLowerCase().startsWith('rw'));

  if (preferMateza) {
    const result = await speakWithMateza(text, options);
    if (result.status === 'playing') return result.stop;
    if (result.status === 'cancelled') return () => undefined;
    if (result.message) {
      console.warn('[tts] Mateza failed, falling back to browser voice:', result.message);
    }
  }

  const browserStop = speakText(text, options);
  options?.registerStop?.(browserStop);
  return browserStop;
}

import type { RhubarbViseme } from '@/lib/immersive/types';
import { nextTtsViseme } from '@/lib/immersive/lipSync';

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

export function preloadVoices(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.getVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}

/** Unlock audio during a user gesture so playback and TTS are allowed */
export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined') return;

  preloadVoices();
  await ensureAudioUnlocked();

  if (!sharedAudioCtx) return;
  const buffer = sharedAudioCtx.createBuffer(1, 1, 22050);
  const source = sharedAudioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(sharedAudioCtx.destination);
  source.start(0);
}
