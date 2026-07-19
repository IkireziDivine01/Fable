import type { CharacterType, EnvironmentPreset, EnvironmentType } from './types';

/** Earth-tone palettes inspired by Rwandan landscapes — not generic AI gradients */
export const ENVIRONMENT_PRESETS: Record<EnvironmentType, EnvironmentPreset> = {
  village: {
    environmentType: 'village',
    backgroundColor: '#3d2914',
    fogColor: '#8B6914',
    groundColor: '#C4A574',
    accentColor: '#520e33',
    // Unique types ≥6 so busy density can fill from the pool alone
    objects: [
      { type: 'hut', x: -2.5 },
      { type: 'hut', x: 2.8 },
      { type: 'banana_tree', x: 0.5 },
      { type: 'path', x: 0, z: 0.4, scale: 1.1 },
      { type: 'drum', x: -1.2, z: -0.6, scale: 0.85 },
      { type: 'goat', x: 3.2, z: -1.4, scale: 0.9 },
      { type: 'water_jug', x: -3.2, z: -0.5, scale: 0.85 },
      { type: 'fire', x: 1.1, z: -0.8, scale: 0.9 },
      { type: 'flower', x: -0.8, z: 0.2, scale: 0.8 },
    ],
    lighting: { color: '#FFE4B5', intensity: 0.95 },
  },
  forest: {
    environmentType: 'forest',
    backgroundColor: '#0d2818',
    fogColor: '#1B4332',
    groundColor: '#2D5016',
    accentColor: '#40916C',
    objects: [
      { type: 'banana_tree', x: -2 },
      { type: 'tree', x: 1.5 },
      { type: 'millet_field', x: 3.2, z: -1.8 },
      { type: 'path', x: 0.2, z: 0.2 },
      { type: 'rock', x: -3.2, z: -1.0, scale: 0.95 },
      { type: 'flower', x: 2.4, z: -0.4, scale: 0.85 },
      { type: 'bench', x: -0.8, z: -0.6, scale: 0.9 },
      { type: 'water_jug', x: 0.9, z: -1.2, scale: 0.8 },
    ],
    lighting: { color: '#98D8AA', intensity: 0.75 },
  },
  home: {
    environmentType: 'home',
    backgroundColor: '#2a0a18',
    fogColor: '#520e33',
    groundColor: '#6b3a2a',
    accentColor: '#FF7956',
    objects: [
      { type: 'fire', x: 0 },
      { type: 'water_jug', x: -1.4, z: -0.4, scale: 0.9 },
      { type: 'drum', x: 1.3, z: -0.5, scale: 0.85 },
      { type: 'bench', x: -2.4, z: -0.8, scale: 0.95 },
      { type: 'path', x: 0.1, z: 0.35, scale: 1.0 },
      { type: 'flower', x: 2.2, z: -0.3, scale: 0.8 },
      { type: 'hut', x: 3.0, z: -1.6, scale: 0.9 },
    ],
    lighting: { color: '#FF7956', intensity: 0.85 },
  },
  school: {
    environmentType: 'school',
    backgroundColor: '#1a365d',
    fogColor: '#2C5282',
    groundColor: '#E2E8F0',
    accentColor: '#3182CE',
    objects: [
      { type: 'board', x: 0 },
      { type: 'bench', x: -1.8, z: -0.5, scale: 0.95 },
      { type: 'bench', x: 1.8, z: -0.5, scale: 0.95 },
      { type: 'path', x: 0.1, z: 0.35, scale: 1.05 },
      { type: 'tree', x: -3.2, z: -1.4, scale: 1.0 },
      { type: 'flower', x: 2.6, z: -0.3, scale: 0.8 },
      { type: 'water_jug', x: -0.7, z: -0.9, scale: 0.8 },
      { type: 'rock', x: 3.1, z: -1.2, scale: 0.85 },
    ],
    lighting: { color: '#F7FAFC', intensity: 1 },
  },
  market: {
    environmentType: 'market',
    backgroundColor: '#4a2511',
    fogColor: '#C05621',
    groundColor: '#D69E2E',
    accentColor: '#DD6B20',
    objects: [
      { type: 'stall', x: -1.5 },
      { type: 'stall', x: 2 },
      { type: 'water_jug', x: 0.2, z: -0.3, scale: 0.8 },
      { type: 'goat', x: -3, z: -1.2, scale: 0.9 },
      { type: 'path', x: 0.15, z: 0.35, scale: 1.05 },
      { type: 'banana_tree', x: 3.3, z: -1.5, scale: 0.95 },
      { type: 'drum', x: -2.2, z: -0.5, scale: 0.85 },
      { type: 'flower', x: 1.1, z: 0.15, scale: 0.8 },
      { type: 'bench', x: -0.6, z: -1.0, scale: 0.9 },
    ],
    lighting: { color: '#FBD38D', intensity: 0.9 },
  },
};

export const ENVIRONMENT_LABELS: Record<EnvironmentType, string> = {
  village: 'Umudugudu · Village',
  forest: 'Ishyamba · Forest',
  home: 'Murugo · Home',
  school: 'Ishuri · School',
  market: 'Isoko · Market',
};

export const CHARACTER_META: Record<
  CharacterType,
  {
    label: string;
    height: number;
    skinColor: string;
    garmentColor: string;
    accentColor: string;
  }
> = {
  boy: {
    label: 'Umuhungu',
    height: 1.15,
    skinColor: '#8D5524',
    garmentColor: '#2C5282',
    accentColor: '#FF7956',
  },
  girl: {
    label: 'Umukobwa',
    height: 1.1,
    skinColor: '#A67C52',
    garmentColor: '#520e33',
    accentColor: '#ffdbd2',
  },
  grandma: {
    label: 'Mama wacu',
    height: 1.05,
    skinColor: '#7D5A44',
    garmentColor: '#857278',
    accentColor: '#C4A574',
  },
  grandpa: {
    label: 'Dad',
    height: 1.2,
    skinColor: '#6B4423',
    garmentColor: '#3d2914',
    accentColor: '#33001d',
  },
  dog: {
    label: 'Imbwa',
    height: 0.6,
    skinColor: '#8B6914',
    garmentColor: '#8B6914',
    accentColor: '#3d2914',
  },
  teacher: {
    label: 'Mwarimu',
    height: 1.22,
    skinColor: '#5C4033',
    garmentColor: '#2C5282',
    accentColor: '#E2E8F0',
  },
};

export const CHARACTER_TYPES = Object.keys(CHARACTER_META) as CharacterType[];

export function getEnvironmentPreset(type: EnvironmentType): EnvironmentPreset {
  return ENVIRONMENT_PRESETS[type] ?? ENVIRONMENT_PRESETS.village;
}
