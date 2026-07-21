import { describe, expect, it } from 'vitest';
import {
  deriveGestureFromText,
  parseReactionGesture,
  sampleGesture,
} from '../character/gestures';

describe('parseReactionGesture', () => {
  it('accepts known gestures and rejects others', () => {
    expect(parseReactionGesture('nod')).toBe('nod');
    expect(parseReactionGesture('  WAVE ')).toBeUndefined();
    expect(parseReactionGesture('wave')).toBe('wave');
    expect(parseReactionGesture('dance')).toBeUndefined();
    expect(parseReactionGesture(null)).toBeUndefined();
  });
});

describe('deriveGestureFromText', () => {
  it('maps bilingual keywords to gestures', () => {
    expect(deriveGestureFromText('Muraho, friends!')).toBe('wave');
    expect(deriveGestureFromText('She said yego with a smile')).toBe('nod');
    expect(deriveGestureFromText('They clap and cheer')).toBe('clap');
    expect(deriveGestureFromText('Look over there — reba!')).toBe('point');
    expect(deriveGestureFromText('Wow, amazing!')).toBe('surprise');
  });

  it('returns undefined when no keyword matches', () => {
    expect(deriveGestureFromText('They walked quietly home.')).toBeUndefined();
  });
});

describe('sampleGesture', () => {
  it('returns rest pose for null / out-of-range edges', () => {
    const rest = sampleGesture(null, 0.5);
    expect(rest.headPitch).toBe(0);
    expect(rest.armL).toEqual([0, 0, 0]);

    const atStart = sampleGesture('nod', 0);
    expect(atStart.headPitch).toBe(0);
    const atEnd = sampleGesture('nod', 1);
    expect(atEnd.headPitch).toBe(0);
  });

  it('produces non-zero motion mid-gesture', () => {
    const mid = sampleGesture('wave', 0.4);
    expect(mid.armR[0]).not.toBe(0);
    expect(mid.tailBoost).toBeGreaterThan(0);
  });
});
