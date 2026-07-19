/**
 * Throwaway preview — not wired into the app.
 *
 *   npx tsx scripts/preview-scene-brief.ts
 */
import { compileSceneBrief } from '../src/lib/immersive/sceneBrief';
import { ENVIRONMENT_PRESETS, getEnvironmentPreset } from '../src/lib/immersive/presets';
import type {
  EnvironmentType,
  SceneBrief,
  SceneMood,
} from '../src/lib/immersive/types';

const NEUTRAL_HINT = { warmth: 0.5, saturation: 0.5, contrast: 0.5 };

const ALL_MOODS: SceneMood[] = [
  'warm',
  'solemn',
  'playful',
  'tense',
  'nostalgic',
  'hopeful',
  'cozy',
];

const VILLAGE_KEY_PROPS: SceneBrief['keyProps'] = [
  { type: 'hut', role: 'landmark' },
  { type: 'drum', role: 'focus' },
  { type: 'banana_tree', role: 'dressing' },
  { type: 'path', role: 'dressing' },
];

/** Story-grounded keyProps per biome (compile places only these — no preset fill) */
const BIOME_KEY_PROPS: Record<EnvironmentType, SceneBrief['keyProps']> = {
  village: VILLAGE_KEY_PROPS,
  forest: [
    { type: 'tree', role: 'landmark' },
    { type: 'banana_tree', role: 'focus' },
    { type: 'path', role: 'dressing' },
    { type: 'rock', role: 'dressing' },
    { type: 'flower', role: 'dressing' },
  ],
  home: [
    { type: 'fire', role: 'landmark' },
    { type: 'drum', role: 'focus' },
    { type: 'water_jug', role: 'dressing' },
    { type: 'hut', role: 'dressing' },
    { type: 'path', role: 'dressing' },
  ],
  school: [
    { type: 'board', role: 'landmark' },
    { type: 'bench', role: 'focus' },
    { type: 'path', role: 'dressing' },
    { type: 'tree', role: 'dressing' },
    { type: 'flower', role: 'dressing' },
  ],
  market: [
    { type: 'stall', role: 'landmark' },
    { type: 'goat', role: 'focus' },
    { type: 'water_jug', role: 'dressing' },
    { type: 'path', role: 'dressing' },
    { type: 'banana_tree', role: 'dressing' },
  ],
};

function uniqueTypes(environment: EnvironmentType): string[] {
  const seen = new Set<string>();
  for (const obj of ENVIRONMENT_PRESETS[environment].objects) {
    seen.add(obj.type);
  }
  return [...seen];
}

function printSpec(environment: EnvironmentType, label: string, brief: SceneBrief) {
  const spec = compileSceneBrief(environment, brief);
  console.log(`\n══ ${label} ══`);
  console.log(`mood=${brief.mood}  density=${brief.density}`);
  console.log('palette:');
  console.log(`  background  ${spec.backgroundColor}`);
  console.log(`  fog         ${spec.fogColor}`);
  console.log(`  ground      ${spec.groundColor}`);
  console.log(`  accent      ${spec.accentColor}`);
  console.log(
    `  light       ${spec.lighting.color}  intensity=${spec.lighting.intensity.toFixed(3)}`
  );
  console.log(
    `objects (${spec.objects.length}): ${spec.objects.map((o) => o.type).join(', ')}`
  );
}

console.log('── Preset prop pools (layout hints only; compile does not fill from these) ──');
for (const env of Object.keys(ENVIRONMENT_PRESETS) as EnvironmentType[]) {
  const types = uniqueTypes(env);
  console.log(`  ${env}: ${types.length} unique [${types.join(', ')}]`);
}

console.log('\n── Village · all 7 moods · neutral hint · balanced (4 keyProps → 4 objects) ──');
const villagePreset = getEnvironmentPreset('village');
console.log(
  `base bg=${villagePreset.backgroundColor} fog=${villagePreset.fogColor} ground=${villagePreset.groundColor} accent=${villagePreset.accentColor}`
);

for (const mood of ALL_MOODS) {
  printSpec('village', `village · ${mood}`, {
    mood,
    paletteHint: NEUTRAL_HINT,
    keyProps: VILLAGE_KEY_PROPS,
    density: 'balanced',
  });
}

console.log('\n── Sparse vs keyProps-only (no biome padding) ──');
printSpec('village', 'village · sparse · 2 keyProps', {
  mood: 'hopeful',
  paletteHint: NEUTRAL_HINT,
  keyProps: [
    { type: 'drum', role: 'landmark' },
    { type: 'path', role: 'focus' },
  ],
  density: 'sparse',
});

console.log('\n── Busy density smoke tests (objects === keyProps length, capped by density max) ──');
const busyBiomes: EnvironmentType[] = ['village', 'forest', 'home', 'school', 'market'];
for (const env of busyBiomes) {
  printSpec(env, `${env} · warm · busy`, {
    mood: 'warm',
    paletteHint: NEUTRAL_HINT,
    keyProps: BIOME_KEY_PROPS[env],
    density: 'busy',
  });
}
