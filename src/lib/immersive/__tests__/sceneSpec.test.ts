import { describe, expect, it } from 'vitest';
import { getEnvironmentPreset } from '../presets';
import {
  clampNumber,
  normalizeSceneSpec,
  parseEnvironmentObjects,
  sanitizeHex,
} from '../sceneSpec';

describe('sanitizeHex', () => {
  it('accepts valid 6-digit hex and falls back otherwise', () => {
    expect(sanitizeHex('#AbCdEf', '#000000')).toBe('#AbCdEf');
    expect(sanitizeHex('  #112233  ', '#000000')).toBe('#112233');
    expect(sanitizeHex('#fff', '#000000')).toBe('#000000');
    expect(sanitizeHex('red', '#112233')).toBe('#112233');
    expect(sanitizeHex(null, '#AABBCC')).toBe('#AABBCC');
  });
});

describe('clampNumber', () => {
  it('clamps to the inclusive range', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-3, 0, 10)).toBe(0);
    expect(clampNumber(99, 0, 10)).toBe(10);
  });
});

describe('parseEnvironmentObjects', () => {
  it('filters unknown types and clamps coords/scale', () => {
    const objects = parseEnvironmentObjects([
      { type: 'hut', x: -99, z: 50, scale: 9 },
      { type: 'spaceship', x: 0 },
      { type: 'drum', x: 1 },
    ]);

    expect(objects).toEqual([
      { type: 'hut', x: -4.5, z: 1.5, scale: 1.5 },
      { type: 'drum', x: 1 },
    ]);
  });

  it('returns fallback when below minCount', () => {
    const fallback = [{ type: 'tree' as const, x: 0 }];
    expect(
      parseEnvironmentObjects([{ type: 'hut', x: 1 }], {
        fallback,
        minCount: 2,
      })
    ).toEqual(fallback);
  });

  it('returns fallback for non-arrays', () => {
    const fallback = [{ type: 'rock' as const, x: 2 }];
    expect(parseEnvironmentObjects(null, { fallback })).toEqual(fallback);
  });
});

describe('normalizeSceneSpec', () => {
  it('returns undefined for non-objects', () => {
    expect(normalizeSceneSpec(null, 'village')).toBeUndefined();
    expect(normalizeSceneSpec('village', 'village')).toBeUndefined();
  });

  it('falls back to environment preset colors when raw values are invalid', () => {
    const preset = getEnvironmentPreset('village');
    const spec = normalizeSceneSpec(
      {
        backgroundColor: 'blue',
        fogColor: '#zz0000',
        lighting: { color: 'warm', intensity: 99 },
        objects: [{ type: 'hut', x: 0 }, { type: 'drum', x: 1 }],
      },
      'village'
    );

    expect(spec?.backgroundColor).toBe(preset.backgroundColor);
    expect(spec?.fogColor).toBe(preset.fogColor);
    expect(spec?.lighting.color).toBe(preset.lighting.color);
    expect(spec?.lighting.intensity).toBe(1.2);
    expect(spec?.objects.map((o) => o.type)).toEqual(['hut', 'drum']);
  });

  it('keeps valid colors and uses preset objects when too few are provided', () => {
    const preset = getEnvironmentPreset('forest');
    const spec = normalizeSceneSpec(
      {
        backgroundColor: '#010203',
        objects: [{ type: 'tree', x: 0 }],
      },
      'forest'
    );

    expect(spec?.backgroundColor).toBe('#010203');
    expect(spec?.objects).toEqual(preset.objects);
  });
});
