import { CHARACTER_META } from '../presets';
import type {
  CharacterAccessory,
  CharacterAppearance,
  CharacterType,
  StoryCharacterSlot,
} from '../types';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const VALID_ACCESSORIES = new Set<CharacterAccessory>(['headwrap', 'necklace']);

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

export interface ResolvedCharacterConfig {
  skinColor: string;
  garmentColors: string[];
  accentColor: string;
  height: number;
  eyeColor: string;
  hasBlush: boolean;
  blushColor: string;
  accessories: CharacterAccessory[];
}

export function normalizeCharacterAppearance(
  raw: unknown,
  type: CharacterType
): CharacterAppearance | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const base = CHARACTER_META[type];
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
    hasBlush: obj.hasBlush === true,
    blushColor:
      obj.blushColor !== undefined ? sanitizeHex(obj.blushColor, '#e8a0a0') : undefined,
    bodyPattern,
    accessories: parseAccessories(obj.accessories),
  };
}

export function resolveCharacterConfig(slot: StoryCharacterSlot): ResolvedCharacterConfig {
  const meta = CHARACTER_META[slot.type];
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
    hasBlush: appearance?.hasBlush ?? false,
    blushColor: appearance?.blushColor ?? '#e8a0a0',
    accessories: appearance?.accessories ?? [],
  };
}
