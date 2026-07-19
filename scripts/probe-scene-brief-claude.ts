/**
 * Live Claude probe for sceneBrief quality — not part of the app.
 *
 *   npx tsx scripts/probe-scene-brief-claude.ts
 *
 * Loads .env.local for ANTHROPIC_API_KEY. Does not write to DB or UI.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateStoryFromPrompt } from '../src/lib/claude';
import { normalizeSceneBrief } from '../src/lib/immersive/sceneBrief';
import { VALID_PROP_TYPES } from '../src/lib/immersive/sceneSpec';
import type { SceneBrief } from '../src/lib/immersive/types';

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

const PROMPTS = [
  {
    label: 'tense · market quarrel',
    prompt:
      'A market-day story where two cousins nearly quarrel over a goat at the stall, then an elder helps them make peace. Ages 6–12, Kinyarwanda cultural values.',
  },
  {
    label: 'hopeful · school morning',
    prompt:
      'A hopeful schoolyard morning where a shy child finds courage with a teacher’s help before the first lesson. Ages 6–12.',
  },
  {
    label: 'cozy · home fire evening',
    prompt:
      'A cozy evening at home by the fire where grandmother tells a quiet memory to her grandchild. Warm, intimate, ages 6–12.',
  },
];

function diffBrief(raw: unknown, normalized: SceneBrief | undefined) {
  const notes: string[] = [];
  if (!raw || typeof raw !== 'object') {
    notes.push('REJECTED: raw sceneBrief missing or not an object');
    return notes;
  }
  if (!normalized) {
    notes.push('REJECTED: normalizeSceneBrief returned undefined (bad mood and/or empty keyProps)');
    return notes;
  }

  const obj = raw as Record<string, unknown>;

  if (String(obj.mood ?? '') !== normalized.mood) {
    notes.push(`mood: raw=${JSON.stringify(obj.mood)} → ${normalized.mood}`);
  } else {
    notes.push(`mood: kept "${normalized.mood}"`);
  }

  const densityRaw = obj.density;
  if (densityRaw === undefined || densityRaw === null || densityRaw === '') {
    notes.push(`density: defaulted → "${normalized.density}"`);
  } else if (String(densityRaw) !== normalized.density) {
    notes.push(`density: raw=${JSON.stringify(densityRaw)} → "${normalized.density}"`);
  } else {
    notes.push(`density: kept "${normalized.density}"`);
  }

  const hintRaw =
    obj.paletteHint && typeof obj.paletteHint === 'object'
      ? (obj.paletteHint as Record<string, unknown>)
      : null;
  if (!hintRaw) {
    notes.push(
      `paletteHint: missing → defaulted warmth=${normalized.paletteHint.warmth} sat=${normalized.paletteHint.saturation} contrast=${normalized.paletteHint.contrast}`
    );
  } else {
    const fields: Array<keyof typeof normalized.paletteHint> = [
      'warmth',
      'saturation',
      'contrast',
    ];
    for (const f of fields) {
      const rawVal = hintRaw[f];
      const normVal = normalized.paletteHint[f];
      if (rawVal === undefined) {
        notes.push(`paletteHint.${f}: missing → defaulted ${normVal}`);
      } else if (Number(rawVal) !== normVal) {
        notes.push(`paletteHint.${f}: raw=${rawVal} → clamped ${normVal}`);
      }
    }
    if (hintRaw.accentBias !== undefined && !normalized.paletteHint.accentBias) {
      notes.push(`paletteHint.accentBias: DROPPED invalid ${JSON.stringify(hintRaw.accentBias)}`);
    } else if (hintRaw.accentBias !== undefined) {
      notes.push(`paletteHint.accentBias: kept ${normalized.paletteHint.accentBias}`);
    }
    if (
      hintRaw.warmth !== undefined &&
      hintRaw.saturation !== undefined &&
      hintRaw.contrast !== undefined &&
      Number(hintRaw.warmth) === normalized.paletteHint.warmth &&
      Number(hintRaw.saturation) === normalized.paletteHint.saturation &&
      Number(hintRaw.contrast) === normalized.paletteHint.contrast
    ) {
      notes.push('paletteHint warmth/sat/contrast: kept as-is');
    }
  }

  const rawProps = Array.isArray(obj.keyProps) ? obj.keyProps : [];
  const rawTypes = rawProps.map((p) =>
    p && typeof p === 'object' ? String((p as Record<string, unknown>).type ?? '') : ''
  );
  const invalidTypes = rawTypes.filter((t) => t && !VALID_PROP_TYPES.has(t));
  const dupes = rawTypes.filter((t, i) => t && rawTypes.indexOf(t) !== i);
  if (invalidTypes.length) {
    notes.push(`keyProps: DROPPED invalid types [${invalidTypes.join(', ')}]`);
  }
  if (dupes.length) {
    notes.push(`keyProps: DEDUPED duplicate types [${[...new Set(dupes)].join(', ')}]`);
  }
  if (rawProps.length > 5) {
    notes.push(`keyProps: truncated ${rawProps.length} → 5`);
  }
  for (let i = 0; i < rawProps.length && i < 5; i++) {
    const row = rawProps[i];
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const type = String(r.type ?? '');
    if (!VALID_PROP_TYPES.has(type)) continue;
    const roleRaw = r.role;
    const kept = normalized.keyProps.find((k) => k.type === type);
    if (!kept) continue;
    if (roleRaw === undefined || roleRaw === null || roleRaw === '') {
      notes.push(`keyProps[${type}].role: missing → defaulted "${kept.role}"`);
    } else if (String(roleRaw) !== kept.role) {
      notes.push(
        `keyProps[${type}].role: raw=${JSON.stringify(roleRaw)} → "${kept.role}"`
      );
    }
  }
  notes.push(
    `keyProps: ${rawProps.length} raw → ${normalized.keyProps.length} kept [${normalized.keyProps.map((k) => `${k.type}:${k.role}`).join(', ')}]`
  );

  if (obj.timeOfDayArc === undefined) {
    notes.push('timeOfDayArc: omitted (ok)');
  } else if (!normalized.timeOfDayArc) {
    notes.push(`timeOfDayArc: DROPPED entirely (invalid keys/values) raw=${JSON.stringify(obj.timeOfDayArc)}`);
  } else {
    const rawArc = obj.timeOfDayArc as Record<string, unknown>;
    const droppedKeys = Object.keys(rawArc).filter((k) => !(k in normalized.timeOfDayArc!));
    if (droppedKeys.length) {
      notes.push(`timeOfDayArc: dropped keys [${droppedKeys.join(', ')}]`);
    } else {
      notes.push(`timeOfDayArc: kept ${JSON.stringify(normalized.timeOfDayArc)}`);
    }
  }

  if (obj.weatherBias === undefined) {
    notes.push('weatherBias: omitted (ok)');
  } else if (!normalized.weatherBias) {
    notes.push(`weatherBias: DROPPED invalid ${JSON.stringify(obj.weatherBias)}`);
  } else {
    notes.push(`weatherBias: kept "${normalized.weatherBias}"`);
  }

  return notes;
}

async function runOne(label: string, prompt: string) {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`PROMPT: ${label}`);
  console.log(`  ${prompt}`);
  console.log('─'.repeat(72));

  const result = (await generateStoryFromPrompt(prompt)) as Record<string, unknown>;
  const title = result.title;
  const environment = result.environment;
  const envDesc = result.environmentDescription;
  const sentences = Array.isArray(result.sentences) ? result.sentences : [];
  const sentencePreview = sentences
    .slice(0, 3)
    .map((s, i) => {
      const text =
        s && typeof s === 'object'
          ? String((s as Record<string, unknown>).text ?? '')
          : String(s);
      return `  [${i}] ${text.slice(0, 100)}`;
    })
    .join('\n');

  console.log(`title: ${JSON.stringify(title)}`);
  console.log(`environment: ${JSON.stringify(environment)}`);
  console.log(`environmentDescription: ${JSON.stringify(envDesc)}`);
  console.log(`sentence count: ${sentences.length}`);
  console.log(`first sentences:\n${sentencePreview}`);

  const rawBrief = result.sceneBrief;
  console.log('\n1) RAW sceneBrief from Claude:');
  console.log(JSON.stringify(rawBrief, null, 2));

  const normalized = normalizeSceneBrief(rawBrief);
  console.log('\n2) After normalizeSceneBrief:');
  console.log(normalized ? JSON.stringify(normalized, null, 2) : 'undefined');

  console.log('\n3) Normalizer diff / defaults:');
  for (const note of diffBrief(rawBrief, normalized)) {
    console.log(`  • ${note}`);
  }

  // Light fit check for human review
  const transcript = String(result.transcript ?? '');
  const blob = `${title} ${envDesc} ${transcript}`.toLowerCase();
  if (normalized) {
    console.log('\n4) Quick fit heuristics (manual judgment still needed):');
    console.log(`  • mood=${normalized.mood} vs setting=${environment}`);
    for (const kp of normalized.keyProps) {
      const mentioned = blob.includes(kp.type.replace('_', ' ')) || blob.includes(kp.type);
      console.log(
        `  • keyProp ${kp.type}:${kp.role} — type string in title/desc/transcript? ${mentioned ? 'yes' : 'no (may still fit visually)'}`
      );
    }
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY missing from .env.local');
  }
  console.log(`model: ${process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6 (default)'}`);

  for (const item of PROMPTS) {
    try {
      await runOne(item.label, item.prompt);
    } catch (err) {
      console.error(`\nFAILED (${item.label}):`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
