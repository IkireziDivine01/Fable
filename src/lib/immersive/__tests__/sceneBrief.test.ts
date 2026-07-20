import { describe, expect, it } from 'vitest';
import { compileSceneBrief, normalizeSceneBrief } from '../sceneBrief';
import type { SceneBrief, StorySceneSpec } from '../types';

const HEX = /^#[0-9A-Fa-f]{6}$/;

function validBrief(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    mood: 'warm',
    density: 'balanced',
    keyProps: [
      { type: 'hut', role: 'landmark' },
      { type: 'drum', role: 'focus' },
      { type: 'goat', role: 'dressing' },
    ],
    ...overrides,
  };
}

describe('normalizeSceneBrief', () => {
  it('returns undefined for null / non-objects', () => {
    expect(normalizeSceneBrief(null)).toBeUndefined();
    expect(normalizeSceneBrief(undefined)).toBeUndefined();
    expect(normalizeSceneBrief('warm')).toBeUndefined();
  });

  it('returns undefined when mood is missing or invalid', () => {
    expect(normalizeSceneBrief({ keyProps: [{ type: 'hut' }] })).toBeUndefined();
    expect(
      normalizeSceneBrief({ mood: 'spooky', keyProps: [{ type: 'hut' }] })
    ).toBeUndefined();
  });

  it('returns undefined when no valid keyProps remain', () => {
    expect(normalizeSceneBrief({ mood: 'warm', keyProps: [] })).toBeUndefined();
    expect(
      normalizeSceneBrief({
        mood: 'warm',
        keyProps: [{ type: 'spaceship' }, { type: 'dragon' }],
      })
    ).toBeUndefined();
  });

  it('keeps valid mood, density, weatherBias, and timeOfDayArc', () => {
    const brief = normalizeSceneBrief({
      mood: 'hopeful',
      density: 'sparse',
      weatherBias: 'mist',
      timeOfDayArc: { '0': 'dawn', '3': 'dusk', '9': 'night' },
      keyProps: [{ type: 'tree', role: 'landmark', note: 'Grand tree' }],
    });

    expect(brief).toEqual({
      mood: 'hopeful',
      density: 'sparse',
      weatherBias: 'mist',
      timeOfDayArc: { '0': 'dawn', '3': 'dusk', '9': 'night' },
      paletteHint: { warmth: 0.5, saturation: 0.5, contrast: 0.5 },
      keyProps: [{ type: 'tree', role: 'landmark', note: 'Grand tree' }],
    });
  });

  it('filters invalid prop types, dedupes by type, and caps at 5', () => {
    const brief = normalizeSceneBrief({
      mood: 'playful',
      keyProps: [
        { type: 'hut', role: 'landmark' },
        { type: 'spaceship' },
        { type: 'hut', role: 'focus' },
        { type: 'drum' },
        { type: 'goat' },
        { type: 'bench' },
        { type: 'board' },
        { type: 'rock' },
      ],
    });

    expect(brief?.keyProps.map((p) => p.type)).toEqual([
      'hut',
      'drum',
      'goat',
      'bench',
      'board',
    ]);
    expect(brief?.keyProps[0]?.role).toBe('landmark');
  });

  it('defaults density to balanced and role to dressing', () => {
    const brief = normalizeSceneBrief({
      mood: 'cozy',
      keyProps: [{ type: 'fire', role: 'throne' }],
    });

    expect(brief?.density).toBe('balanced');
    expect(brief?.keyProps[0]).toEqual({ type: 'fire', role: 'dressing' });
  });

  it('defaults and clamps paletteHint fields', () => {
    const defaults = normalizeSceneBrief(validBrief());
    expect(defaults?.paletteHint).toEqual({
      warmth: 0.5,
      saturation: 0.5,
      contrast: 0.5,
    });

    const clamped = normalizeSceneBrief(
      validBrief({
        paletteHint: {
          warmth: -2,
          saturation: 9,
          contrast: 0.25,
          accentBias: 'not-a-color',
        },
      })
    );
    expect(clamped?.paletteHint).toEqual({
      warmth: 0,
      saturation: 1,
      contrast: 0.25,
    });

    const withBias = normalizeSceneBrief(
      validBrief({
        paletteHint: { warmth: 0.7, saturation: 0.4, contrast: 0.6, accentBias: '#FF7956' },
      })
    );
    expect(withBias?.paletteHint.accentBias).toBe('#FF7956');
  });

  it('drops invalid weatherBias and empty timeOfDayArc', () => {
    const brief = normalizeSceneBrief(
      validBrief({
        weatherBias: 'hurricane',
        timeOfDayArc: { '0': 'brunch', foo: 'dawn' },
      })
    );

    expect(brief?.weatherBias).toBeUndefined();
    expect(brief?.timeOfDayArc).toBeUndefined();
  });
});

