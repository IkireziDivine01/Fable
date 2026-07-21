import type { PropType } from './types';

/** Small 2D tray icons — Glow Trail never relies on 3D shape ID alone. */
export const PROP_TRAY_ICONS: Partial<Record<PropType, string>> = {
  tree: '🌳',
  hut: '🏠',
  fire: '🔥',
  stall: '🧺',
  board: '📋',
  rock: '🪨',
  flower: '🌸',
  bench: '🪑',
  banana_tree: '🍌',
  path: '👣',
  water_jug: '🏺',
  drum: '🥁',
  goat: '🐐',
  millet_field: '🌾',
};

export function propTrayIcon(propType: string): string {
  return PROP_TRAY_ICONS[propType as PropType] ?? '✨';
}
