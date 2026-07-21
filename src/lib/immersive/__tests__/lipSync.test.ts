import { describe, expect, it } from 'vitest';
import {
  amplitudeToViseme,
  buildMouthSyncTimings,
  estimateSyllableCount,
  getVisemeAtTime,
  nextTtsViseme,
  shapeToOpenness,
} from '../lipSync';

describe('buildMouthSyncTimings', () => {
  it('builds evenly spaced timings ending in closed mouth', () => {
    const timings = buildMouthSyncTimings(2, 4);
    expect(timings).toHaveLength(5);
    expect(timings[0]?.time).toBe(0);
    expect(timings[1]?.time).toBe(0.5);
    expect(timings.at(-1)).toEqual({ time: 2, shape: 'X' });
  });

  it('estimates syllable count from duration when omitted', () => {
    const timings = buildMouthSyncTimings(1);
    expect(timings.length).toBeGreaterThanOrEqual(5);
    expect(timings.at(-1)?.shape).toBe('X');
  });
});

describe('getVisemeAtTime / shapeToOpenness', () => {
  const timings = buildMouthSyncTimings(1, 4);

  it('returns X for empty timings', () => {
    expect(getVisemeAtTime([], 0.5)).toBe('X');
  });

  it('picks the latest timing at or before time', () => {
    expect(getVisemeAtTime(timings, 0)).toBe(timings[0]?.shape);
    expect(getVisemeAtTime(timings, 0.3)).toBe(timings[1]?.shape);
    expect(getVisemeAtTime(timings, 99)).toBe('X');
  });

  it('maps legacy mouth shapes to openness', () => {
    expect(shapeToOpenness('X')).toBe(0);
    expect(shapeToOpenness('closed')).toBe(0);
    expect(shapeToOpenness('A')).toBe(0.9);
    expect(shapeToOpenness('wide')).toBe(0.9);
  });
});

describe('amplitudeToViseme', () => {
  it('maps amplitude bands to visemes', () => {
    expect(amplitudeToViseme(0.05)).toBe('X');
    expect(amplitudeToViseme(0.2)).toBe('C');
    expect(amplitudeToViseme(0.4)).toBe('E');
    expect(amplitudeToViseme(0.6)).toBe('D');
    expect(amplitudeToViseme(0.9)).toBe('A');
  });
});

describe('estimateSyllableCount / nextTtsViseme', () => {
  it('estimates syllables from word lengths with a floor of 4', () => {
    expect(estimateSyllableCount('')).toBe(4);
    expect(estimateSyllableCount('hi')).toBe(4);
    expect(estimateSyllableCount('The brave girl walked home today')).toBeGreaterThan(4);
  });

  it('cycles TTS visemes', () => {
    expect(nextTtsViseme(0)).toBe('C');
    expect(nextTtsViseme(6)).toBe('C');
    expect(nextTtsViseme(1)).toBe('E');
  });
});
