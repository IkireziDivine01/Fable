/**
 * Stage 3 verification — legacy load + live round-trip.
 *
 *   npx tsx scripts/verify-scene-brief-stage3.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateStoryFromPrompt } from '../src/lib/claude';
import { validateGeneratedStory } from '../src/lib/storyHelpers';
import { normalizeSceneBrief } from '../src/lib/immersive/sceneBrief';
import { normalizeHotspots, normalizeSceneEvents } from '../src/lib/immersive/sceneEvents';
import { normalizeSceneSpec } from '../src/lib/immersive/sceneSpec';
import type {
  AnimationData,
  EnvironmentType,
  MouthSyncTiming,
} from '../src/lib/immersive/types';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Same logic as immersive-server.parseAnimationData (kept local so we can run without importing supabase-admin at module load from that file after env is set). */
function parseAnimationData(
  raw: unknown,
  environment: EnvironmentType = 'village'
): AnimationData {
  if (!raw || typeof raw !== 'object') return { version: 1 };
  const obj = raw as Record<string, unknown>;
  const sceneSpec = normalizeSceneSpec(obj.sceneSpec, environment);
  const sceneBrief = normalizeSceneBrief(obj.sceneBrief);
  return {
    version: Number(obj.version ?? 1),
    useAiVoice: obj.useAiVoice !== undefined ? Boolean(obj.useAiVoice) : undefined,
    environmentDescription:
      obj.environmentDescription !== undefined
        ? String(obj.environmentDescription)
        : undefined,
    ...(sceneBrief ? { sceneBrief } : {}),
    sceneSpec,
    sceneEvents: normalizeSceneEvents(obj.sceneEvents, environment),
    hotspots: normalizeHotspots(obj.hotspots),
    sentenceTimings:
      obj.sentenceTimings && typeof obj.sentenceTimings === 'object'
        ? (obj.sentenceTimings as Record<string, MouthSyncTiming[]>)
        : undefined,
  };
}

