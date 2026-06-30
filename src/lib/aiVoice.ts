/** Browser text-to-speech for story narration (no API key required) */

export type AiVoiceName = 'grandma' | 'parent' | 'teacher';

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

/** Drive lip-sync while TTS is active (no audio analyser available) */
export function runTtsLipSync(
  onOpenness: (value: number) => void,
  isActive: () => boolean
): () => void {
  let frame = 0;
  const id = window.setInterval(() => {
    if (!isActive()) {
      onOpenness(0);
      return;
    }
    frame += 1;
    const wave = (Math.sin(frame * 0.35) + 1) / 2;
    onOpenness(0.15 + wave * 0.65);
  }, 80);

  return () => {
    window.clearInterval(id);
    onOpenness(0);
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
