import type { StorySceneSpec, TimeOfDay } from './types';

export const VALID_TIME_OF_DAY = new Set<TimeOfDay>([
  'dawn',
  'midday',
  'dusk',
  'night',
]);

/** Palette shifts blended onto the resolved scene when timeOfDay is set */
export const TIME_OF_DAY_PALETTE: Record<
  TimeOfDay,
  {
    backgroundColor: string;
    fogColor: string;
    lighting: { color: string; intensity: number };
    accentColor?: string;
    ambientBoost: number;
    starDensity: number;
  }
> = {
  dawn: {
    backgroundColor: '#E8A090',
    fogColor: '#F5C4B8',
    lighting: { color: '#FFD4C8', intensity: 0.88 },
    accentColor: '#FF9A7A',
    ambientBoost: 0.08,
    starDensity: 0,
  },
  midday: {
    backgroundColor: '#87B8D4',
    fogColor: '#C8DCE8',
    lighting: { color: '#FFF5E0', intensity: 1.08 },
    ambientBoost: 0.12,
    starDensity: 0,
  },
  dusk: {
    backgroundColor: '#3d1a0f',
    fogColor: '#C05621',
    lighting: { color: '#FF9A6B', intensity: 0.72 },
    accentColor: '#DD6B20',
    ambientBoost: -0.05,
    starDensity: 400,
  },
  night: {
    backgroundColor: '#0d1520',
    fogColor: '#1a2433',
    lighting: { color: '#B8A0D0', intensity: 0.48 },
    accentColor: '#7B68A6',
    ambientBoost: -0.12,
    starDensity: 900,
  },
};

/** Apply time-of-day palette onto a scene spec (mutates a copy’s fields). */
export function applyTimeOfDayPalette(
  sceneSpec: StorySceneSpec,
  timeOfDay: TimeOfDay
): void {
  const palette = TIME_OF_DAY_PALETTE[timeOfDay];
  sceneSpec.backgroundColor = palette.backgroundColor;
  sceneSpec.fogColor = palette.fogColor;
  sceneSpec.lighting = { ...palette.lighting };
  if (palette.accentColor) sceneSpec.accentColor = palette.accentColor;
}

export function parseTimeOfDay(raw: unknown): TimeOfDay | undefined {
  const value = String(raw ?? '').trim() as TimeOfDay;
  return VALID_TIME_OF_DAY.has(value) ? value : undefined;
}
