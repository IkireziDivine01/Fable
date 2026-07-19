/** Story narration TTS — Mateza for Kinyarwanda, browser speechSynthesis as fallback */

export type AiVoiceName = 'grandma' | 'parent' | 'teacher';
export type TtsEngine = 'mateza' | 'browser';

const VOICE_PREFS: Record<AiVoiceName, { pitch: number; rate: number }> = {
  grandma: { pitch: 0.85, rate: 0.88 },
  parent: { pitch: 1, rate: 0.92 },
  teacher: { pitch: 0.95, rate: 0.9 },
};

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
  onEnd?: () => void;
  onStart?: () => void;
  /** Called immediately with a stop fn so callers can cancel during fetch latency. */
  registerStop?: (stop: () => void) => void;
};

/**
 * Mateza Kinyarwanda TTS via /api/tts.
 * Returns a stop function, or null if the request failed (caller may fall back).
 */
async function speakWithMateza(
  text: string,
  options?: SpeakOptions
): Promise<(() => void) | null> {
  if (typeof window === 'undefined') return null;

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
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (cancelled) return stop;

    if (!response.ok) {
      cleanup();
      return null;
    }

    const blob = await response.blob();
    if (cancelled) return stop;
    if (!blob.size) {
      cleanup();
      return null;
    }

    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.onended = () => finish();
    audio.onerror = () => finish();

    options?.onStart?.();
    await audio.play();
    if (cancelled) {
      stop();
      return stop;
    }

    return stop;
  } catch {
    if (cancelled) return stop;
    cleanup();
    return null;
  }
}

/**
 * Speak narration. Defaults to Mateza for Kinyarwanda (`rw*`), browser otherwise.
 * Mateza failures fall back to browser speechSynthesis.
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
    const stop = await speakWithMateza(text, options);
    if (stop) return stop;
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

  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  await ctx.resume();

  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  await ctx.close();
}
