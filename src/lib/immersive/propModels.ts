import type { PropType } from './types';

export interface PropModelConfig {
  url: string;
  /** Uniform scale applied after load */
  scale: number;
  /** Y offset so the model sits on the ground */
  offsetY: number;
  /** Optional Y rotation in radians */
  rotationY?: number;
  /** Tint meshes whose name/material suggests foliage/produce with accent */
  accentTint?: boolean;
}

/** High-impact props that ship as GLB models under /public/immersive/models */
export const PROP_MODEL_CONFIG: Partial<Record<PropType, PropModelConfig>> = {
  hut: {
    url: '/immersive/models/hut.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  tree: {
    url: '/immersive/models/tree.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  banana_tree: {
    url: '/immersive/models/banana_tree.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  stall: {
    url: '/immersive/models/stall.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  rock: {
    url: '/immersive/models/rock.glb',
    scale: 1,
    offsetY: 0,
  },
  drum: {
    url: '/immersive/models/drum.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  water_jug: {
    url: '/immersive/models/water_jug.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
  goat: {
    url: '/immersive/models/goat.glb',
    scale: 1,
    offsetY: 0,
  },
  bench: {
    url: '/immersive/models/bench.glb',
    scale: 1,
    offsetY: 0,
  },
  board: {
    url: '/immersive/models/board.glb',
    scale: 1,
    offsetY: 0,
    accentTint: true,
  },
};

export function getPropModelConfig(type: PropType): PropModelConfig | null {
  return PROP_MODEL_CONFIG[type] ?? null;
}

export function propModelUrlsForTypes(types: Iterable<string>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const type of types) {
    const config = PROP_MODEL_CONFIG[type as PropType];
    if (!config || seen.has(config.url)) continue;
    seen.add(config.url);
    urls.push(config.url);
  }
  return urls;
}
