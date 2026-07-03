import { normalizeViseme } from './character/faceTexture';
import type { MouthShape, MouthSyncTiming, RhubarbViseme } from './types';

const VISEME_CYCLE: RhubarbViseme[] = ['C', 'E', 'A', 'D', 'F', 'G', 'B', 'H'];

/** Build syllable-like mouth timings from audio duration (no ML required) */
export function buildMouthSyncTimings(durationSec: number, syllableCount?: number): MouthSyncTiming[] {
  const count = syllableCount ?? Math.max(4, Math.round(durationSec * 3));
  const step = durationSec / count;
  const timings: MouthSyncTiming[] = [];

  for (let i = 0; i < count; i += 1) {
    timings.push({
      time: i * step,
      shape: VISEME_CYCLE[i % VISEME_CYCLE.length] ?? 'C',
    });
  }

  timings.push({ time: durationSec, shape: 'X' });
  return timings;
}

/** @deprecated Use getVisemeAtTime — maps viseme to 0–1 for legacy callers */
export function shapeToOpenness(shape: MouthShape): number {
  const viseme = normalizeViseme(shape);
  switch (viseme) {
    case 'X':
      return 0;
    case 'B':
    case 'C':
      return 0.25;
    case 'E':
    case 'F':
    case 'G':
    case 'H':
      return 0.55;
    case 'A':
    case 'D':
      return 0.9;
    default:
      return 0;
  }
}

export function getVisemeAtTime(timings: MouthSyncTiming[], timeSec: number): RhubarbViseme {
  if (timings.length === 0) return 'X';

  let active = timings[0];
  for (const t of timings) {
    if (t.time <= timeSec) active = t;
    else break;
  }

  return normalizeViseme(active?.shape ?? 'X');
}

/** @deprecated Use getVisemeAtTime */
export function getMouthOpennessAtTime(timings: MouthSyncTiming[], timeSec: number): number {
  return shapeToOpenness(getVisemeAtTime(timings, timeSec));
}

const TTS_VISEMES: RhubarbViseme[] = ['C', 'E', 'A', 'D', 'F', 'G'];

/** Amplitude-driven fallback when no pre-calculated timings exist */
export function amplitudeToViseme(amplitude: number): RhubarbViseme {
  if (amplitude < 0.15) return 'X';
  if (amplitude < 0.35) return 'C';
  if (amplitude < 0.55) return 'E';
  if (amplitude < 0.75) return 'D';
  return 'A';
}

/** @deprecated Use amplitudeToViseme */
export function amplitudeToOpenness(amplitude: number): number {
  return shapeToOpenness(amplitudeToViseme(amplitude));
}

export function estimateSyllableCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 4;
  return Math.max(4, words.reduce((sum, word) => sum + Math.max(1, Math.ceil(word.length / 2.5)), 0));
}

export function nextTtsViseme(frame: number): RhubarbViseme {
  return TTS_VISEMES[frame % TTS_VISEMES.length] ?? 'C';
}
