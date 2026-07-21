import { describe, expect, it } from 'vitest';
import {
  TIME_OF_DAY_PALETTE,
  applyTimeOfDayPalette,
  parseTimeOfDay,
} from '../timeOfDay';
import type { StorySceneSpec } from '../types';

function baseSpec(): StorySceneSpec {
  return {
    backgroundColor: '#111111',
    fogColor: '#222222',
    groundColor: '#333333',
    accentColor: '#444444',
    lighting: { color: '#555555', intensity: 0.5 },
    objects: [],
  };
}

describe('parseTimeOfDay', () => {
  it('accepts valid values and rejects others', () => {
    expect(parseTimeOfDay('dawn')).toBe('dawn');
    expect(parseTimeOfDay('  night ')).toBe('night');
    expect(parseTimeOfDay('brunch')).toBeUndefined();
    expect(parseTimeOfDay(null)).toBeUndefined();
  });
});

describe('applyTimeOfDayPalette', () => {
  it('overwrites sky/lighting from the palette without touching objects', () => {
    const spec = baseSpec();
    const objects = [{ type: 'hut' as const, x: 0 }];
    spec.objects = objects;

    applyTimeOfDayPalette(spec, 'dusk');

    expect(spec.backgroundColor).toBe(TIME_OF_DAY_PALETTE.dusk.backgroundColor);
    expect(spec.fogColor).toBe(TIME_OF_DAY_PALETTE.dusk.fogColor);
    expect(spec.lighting).toEqual(TIME_OF_DAY_PALETTE.dusk.lighting);
    expect(spec.accentColor).toBe(TIME_OF_DAY_PALETTE.dusk.accentColor);
    expect(spec.objects).toBe(objects);
  });

  it('leaves accent unchanged when palette has no accentColor', () => {
    const spec = baseSpec();
    applyTimeOfDayPalette(spec, 'midday');
    expect(spec.accentColor).toBe('#444444');
    expect(spec.backgroundColor).toBe(TIME_OF_DAY_PALETTE.midday.backgroundColor);
  });
});
