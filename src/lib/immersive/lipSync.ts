import type { MouthShape, MouthSyncTiming } from './types';

const SHAPES: MouthShape[] = ['closed', 'small', 'medium', 'wide', 'medium', 'small'];

/** Build syllable-like mouth timings from audio duration (no ML required) */
export function buildMouthSyncTimings(durationSec: number, syllableCount?: number): MouthSyncTiming[] {
  const count = syllableCount ?? Math.max(4, Math.round(durationSec * 3));
  const step = durationSec / count;
  const timings: MouthSyncTiming[] = [];

  for (let i = 0; i < count; i += 1) {
    timings.push({
      time: i * step,
      shape: SHAPES[i % SHAPES.length] ?? 'small',
    });
  }

  timings.push({ time: durationSec, shape: 'closed' });
  return timings;
}

export function shapeToOpenness(shape: MouthShape): number {
  switch (shape) {
    case 'closed':
      return 0;
    case 'small':
      return 0.25;
    case 'medium':
      return 0.55;
    case 'wide':
      return 0.9;
    default:
      return 0;
  }
}

export function getMouthOpennessAtTime(timings: MouthSyncTiming[], timeSec: number): number {
  if (timings.length === 0) return 0;

  let active = timings[0];
  for (const t of timings) {
    if (t.time <= timeSec) active = t;
    else break;
  }

  return shapeToOpenness(active?.shape ?? 'closed');
}

/** Amplitude-driven fallback when no pre-calculated timings exist */
export function amplitudeToOpenness(amplitude: number): number {
  return Math.min(1, Math.max(0, amplitude * 2.5));
}

export function estimateSyllableCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 4;
  return Math.max(4, words.reduce((sum, word) => sum + Math.max(1, Math.ceil(word.length / 2.5)), 0));
}
