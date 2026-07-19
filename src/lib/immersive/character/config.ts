import { CHARACTER_META } from '../presets';
import type {
  CharacterAccessory,
  CharacterAppearance,
  CharacterType,
  FaceShape,
  GarmentStyle,
  HairStyle,
  PersonalityPose,
  StoryCharacterSlot,
} from '../types';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const VALID_ACCESSORIES = new Set<CharacterAccessory>(['headwrap', 'necklace']);
const VALID_HAIR_STYLES = new Set<HairStyle>(['short', 'braids', 'bun', 'afro', 'wrap']);
const VALID_FACE_SHAPES = new Set<FaceShape>(['round', 'oval', 'elder']);
const VALID_GARMENT_STYLES = new Set<GarmentStyle>(['tunic', 'dress', 'sash', 'collar']);
const VALID_POSES = new Set<PersonalityPose>(['shy', 'confident', 'wise', 'playful']);

function sanitizeHex(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  return HEX_COLOR.test(s) ? s : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseBodyPattern(raw: unknown, fallback: string): string | string[] {
  if (Array.isArray(raw)) {
    const colors = raw
      .map((c) => String(c ?? '').trim())
      .filter((c) => HEX_COLOR.test(c));
    return colors.length >= 2 ? colors.slice(0, 6) : fallback;
  }
  const single = String(raw ?? '').trim();
  return HEX_COLOR.test(single) ? single : fallback;
}

function parseAccessories(raw: unknown): CharacterAccessory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? '').trim() as CharacterAccessory)
    .filter((item) => VALID_ACCESSORIES.has(item));
}

function parseEnum<T extends string>(raw: unknown, valid: Set<T>): T | undefined {
  const value = String(raw ?? '').trim() as T;
  return valid.has(value) ? value : undefined;
}

/** Sensible defaults per archetype when AI / editor omit a field */
export function defaultAppearanceTraits(type: CharacterType): {
  hairStyle: HairStyle;
  hairColor: string;
  faceShape: FaceShape;
  garmentStyle: GarmentStyle;
  personalityPose: PersonalityPose;
  hasBlush: boolean;
} {
  switch (type) {
    case 'girl':
      return {
        hairStyle: 'braids',
        hairColor: '#1e1b18',
        faceShape: 'round',
        garmentStyle: 'dress',
        personalityPose: 'playful',
        hasBlush: true,
      };
    case 'boy':
      return {
        hairStyle: 'short',
        hairColor: '#1e1b18',
        faceShape: 'round',
        garmentStyle: 'tunic',
        personalityPose: 'playful',
        hasBlush: true,
      };
    case 'grandma':
      return {
        hairStyle: 'wrap',
        hairColor: '#4a3728',
        faceShape: 'elder',
        garmentStyle: 'dress',
        personalityPose: 'wise',
        hasBlush: false,
      };
    case 'grandpa':
      return {
        hairStyle: 'short',
        hairColor: '#4a3728',
        faceShape: 'elder',
        garmentStyle: 'sash',
        personalityPose: 'wise',
        hasBlush: false,
      };
    case 'teacher':
      return {
        hairStyle: 'short',
        hairColor: '#1e1b18',
        faceShape: 'oval',
        garmentStyle: 'collar',
        personalityPose: 'confident',
        hasBlush: false,
      };
    case 'dog':
      return {
        hairStyle: 'short',
        hairColor: CHARACTER_META.dog.skinColor,
        faceShape: 'round',
        garmentStyle: 'tunic',
        personalityPose: 'playful',
        hasBlush: false,
      };
  }
}

export interface ResolvedCharacterConfig {
  skinColor: string;
  garmentColors: string[];
  accentColor: string;
  height: number;
  eyeColor: string;
  hasBlush: boolean;
  blushColor: string;
  accessories: CharacterAccessory[];
  hairStyle: HairStyle;
  hairColor: string;
  faceShape: FaceShape;
  garmentStyle: GarmentStyle;
  personalityPose: PersonalityPose;
}