describe('compileSceneBrief', () => {
  const baseBrief = (): SceneBrief =>
    normalizeSceneBrief(
      validBrief({
        mood: 'warm',
        density: 'balanced',
        keyProps: [
          { type: 'hut', role: 'landmark' },
          { type: 'drum', role: 'focus' },
          { type: 'goat', role: 'dressing' },
          { type: 'water_jug', role: 'dressing' },
        ],
      })
    )!;

  it('returns a full StorySceneSpec with hex colors, lighting, and objects', () => {
    const spec = compileSceneBrief('village', baseBrief());

    expect(spec.backgroundColor).toMatch(HEX);
    expect(spec.fogColor).toMatch(HEX);
    expect(spec.groundColor).toMatch(HEX);
    expect(spec.accentColor).toMatch(HEX);
    expect(spec.lighting.color).toMatch(HEX);
    expect(spec.lighting.intensity).toBeGreaterThanOrEqual(0.4);
    expect(spec.lighting.intensity).toBeLessThanOrEqual(1.2);
    expect(spec.objects.length).toBeGreaterThan(0);
  });

  it('caps object count by density max from keyProps only', () => {
    const manyProps = [
      { type: 'hut', role: 'landmark' },
      { type: 'drum', role: 'focus' },
      { type: 'goat', role: 'dressing' },
      { type: 'bench', role: 'dressing' },
      { type: 'rock', role: 'dressing' },
    ];

    const sparse = compileSceneBrief(
      'village',
      normalizeSceneBrief(validBrief({ density: 'sparse', keyProps: manyProps }))!
    );
    const balanced = compileSceneBrief(
      'village',
      normalizeSceneBrief(validBrief({ density: 'balanced', keyProps: manyProps }))!
    );
    const busy = compileSceneBrief(
      'village',
      normalizeSceneBrief(validBrief({ density: 'busy', keyProps: manyProps }))!
    );

    expect(sparse.objects.length).toBeLessThanOrEqual(3);
    expect(sparse.objects.length).toBe(3);
    expect(balanced.objects.length).toBeLessThanOrEqual(5);
    expect(balanced.objects.length).toBe(5);
    expect(busy.objects.length).toBeLessThanOrEqual(8);
    expect(busy.objects.length).toBe(5);
  });

  it('only places keyProp types — never unrelated preset filler', () => {
    const brief = normalizeSceneBrief({
      mood: 'warm',
      density: 'busy',
      keyProps: [
        { type: 'drum', role: 'landmark' },
        { type: 'goat', role: 'focus' },
      ],
    })!;

    const types = new Set(
      compileSceneBrief('village', brief).objects.map((o) => o.type)
    );
    expect([...types].sort()).toEqual(['drum', 'goat']);
    expect(types.has('hut')).toBe(false);
    expect(types.has('path')).toBe(false);
  });

  it('is deterministic for the same brief', () => {
    const brief = baseBrief();
    const a = compileSceneBrief('village', brief);
    const b = compileSceneBrief('village', brief);
    expect(a).toEqual(b);
  });

  it('uses existingSceneSpec palette/objects without mutating inputs', () => {
    const brief = baseBrief();
    const existing: StorySceneSpec = {
      backgroundColor: '#112233',
      fogColor: '#445566',
      groundColor: '#778899',
      accentColor: '#AABBCC',
      lighting: { color: '#DDEEFF', intensity: 0.7 },
      objects: [{ type: 'drum', x: 1.5, z: -1, scale: 1.1 }],
    };
    const snapshot = structuredClone(existing);

    const spec = compileSceneBrief('village', brief, existing);

    expect(existing).toEqual(snapshot);
    // Existing palette is the tint base — output should differ from preset-only compile
    const fromPreset = compileSceneBrief('village', brief);
    expect(spec.backgroundColor).not.toBe(fromPreset.backgroundColor);

    const drum = spec.objects.find((o) => o.type === 'drum');
    expect(drum?.z).toBe(-1);
    expect(drum?.scale).toBe(1.1);
  });
});
