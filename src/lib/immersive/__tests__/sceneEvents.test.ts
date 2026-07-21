import { describe, expect, it } from 'vitest';
import { getEnvironmentPreset } from '../presets';
import {
  buildDefaultHotspots,
  deriveSceneEventsFromSentences,
  mergeHotspots,
  normalizeHotspots,
  normalizeSceneEvent,
  normalizeSceneEvents,
  resolveSceneAtSentence,
} from '../sceneEvents';
import type { StorySceneSpec } from '../types';

describe('normalizeSceneEvent', () => {
  it('returns undefined for non-objects and empty payloads', () => {
    expect(normalizeSceneEvent(null, 'village')).toBeUndefined();
    expect(normalizeSceneEvent({}, 'village')).toBeUndefined();
  });

  it('keeps valid weather, timeOfDay, gesture, and filters unknown prop types', () => {
    const event = normalizeSceneEvent(
      {
        weather: 'rain',
        timeOfDay: 'dusk',
        gesture: 'wave',
        addObjects: [
          { type: 'hut', x: 1 },
          { type: 'spaceship', x: 0 },
        ],
        removeTypes: ['drum', 'dragon'],
        lightingShift: { color: '#AABBCC', intensity: 0.9 },
        backgroundColor: '#112233',
      },
      'village'
    );

    expect(event?.weather).toBe('rain');
    expect(event?.timeOfDay).toBe('dusk');
    expect(event?.gesture).toBe('wave');
    expect(event?.addObjects?.map((o) => o.type)).toEqual(['hut']);
    expect(event?.removeTypes).toEqual(['drum']);
    expect(event?.lightingShift?.color).toBe('#AABBCC');
    expect(event?.backgroundColor).toBe('#112233');
  });

  it('accepts flat lightingColor / lightingIntensity aliases', () => {
    const event = normalizeSceneEvent(
      { lightingColor: '#FFE8C8', lightingIntensity: 1.1 },
      'village'
    );
    expect(event?.lightingShift?.color).toBe('#FFE8C8');
    expect(event?.lightingShift?.intensity).toBe(1.1);
  });
});

describe('normalizeSceneEvents', () => {
  it('returns undefined for non-objects and keeps only integer sentence keys', () => {
    expect(normalizeSceneEvents(null, 'village')).toBeUndefined();
    expect(
      normalizeSceneEvents(
        {
          '0': { weather: 'mist' },
          foo: { weather: 'rain' },
          '-1': { weather: 'rain' },
        },
        'village'
      )
    ).toEqual({ '0': { weather: 'mist' } });
  });
});

describe('normalizeHotspots / mergeHotspots', () => {
  it('filters invalid props, requires title+body, and caps at 6', () => {
    const hotspots = normalizeHotspots([
      { propType: 'hut', title: 'Home', body: 'A cozy place.' },
      { propType: 'spaceship', title: 'Ship', body: 'Nope.' },
      { type: 'drum', title: '  ', body: 'Missing title' },
      { propType: 'goat', title: 'Goat', body: 'Friendly.' },
      { propType: 'fire', title: 'Fire', body: 'Warm.' },
      { propType: 'tree', title: 'Tree', body: 'Tall.' },
      { propType: 'rock', title: 'Rock', body: 'Solid.' },
      { propType: 'bench', title: 'Bench', body: 'Sit.' },
      { propType: 'path', title: 'Path', body: 'Walk.' },
    ]);

    expect(hotspots).toHaveLength(6);
    expect(hotspots?.every((h) => h.title && h.body)).toBe(true);
    expect(hotspots?.some((h) => h.propType === 'spaceship')).toBe(false);
  });

  it('mergeHotspots prefers custom hotspots over defaults', () => {
    const custom = normalizeHotspots([
      { propType: 'hut', title: 'Custom hut', body: 'AI copy' },
    ])!;
    const objects = [{ type: 'hut' as const, x: 0 }, { type: 'drum' as const, x: 1 }];

    expect(mergeHotspots(custom, objects)).toEqual(custom);
    expect(mergeHotspots(undefined, objects).length).toBeGreaterThan(0);
  });

  it('buildDefaultHotspots is one per prop type and capped at 4', () => {
    const hotspots = buildDefaultHotspots([
      { type: 'hut', x: 0 },
      { type: 'hut', x: 1 },
      { type: 'drum', x: 2 },
      { type: 'goat', x: 3 },
      { type: 'fire', x: 4 },
      { type: 'tree', x: 5 },
    ]);
    expect(hotspots).toHaveLength(4);
    expect(hotspots.map((h) => h.propType)).toEqual(['hut', 'drum', 'goat', 'fire']);
  });
});