export function normalizeCharacterAppearance(
  raw: unknown,
  type: CharacterType
): CharacterAppearance | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const base = CHARACTER_META[type];
  const defaults = defaultAppearanceTraits(type);
  const obj = raw as Record<string, unknown>;
  const heightScaleRaw = Number(obj.heightScale);
  const bodyPattern = parseBodyPattern(
    obj.bodyPattern ?? obj.garmentColor,
    base.garmentColor
  );

  return {
    skinColor: sanitizeHex(obj.skinColor, base.skinColor),
    garmentColor: Array.isArray(bodyPattern) ? bodyPattern[0] : bodyPattern,
    accentColor: sanitizeHex(obj.accentColor, base.accentColor),
    heightScale:
      Number.isFinite(heightScaleRaw) && heightScaleRaw > 0
        ? clamp(heightScaleRaw, 0.85, 1.3)
        : undefined,
    eyeColor: obj.eyeColor !== undefined ? sanitizeHex(obj.eyeColor, '#1e1b18') : undefined,
    hasBlush: obj.hasBlush === true ? true : obj.hasBlush === false ? false : undefined,
    blushColor:
      obj.blushColor !== undefined ? sanitizeHex(obj.blushColor, '#e8a0a0') : undefined,
    bodyPattern,
    accessories: parseAccessories(obj.accessories),
    hairStyle: parseEnum(obj.hairStyle, VALID_HAIR_STYLES),
    hairColor: obj.hairColor !== undefined ? sanitizeHex(obj.hairColor, defaults.hairColor) : undefined,
    faceShape: parseEnum(obj.faceShape, VALID_FACE_SHAPES),
    garmentStyle: parseEnum(obj.garmentStyle, VALID_GARMENT_STYLES),
    personalityPose: parseEnum(obj.personalityPose, VALID_POSES),
  };
}

export function resolveCharacterConfig(slot: StoryCharacterSlot): ResolvedCharacterConfig {
  const meta = CHARACTER_META[slot.type];
  const defaults = defaultAppearanceTraits(slot.type);
  const appearance = slot.appearance;
  const scale =
    appearance?.heightScale !== undefined
      ? clamp(appearance.heightScale, 0.85, 1.3)
      : 1;

  const bodyPattern = appearance?.bodyPattern ?? appearance?.garmentColor ?? meta.garmentColor;
  const garmentColors = Array.isArray(bodyPattern) ? bodyPattern : [bodyPattern];

  return {
    skinColor: appearance?.skinColor ?? meta.skinColor,
    garmentColors,
    accentColor: appearance?.accentColor ?? meta.accentColor,
    height: meta.height * scale,
    eyeColor: appearance?.eyeColor ?? '#1e1b18',
    hasBlush: appearance?.hasBlush ?? defaults.hasBlush,
    blushColor: appearance?.blushColor ?? '#e8a0a0',
    accessories: appearance?.accessories ?? [],
    hairStyle: appearance?.hairStyle ?? defaults.hairStyle,
    hairColor: appearance?.hairColor ?? defaults.hairColor,
    faceShape: appearance?.faceShape ?? defaults.faceShape,
    garmentStyle: appearance?.garmentStyle ?? defaults.garmentStyle,
    personalityPose: appearance?.personalityPose ?? defaults.personalityPose,
  };
}

/** Flat appearance object suitable for the setup editor (always fully filled). */
export function toEditableAppearance(slot: StoryCharacterSlot): CharacterAppearance {
  const config = resolveCharacterConfig(slot);
  const heightScale = slot.appearance?.heightScale ?? 1;
  return {
    skinColor: config.skinColor,
    garmentColor: config.garmentColors[0],
    accentColor: config.accentColor,
    heightScale,
    eyeColor: config.eyeColor,
    hasBlush: config.hasBlush,
    blushColor: config.blushColor,
    bodyPattern:
      config.garmentColors.length > 1 ? config.garmentColors : config.garmentColors[0],
    accessories: config.accessories,
    hairStyle: config.hairStyle,
    hairColor: config.hairColor,
    faceShape: config.faceShape,
    garmentStyle: config.garmentStyle,
    personalityPose: config.personalityPose,
  };
}
