import {
  normalizeCharacterAppearance as normalizeCharacterAppearanceFromConfig,
  resolveCharacterConfig,
} from './character/config';
import { getEnvironmentPreset } from './presets';
import type {
  EnvironmentObject,
  EnvironmentPreset,
  EnvironmentType,
  StoryCharacterSlot,
  StorySceneSpec,
} from './types';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
export const VALID_PROP_TYPES = new Set([
  'tree',
  'hut',
  'fire',
  'stall',
  'board',
  'rock',
  'flower',
  'bench',
  // Rwanda-specific cultural props
  'banana_tree',
  'path',
  'water_jug',
  'drum',
  'goat',
  'millet_field',
]);

export function sanitizeHex(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  return HEX_COLOR.test(s) ? s : fallback;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse prop list without enforcing a minimum count (for scene-event addObjects). */
export function parseEnvironmentObjects(
  raw: unknown,
  options?: { fallback?: EnvironmentObject[]; minCount?: number; maxCount?: number }
): EnvironmentObject[] {
  const fallback = options?.fallback ?? [];
  const minCount = options?.minCount ?? 0;
  const maxCount = options?.maxCount ?? 8;
  if (!Array.isArray(raw)) return fallback;

  const objects: EnvironmentObject[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? '').trim();
    if (!VALID_PROP_TYPES.has(type)) continue;
    const parsed: EnvironmentObject = {
      type,
      x: clampNumber(Number(row.x ?? 0), -4.5, 4.5),
    };
    if (row.z !== undefined) parsed.z = clampNumber(Number(row.z), -3.5, 1.5);
    if (row.scale !== undefined) parsed.scale = clampNumber(Number(row.scale), 0.65, 1.5);
    objects.push(parsed);
  }

  return objects.length >= minCount ? objects.slice(0, maxCount) : fallback;
}

function parseObjects(raw: unknown, fallback: EnvironmentObject[]): EnvironmentObject[] {
  return parseEnvironmentObjects(raw, { fallback, minCount: 2, maxCount: 8 });
}

export function normalizeSceneSpec(
  raw: unknown,
  environment: EnvironmentType
): StorySceneSpec | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const base = getEnvironmentPreset(environment);
  const obj = raw as Record<string, unknown>;
  const lightingRaw =
    obj.lighting && typeof obj.lighting === 'object'
      ? (obj.lighting as Record<string, unknown>)
      : {};

  return {
    backgroundColor: sanitizeHex(obj.backgroundColor, base.backgroundColor),
    fogColor: sanitizeHex(obj.fogColor, base.fogColor ?? base.backgroundColor),
    groundColor: sanitizeHex(obj.groundColor, base.groundColor ?? '#C4A574'),
    accentColor: sanitizeHex(obj.accentColor, base.accentColor ?? '#520e33'),
    lighting: {
      color: sanitizeHex(
        lightingRaw.color ?? obj.lightingColor,
        base.lighting.color
      ),
      intensity: clampNumber(
        Number(lightingRaw.intensity ?? obj.lightingIntensity ?? base.lighting.intensity),
        0.4,
        1.2
      ),
    },
    objects: parseObjects(obj.objects, base.objects),
  };
}

export { normalizeCharacterAppearanceFromConfig as normalizeCharacterAppearance };

export function resolveEnvironmentPreset(
  environment: EnvironmentType,
  sceneSpec?: StorySceneSpec | null
): EnvironmentPreset {
  const base = getEnvironmentPreset(environment);
  if (!sceneSpec) return base;

  return {
    environmentType: environment,
    backgroundColor: sceneSpec.backgroundColor,
    fogColor: sceneSpec.fogColor,
    groundColor: sceneSpec.groundColor,
    accentColor: sceneSpec.accentColor,
    objects: sceneSpec.objects.length > 0 ? sceneSpec.objects : base.objects,
    lighting: sceneSpec.lighting,
  };
}

export function resolveCharacterAppearance(slot: StoryCharacterSlot) {
  const config = resolveCharacterConfig(slot);
  return {
    skinColor: config.skinColor,
    garmentColor: config.garmentColors[0],
    accentColor: config.accentColor,
    height: config.height,
    heightScale: slot.appearance?.heightScale,
    eyeColor: config.eyeColor,
    hasBlush: config.hasBlush,
    blushColor: config.blushColor,
    bodyPattern:
      slot.appearance?.bodyPattern ??
      (config.garmentColors.length > 1 ? config.garmentColors : undefined),
    accessories: config.accessories,
    hairStyle: config.hairStyle,
    hairColor: config.hairColor,
    faceShape: config.faceShape,
    garmentStyle: config.garmentStyle,
    personalityPose: config.personalityPose,
  };
}