describe('resolveSceneAtSentence', () => {
  const baseSpec: StorySceneSpec = {
    backgroundColor: '#111111',
    fogColor: '#222222',
    groundColor: '#333333',
    accentColor: '#444444',
    lighting: { color: '#555555', intensity: 0.8 },
    objects: [
      { type: 'hut', x: 0 },
      { type: 'drum', x: 1 },
      { type: 'goat', x: 2 },
    ],
  };

  it('returns base scene with clear midday when no events', () => {
    const resolved = resolveSceneAtSentence('village', baseSpec, null, 0);
    expect(resolved.weather).toBe('clear');
    expect(resolved.timeOfDay).toBe('midday');
    expect(resolved.gesture).toBeNull();
    expect(resolved.sceneSpec.objects.map((o) => o.type)).toEqual([
      'hut',
      'drum',
      'goat',
    ]);
  });

  it('applies sticky events up to sentence index and keeps gesture non-sticky', () => {
    const events = {
      '0': {
        weather: 'mist' as const,
        removeTypes: ['goat'],
        gesture: 'nod' as const,
      },
      '1': {
        timeOfDay: 'night' as const,
        addObjects: [{ type: 'fire' as const, x: 0.5 }],
        gesture: 'wave' as const,
      },
      '2': {
        weather: 'rain' as const,
      },
    };

    const at0 = resolveSceneAtSentence('village', baseSpec, events, 0);
    expect(at0.weather).toBe('mist');
    expect(at0.gesture).toBe('nod');
    expect(at0.sceneSpec.objects.map((o) => o.type)).toEqual(['hut', 'drum']);

    const at1 = resolveSceneAtSentence('village', baseSpec, events, 1);
    expect(at1.weather).toBe('mist');
    expect(at1.timeOfDay).toBe('night');
    expect(at1.gesture).toBe('wave');
    expect(at1.sceneSpec.objects.map((o) => o.type).sort()).toEqual([
      'drum',
      'fire',
      'hut',
    ]);
    expect(at1.sceneSpec.backgroundColor).toBe('#0d1520');

    const at2 = resolveSceneAtSentence('village', baseSpec, events, 2);
    expect(at2.weather).toBe('rain');
    expect(at2.timeOfDay).toBe('night');
    expect(at2.gesture).toBeNull();
  });

  it('falls back to environment preset when baseSceneSpec is missing', () => {
    const preset = getEnvironmentPreset('forest');
    const resolved = resolveSceneAtSentence('forest', null, undefined, 0);
    expect(resolved.sceneSpec.backgroundColor).toBe(preset.backgroundColor);
    expect(resolved.sceneSpec.objects.length).toBe(preset.objects.length);
  });
});

describe('deriveSceneEventsFromSentences', () => {
  it('derives weather/time beats from keywords and caps at 3', () => {
    const events = deriveSceneEventsFromSentences(
      [
        'A soft rain began to fall.',
        'By night the stars came out.',
        'Morning dawn greeted them.',
        'Another rain would not add a fourth beat.',
      ],
      'village'
    );

    expect(Object.keys(events).sort()).toEqual(['0', '1', '2']);
    expect(events['0']?.weather).toBe('rain');
    expect(events['1']?.timeOfDay).toBe('night');
    expect(events['2']?.timeOfDay).toBe('dawn');
  });

  it('adds home fire lighting and gesture-only beats', () => {
    const withFire = deriveSceneEventsFromSentences(
      ['They sat by the warm fire hearth.'],
      'home'
    );
    expect(withFire['0']?.lightingShift?.color).toBe('#FF9A6B');

    const withGesture = deriveSceneEventsFromSentences(
      ['Hello and muraho, friends!'],
      'village'
    );
    expect(withGesture['0']).toEqual({ gesture: 'wave' });
  });
});
