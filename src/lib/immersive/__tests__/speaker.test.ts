import { describe, expect, it } from 'vitest';
import {
  getCharacterSpread,
  getCharacterX,
  resolveActiveCharacterIndex,
} from '../speaker';
import type { StoryCharacterSlot } from '../types';

const cast: StoryCharacterSlot[] = [
  { name: 'Ama', type: 'girl', position: 0 },
  { name: 'Kofi', type: 'boy', position: 1 },
  { name: 'Mugabo', type: 'grandpa', position: 2 },
];

describe('getCharacterSpread / getCharacterX', () => {
  it('clamps spread between 1.4 and 2.4', () => {
    expect(getCharacterSpread(1)).toBe(1.4);
    expect(getCharacterSpread(2)).toBe(2);
    expect(getCharacterSpread(5)).toBe(2.4);
  });

  it('centers characters around x=0', () => {
    expect(getCharacterX(0, 1)).toBe(0);
    expect(getCharacterX(0, 2)).toBeCloseTo(-1);
    expect(getCharacterX(1, 2)).toBeCloseTo(1);
  });
});

describe('resolveActiveCharacterIndex', () => {
  it('returns 0 when cast is empty', () => {
    expect(resolveActiveCharacterIndex({ speaker: 'Ama' }, [], 2)).toBe(0);
  });

  it('matches by exact name (case-insensitive)', () => {
    expect(
      resolveActiveCharacterIndex({ speaker: '  kofi ' }, cast, 0)
    ).toBe(1);
  });

  it('matches by character type when name misses', () => {
    expect(
      resolveActiveCharacterIndex({ speaker: 'grandpa' }, cast, 0)
    ).toBe(2);
  });

  it('matches partial name containment', () => {
    expect(
      resolveActiveCharacterIndex({ speaker: 'Said Ama softly' }, cast, 0)
    ).toBe(0);
  });

  it('falls back to round-robin when speaker is missing or unknown', () => {
    expect(resolveActiveCharacterIndex(null, cast, 4)).toBe(1);
    expect(resolveActiveCharacterIndex({ speaker: 'Nobody' }, cast, 5)).toBe(2);
    expect(resolveActiveCharacterIndex({ speaker: '' }, cast, 3)).toBe(0);
  });
});