function sortedKeys(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj as object).sort();
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('═'.repeat(72));
  console.log('CHECK 1 — Legacy story (no sceneBrief in DB)');
  console.log('═'.repeat(72));

  const { data: rows, error } = await supabase
    .from('stories')
    .select('id, title, household_id, environment, animation_data, is_immersive')
    .not('animation_data', 'is', null)
    .order('created_at', { ascending: true })
    .limit(40);

  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error('No stories with animation_data found');

  const legacy = rows.find((row) => {
    const ad = row.animation_data;
    if (!ad || typeof ad !== 'object') return false;
    return !('sceneBrief' in (ad as object));
  });

  if (!legacy) {
    console.log('No pre-sceneBrief story found among first 40 with animation_data.');
    console.log('Showing first row keys for inspection:');
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  ${row.id} keys=${sortedKeys(row.animation_data).join(',') || '(empty)'}`
      );
    }
    throw new Error('Could not find a legacy story without sceneBrief');
  }

  const rawAnim = legacy.animation_data as Record<string, unknown>;
  console.log(`story id: ${legacy.id}`);
  console.log(`title: ${legacy.title}`);
  console.log(`environment: ${legacy.environment}`);
  console.log(`raw animation_data keys: ${sortedKeys(rawAnim).join(', ')}`);
  console.log(`raw has sceneBrief key? ${'sceneBrief' in rawAnim}`);
  console.log('raw animation_data (full):');
  console.log(JSON.stringify(rawAnim, null, 2));

  const env = (legacy.environment as EnvironmentType) || 'village';
  const parsed = parseAnimationData(rawAnim, env);
  console.log('\nparseAnimationData result keys:', sortedKeys(parsed).join(', '));
  console.log(`parsed has sceneBrief key? ${'sceneBrief' in parsed}`);
  console.log('parsed animationData:');
  console.log(JSON.stringify(parsed, null, 2));

  // Compare non-brief fields: sceneSpec / events / hotspots / envDesc should match normalize of raw
  const baselineSpec = normalizeSceneSpec(rawAnim.sceneSpec, env);
  const baselineEvents = normalizeSceneEvents(rawAnim.sceneEvents, env);
  const baselineHotspots = normalizeHotspots(rawAnim.hotspots);
  console.log('\nsceneSpec identical to normalize(raw)?', JSON.stringify(parsed.sceneSpec) === JSON.stringify(baselineSpec));
  console.log('sceneEvents identical?', JSON.stringify(parsed.sceneEvents) === JSON.stringify(baselineEvents));
  console.log('hotspots identical?', JSON.stringify(parsed.hotspots) === JSON.stringify(baselineHotspots));

  // GET-path equivalent via service role (same extract as getFullImmersiveStory)
  const { data: getRow, error: getErr } = await supabase
    .from('stories')
    .select('*')
    .eq('id', legacy.id)
    .eq('household_id', legacy.household_id)
    .maybeSingle();
  if (getErr || !getRow) throw new Error(getErr?.message ?? 'GET row missing');

  // Dynamic import after env loaded
  const { extractImmersiveMeta } = await import('../src/lib/immersive/immersive-server');
  const immersive = extractImmersiveMeta(getRow as Record<string, unknown>);
  console.log('\nGET/extractImmersiveMeta animationData keys:', sortedKeys(immersive.animationData).join(', '));
  console.log(`GET has sceneBrief key? ${'sceneBrief' in immersive.animationData}`);
  console.log('GET animationData:');
  console.log(JSON.stringify(immersive.animationData, null, 2));

  console.log('\n' + '═'.repeat(72));
  console.log('CHECK 2 — Live generate → save → GET round-trip');
  console.log('═'.repeat(72));

  const prompt =
    'A market-day story where two cousins nearly quarrel over a goat at the stall, then an elder helps them make peace. Ages 6–12.';
  console.log('Generating…');
  const rawClaude = await generateStoryFromPrompt(prompt);
  const story = validateGeneratedStory(rawClaude);

  console.log('\nvalidateGeneratedStory (generate response) sceneBrief:');
  console.log(JSON.stringify(story.sceneBrief ?? null, null, 2));
  console.log(`generate payload has sceneBrief? ${Boolean(story.sceneBrief)}`);

  if (!story.sceneBrief) {
    throw new Error('Generate path did not produce sceneBrief — cannot round-trip');
  }

  const householdId = String(legacy.household_id);
  const authorId = String(getRow.author_id ?? '');

  // Create a throwaway draft story, then save immersive with sceneBrief
  const { data: created, error: createErr } = await supabase
    .from('stories')
    .insert({
      household_id: householdId,
      author_id: authorId || getRow.author_id,
      title: `[stage3-probe] ${story.title}`.slice(0, 120),
      transcript: story.transcript,
      status: 'draft',
      generation_type: 'ai',
      themes: story.themes,
      environment: story.environment ?? 'market',
      is_immersive: true,
      animation_data: {},
    })
    .select('*')
    .single();

  if (createErr || !created) throw new Error(createErr?.message ?? 'create failed');

  const animationDataToSave: AnimationData = {
    version: 2,
    environmentDescription: story.environmentDescription,
    sceneBrief: story.sceneBrief,
    sceneSpec: story.sceneSpec,
    sceneEvents: story.sceneEvents,
    hotspots: story.hotspots,
  };

  console.log('\nanimationData being saved:');
  console.log(JSON.stringify(animationDataToSave, null, 2));

  const { saveImmersiveStory, getFullImmersiveStory } = await import(
    '../src/lib/immersive/immersive-server'
  );

  const saved = await saveImmersiveStory(created.id, householdId, {
    environment: story.environment ?? 'market',
    characters: story.characters,
    isImmersive: true,
    animationData: animationDataToSave,
  });

  console.log('\nsaveImmersiveStory returned animationData.sceneBrief:');
  console.log(JSON.stringify(saved.animationData.sceneBrief ?? null, null, 2));
  console.log(`save result has sceneBrief key? ${'sceneBrief' in saved.animationData}`);

  const loaded = await getFullImmersiveStory(created.id, householdId);
  if (!loaded) throw new Error('getFullImmersiveStory returned null');

  console.log('\nGET (getFullImmersiveStory) animationData keys:', sortedKeys(loaded.animationData).join(', '));
  console.log(`GET has sceneBrief key? ${'sceneBrief' in loaded.animationData}`);
  console.log('GET animationData.sceneBrief:');
  console.log(JSON.stringify(loaded.animationData.sceneBrief ?? null, null, 2));

  const before = JSON.stringify(story.sceneBrief);
  const after = JSON.stringify(loaded.animationData.sceneBrief);
  console.log('\nsceneBrief unchanged after round-trip?', before === after);
  if (before !== after) {
    console.log('BEFORE:', before);
    console.log('AFTER:', after);
  }

  // Also show raw DB row
  const { data: dbRow } = await supabase
    .from('stories')
    .select('id, animation_data')
    .eq('id', created.id)
    .single();
  console.log('\nRaw DB animation_data keys:', sortedKeys(dbRow?.animation_data).join(', '));
  console.log('Raw DB sceneBrief:');
  console.log(
    JSON.stringify(
      dbRow?.animation_data && typeof dbRow.animation_data === 'object'
        ? (dbRow.animation_data as Record<string, unknown>).sceneBrief
        : null,
      null,
      2
    )
  );

  console.log(`\nProbe story id (draft, safe to delete): ${created.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
