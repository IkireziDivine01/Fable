import type { ReactionGesture } from '../types';

export const VALID_GESTURES = new Set<ReactionGesture>([
  'nod',
  'wave',
  'clap',
  'point',
  'surprise',
]);

export const GESTURE_DURATION_SEC: Record<ReactionGesture, number> = {
  nod: 0.9,
  wave: 1.35,
  clap: 1.1,
  point: 1.2,
  surprise: 1.0,
};

export interface GesturePose {
  /** Extra head / body pitch (nod) */
  headPitch: number;
  /** Left arm rotation deltas from rest [x, y, z] */
  armL: [number, number, number];
  /** Right arm rotation deltas from rest [x, y, z] */
  armR: [number, number, number];
  /** Extra vertical bounce (surprise / clap) */
  bobY: number;
  /** Dog tail wag boost */
  tailBoost: number;
}

const REST: GesturePose = {
  headPitch: 0,
  armL: [0, 0, 0],
  armR: [0, 0, 0],
  bobY: 0,
  tailBoost: 0,
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Envelope: rise to peak ~0.35, hold, ease out by 1.0 */
function envelope(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 0;
  if (progress < 0.28) return easeOutCubic(progress / 0.28);
  if (progress < 0.55) return 1;
  return 1 - easeInOut((progress - 0.55) / 0.45);
}

function sampleTarget(gesture: ReactionGesture, progress: number): GesturePose {
  const env = envelope(progress);
  const wiggle = Math.sin(progress * Math.PI * 6);

  switch (gesture) {
    case 'nod':
      return {
        ...REST,
        headPitch: Math.sin(progress * Math.PI * 2.2) * 0.22 * env,
      };
    case 'wave':
      return {
        ...REST,
        armR: [-1.1 * env, 0.15 * env, -0.35 + wiggle * 0.55 * env],
        headPitch: 0.04 * env,
        tailBoost: 0.35 * env,
      };
    case 'clap':
      return {
        ...REST,
        armL: [-0.85 * env, 0.2 * env, 0.75 * env],
        armR: [-0.85 * env, -0.2 * env, -0.75 * env],
        bobY: Math.abs(Math.sin(progress * Math.PI * 4)) * 0.02 * env,
        tailBoost: 0.25 * env,
      };
    case 'point':
      return {
        ...REST,
        armR: [-1.35 * env, 0.05 * env, -0.15 * env],
        headPitch: -0.06 * env,
        tailBoost: 0.15 * env,
      };
    case 'surprise':
      return {
        ...REST,
        armL: [-1.5 * env, 0.1 * env, 0.9 * env],
        armR: [-1.5 * env, -0.1 * env, -0.9 * env],
        headPitch: -0.12 * env,
        bobY: 0.04 * env,
        tailBoost: 0.8 * env,
      };
    default:
      return REST;
  }
}

/**
 * Sample a one-shot gesture pose.
 * @param progress 0..1 over the gesture duration
 */
export function sampleGesture(
  gesture: ReactionGesture | null | undefined,
  progress: number
): GesturePose {
  if (!gesture) return REST;
  return sampleTarget(gesture, Math.min(1, Math.max(0, progress)));
}

export function parseReactionGesture(raw: unknown): ReactionGesture | undefined {
  const value = String(raw ?? '').trim() as ReactionGesture;
  return VALID_GESTURES.has(value) ? value : undefined;
}

/** Keyword → gesture for heuristic / AI-free beats */
export function deriveGestureFromText(text: string): ReactionGesture | undefined {
  const t = text.toLowerCase();
  if (/\b(hello|hi |greet|wave|muraho|mwiriwe)\b/.test(t)) return 'wave';
  if (/\b(yes|nod|agree|yego|okay|ok)\b/.test(t)) return 'nod';
  if (/\b(clap|cheer|celebrate|bravo|ishimwe)\b/.test(t)) return 'clap';
  if (/\b(look|see|there|point|reba|aha)\b/.test(t)) return 'point';
  if (/\b(wow|oh!|surprise|amazed|sudden|amazing)\b/.test(t)) return 'surprise';
  return undefined;
}
