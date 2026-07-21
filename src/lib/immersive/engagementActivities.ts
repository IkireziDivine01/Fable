import { getEnvironmentPreset } from './presets';
import { VALID_PROP_TYPES } from './sceneSpec';
import type {
  EngagementActivity,
  EnvironmentType,
  PredictNextActivity,
  PredictNextChoice,
  PropType,
  SceneBrief,
  SequenceActivity,
  SequenceBeat,
  StorySceneSpec,
  TreasureHuntActivity,
  TreasureHuntTarget,
  VocabMatchActivity,
  VocabMatchPair,
} from './types';

/** Kid-friendly prop catalog for legacy engagement fallbacks */
const PROP_CATALOG: Record<
  string,
  { wordRw: string; glossEn: string; clueEn: string; clueRw: string; revealEn: string; revealRw: string }
> = {
  tree: {
    wordRw: 'igiti',
    glossEn: 'tree',
    clueEn: 'Tall and leafy — shade for the story',
    clueRw: 'Kirekire gifite amababi',
    revealEn: 'You found the tree!',
    revealRw: 'Wabonye igiti!',
  },
  hut: {
    wordRw: 'inzu',
    glossEn: 'house',
    clueEn: 'A cozy home of clay and straw',
    clueRw: 'Inzu y\'ibumba n\'ibyatsi',
    revealEn: 'Home sweet hut!',
    revealRw: 'Inzu nziza!',
  },
  fire: {
    wordRw: 'umuriro',
    glossEn: 'fire',
    clueEn: 'Warm glow where stories gather',
    clueRw: 'Umucyo ushyushye',
    revealEn: 'The fire crackles hello!',
    revealRw: 'Umuriro uramukanye!',
  },
  stall: {
    wordRw: 'iduka',
    glossEn: 'market stall',
    clueEn: 'A little shop full of treats',
    clueRw: 'Iduka rito ryuzuye',
    revealEn: 'Market treasure found!',
    revealRw: 'Wabonye iduka!',
  },
  board: {
    wordRw: 'ikibaho',
    glossEn: 'board',
    clueEn: 'Where lessons and drawings live',
    clueRw: 'Aho amasomo aba',
    revealEn: 'You found the board!',
    revealRw: 'Wabonye ikibaho!',
  },
  rock: {
    wordRw: 'ibuye',
    glossEn: 'rock',
    clueEn: 'A sturdy stone by the path',
    clueRw: 'Ibuye rikomeye',
    revealEn: 'Solid find!',
    revealRw: 'Wabonye ibuye!',
  },
  flower: {
    wordRw: 'indabo',
    glossEn: 'flower',
    clueEn: 'A bright bloom for smiling eyes',
    clueRw: 'Indabo nziza',
    revealEn: 'Pretty flower!',
    revealRw: 'Indabo nziza!',
  },
  bench: {
    wordRw: 'intebe',
    glossEn: 'bench',
    clueEn: 'A place to sit and listen',
    clueRw: 'Aho bacara bakumva',
    revealEn: 'Take a seat — you found it!',
    revealRw: 'Wabonye intebe!',
  },
  banana_tree: {
    wordRw: 'umutoki',
    glossEn: 'banana tree',
    clueEn: 'Broad leaves and sweet fruit',
    clueRw: 'Umutoki w\'imineke',
    revealEn: 'Banana tree treasure!',
    revealRw: 'Wabonye umutoki!',
  },
  path: {
    wordRw: 'inzira',
    glossEn: 'path',
    clueEn: 'The road the story walks on',
    clueRw: 'Inzira inkuru ikurikira',
    revealEn: 'You found the path!',
    revealRw: 'Wabonye inzira!',
  },
  water_jug: {
    wordRw: 'umucanga',
    glossEn: 'water jug',
    clueEn: 'Cool water for thirsty travelers',
    clueRw: 'Amazi yo kunywa',
    revealEn: 'Fresh water found!',
    revealRw: 'Wabonye umucanga!',
  },
  drum: {
    wordRw: 'ingoma',
    glossEn: 'drum',
    clueEn: 'Listen for the heartbeat of the dance',
    clueRw: 'Umubyinanyi w\'ingoma',
    revealEn: 'Boom! The drum!',
    revealRw: 'Ingoma! Ryiza!',
  },
  goat: {
    wordRw: 'ihene',
    glossEn: 'goat',
    clueEn: 'A bleating friend in the grass',
    clueRw: 'Inshuti ivuga mee',
    revealEn: 'Hello, little goat!',
    revealRw: 'Muraho, ihene!',
  },
  millet_field: {
    wordRw: 'uburo',
    glossEn: 'millet field',
    clueEn: 'Golden grain waving in the breeze',
    clueRw: 'Uburo bwiza',
    revealEn: 'You found the millet!',
    revealRw: 'Wabonye uburo!',
  },
};

const ACTIVITY_TYPES = new Set<EngagementActivity['type']>([
  'treasure_hunt',
  'sequence',
  'vocab_match',
  'predict_next',
]);

function parsePropType(raw: unknown): PropType | undefined {
  const value = String(raw ?? '').trim();
  return VALID_PROP_TYPES.has(value) ? (value as PropType) : undefined;
}

function trimText(raw: unknown, max: number): string | undefined {
  const value = String(raw ?? '').trim().slice(0, max);
  return value || undefined;
}

function keyPropTypes(sceneBrief?: SceneBrief | null): Set<PropType> {
  const set = new Set<PropType>();
  for (const prop of sceneBrief?.keyProps ?? []) {
    set.add(prop.type);
  }
  return set;
}

function normalizeTreasureHunt(
  raw: Record<string, unknown>,
  allowed: Set<PropType>
): TreasureHuntActivity | undefined {
  const introEn = trimText(raw.introEn, 160);
  if (!introEn) return undefined;

  const targetsRaw = Array.isArray(raw.targets) ? raw.targets : [];
  const seen = new Set<PropType>();
  const targets: TreasureHuntTarget[] = [];

  for (const item of targetsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const propType = parsePropType(row.propType);
    if (!propType || !allowed.has(propType) || seen.has(propType)) continue;
    const clueEn = trimText(row.clueEn, 140);
    if (!clueEn) continue;
    seen.add(propType);

    const target: TreasureHuntTarget = { propType, clueEn };
    const clueRw = trimText(row.clueRw, 140);
    if (clueRw) target.clueRw = clueRw;
    const revealEn = trimText(row.revealEn, 220);
    if (revealEn) target.revealEn = revealEn;
    const revealRw = trimText(row.revealRw, 220);
    if (revealRw) target.revealRw = revealRw;
    targets.push(target);
    if (targets.length >= 4) break;
  }

  if (targets.length < 2) return undefined;

  const activity: TreasureHuntActivity = { type: 'treasure_hunt', introEn, targets };
  const introRw = trimText(raw.introRw, 160);
  if (introRw) activity.introRw = introRw;
  return activity;
}

function normalizeSequence(raw: Record<string, unknown>): SequenceActivity | undefined {
  const promptEn = trimText(raw.promptEn, 160);
  if (!promptEn) return undefined;

  const beatsRaw = Array.isArray(raw.beats) ? raw.beats : [];
  const beats: SequenceBeat[] = [];
  const seenOrders = new Set<number>();
  const seenIds = new Set<string>();

  for (const item of beatsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const labelEn = trimText(row.labelEn, 100);
    if (!labelEn) continue;
    const correctOrder = Math.floor(Number(row.correctOrder));
    if (!Number.isInteger(correctOrder) || correctOrder < 0 || seenOrders.has(correctOrder)) {
      continue;
    }
    const id =
      trimText(row.id, 40) ?? `beat-${correctOrder}-${beats.length}`;
    if (seenIds.has(id)) continue;
    seenOrders.add(correctOrder);
    seenIds.add(id);

    const beat: SequenceBeat = { id, labelEn, correctOrder };
    const labelRw = trimText(row.labelRw, 100);
    if (labelRw) beat.labelRw = labelRw;
    beats.push(beat);
    if (beats.length >= 5) break;
  }

  if (beats.length < 4) return undefined;

  // Must be a contiguous permutation 0..n-1
  const orders = beats.map((b) => b.correctOrder).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i) return undefined;
  }

  const activity: SequenceActivity = { type: 'sequence', promptEn, beats };
  const promptRw = trimText(raw.promptRw, 160);
  if (promptRw) activity.promptRw = promptRw;
  return activity;
}

function normalizeVocabMatch(
  raw: Record<string, unknown>,
  allowed: Set<PropType>
): VocabMatchActivity | undefined {
  const promptEn = trimText(raw.promptEn, 160);
  if (!promptEn) return undefined;

  const pairsRaw = Array.isArray(raw.pairs) ? raw.pairs : [];
  const seen = new Set<PropType>();
  const pairs: VocabMatchPair[] = [];

  for (const item of pairsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const propType = parsePropType(row.propType);
    if (!propType || !allowed.has(propType) || seen.has(propType)) continue;
    const wordRw = trimText(row.wordRw, 48);
    const glossEn = trimText(row.glossEn, 80);
    if (!wordRw || !glossEn) continue;
    seen.add(propType);
    pairs.push({ wordRw, glossEn, propType });
    if (pairs.length >= 5) break;
  }

  if (pairs.length < 3) return undefined;

  const activity: VocabMatchActivity = { type: 'vocab_match', promptEn, pairs };
  const promptRw = trimText(raw.promptRw, 160);
  if (promptRw) activity.promptRw = promptRw;
  return activity;
}

function normalizePredictNext(raw: Record<string, unknown>): PredictNextActivity | undefined {
  const promptEn = trimText(raw.promptEn, 180);
  const encouragementEn = trimText(raw.encouragementEn, 160);
  if (!promptEn || !encouragementEn) return undefined;

  const choicesRaw = Array.isArray(raw.choices) ? raw.choices : [];
  const choices: PredictNextChoice[] = [];
  const seenIds = new Set<string>();

  for (const item of choicesRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const textEn = trimText(row.textEn, 120);
    if (!textEn) continue;
    const id = trimText(row.id, 40) ?? `choice-${choices.length}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const choice: PredictNextChoice = { id, textEn };
    const textRw = trimText(row.textRw, 120);
    if (textRw) choice.textRw = textRw;
    choices.push(choice);
    if (choices.length >= 3) break;
  }

  if (choices.length !== 3) return undefined;

  const correctChoiceId = trimText(raw.correctChoiceId, 40);
  if (!correctChoiceId || !choices.some((c) => c.id === correctChoiceId)) {
    return undefined;
  }

  const activity: PredictNextActivity = {
    type: 'predict_next',
    promptEn,
    choices,
    correctChoiceId,
    encouragementEn,
  };
  const promptRw = trimText(raw.promptRw, 180);
  if (promptRw) activity.promptRw = promptRw;
  const encouragementRw = trimText(raw.encouragementRw, 160);
  if (encouragementRw) activity.encouragementRw = encouragementRw;
  return activity;
}

/**
 * Sanitize engagement activities from Claude / stored animation_data.
 * Prop-based activities must reference sceneBrief.keyProps types.
 * Returns undefined when nothing valid remains.
 */
export function normalizeEngagementActivities(
  raw: unknown,
  sceneBrief?: SceneBrief | null,
  options?: { sentenceCount?: number }
): EngagementActivity[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const allowed = keyPropTypes(sceneBrief);
  const byType = new Map<EngagementActivity['type'], EngagementActivity>();
  const sentenceCount = options?.sentenceCount ?? 0;

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? '').trim() as EngagementActivity['type'];
    if (!ACTIVITY_TYPES.has(type) || byType.has(type)) continue;

    let normalized: EngagementActivity | undefined;
    if (type === 'treasure_hunt') {
      if (allowed.size === 0) continue;
      normalized = normalizeTreasureHunt(row, allowed);
    } else if (type === 'sequence') {
      normalized = normalizeSequence(row);
    } else if (type === 'vocab_match') {
      if (allowed.size === 0) continue;
      normalized = normalizeVocabMatch(row, allowed);
    } else if (type === 'predict_next') {
      // Prefer predict_next when the story is long enough; still accept if stored
      if (sentenceCount > 0 && sentenceCount < 4) continue;
      normalized = normalizePredictNext(row);
    }

    if (normalized) byType.set(type, normalized);
  }

  // Prefer vocab_match for Glow Trail; keep hunt/sequence in storage for legacy synthesis
  const postTypes: EngagementActivity['type'][] = [
    'vocab_match',
    'treasure_hunt',
    'sequence',
  ];
  const post = postTypes
    .map((t) => byType.get(t))
    .filter((a): a is EngagementActivity => Boolean(a))
    .slice(0, 2);

  const predict = byType.get('predict_next');
  const result: EngagementActivity[] = [];
  if (predict) result.push(predict);
  result.push(...post);

  return result.length > 0 ? result : undefined;
}

export function getPredictNextActivity(
  activities: EngagementActivity[] | null | undefined
): PredictNextActivity | undefined {
  return activities?.find((a): a is PredictNextActivity => a.type === 'predict_next');
}

const GLOW_TRAIL_PROMPT_EN = 'Letter Party — fill in the missing letter!';
const GLOW_TRAIL_PROMPT_RW = 'Letter Party — uzuza inyuguti ibura!';

/**
 * Vocab source for the post-story Letter Party (word build) game.
 * Prefers vocab_match; synthesizes from treasure_hunt / scene props when needed.
 */
export function resolveGlowTrailActivity(
  activities: EngagementActivity[] | null | undefined,
  ctx?: EnsureEngagementContext
): VocabMatchActivity | undefined {
  const vocab = activities?.find((a): a is VocabMatchActivity => a.type === 'vocab_match');
  if (vocab && vocab.pairs.length >= 2) {
    return {
      type: 'vocab_match',
      promptEn: vocab.promptEn?.trim() || GLOW_TRAIL_PROMPT_EN,
      promptRw: vocab.promptRw?.trim() || GLOW_TRAIL_PROMPT_RW,
      pairs: vocab.pairs.slice(0, 4),
    };
  }

  const hunt = activities?.find((a): a is TreasureHuntActivity => a.type === 'treasure_hunt');
  if (hunt) {
    const pairs: VocabMatchPair[] = [];
    for (const target of hunt.targets) {
      const cat = PROP_CATALOG[target.propType];
      if (!cat) continue;
      pairs.push({
        propType: target.propType,
        wordRw: cat.wordRw,
        glossEn: cat.glossEn,
      });
      if (pairs.length >= 4) break;
    }
    if (pairs.length >= 2) {
      return {
        type: 'vocab_match',
        promptEn: GLOW_TRAIL_PROMPT_EN,
        promptRw: GLOW_TRAIL_PROMPT_RW,
        pairs,
      };
    }
  }

  if (ctx) {
    return buildDefaultVocabMatch(resolveEngagementPropTypes(ctx));
  }
  return undefined;
}

/** Post-story pack: Letter Party word-build (from vocab pairs). */
export function getPostStoryActivities(
  activities: EngagementActivity[] | null | undefined,
  ctx?: EnsureEngagementContext
): VocabMatchActivity[] {
  const trail = resolveGlowTrailActivity(activities, ctx);
  return trail ? [trail] : [];
}

export interface EnsureEngagementContext {
  sceneBrief?: SceneBrief | null;
  sceneSpec?: StorySceneSpec | null;
  environment?: EnvironmentType;
  sentences?: Array<
    | string
    | {
        sentence_text?: string | null;
        text?: string | null;
        kinyarwanda_text?: string | null;
        kinyarwandaText?: string | null;
      }
  >;
}

function sentenceText(
  raw:
    | string
    | {
        sentence_text?: string | null;
        text?: string | null;
        kinyarwanda_text?: string | null;
        kinyarwandaText?: string | null;
      }
    | undefined
): { en: string; rw: string } {
  if (raw == null) return { en: '', rw: '' };
  if (typeof raw === 'string') return { en: raw.trim(), rw: '' };
  const en = String(raw.sentence_text ?? raw.text ?? '').trim();
  const rw = String(raw.kinyarwanda_text ?? raw.kinyarwandaText ?? '').trim();
  return { en, rw };
}

function snippetLabel(text: string, max = 72): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Unique prop types available in the scene (brief → spec → environment preset). */
export function resolveEngagementPropTypes(
  ctx: EnsureEngagementContext
): PropType[] {
  const seen = new Set<PropType>();
  const push = (type: string) => {
    if (!VALID_PROP_TYPES.has(type) || !PROP_CATALOG[type]) return;
    seen.add(type as PropType);
  };

  for (const prop of ctx.sceneBrief?.keyProps ?? []) {
    push(prop.type);
  }
  for (const obj of ctx.sceneSpec?.objects ?? []) {
    push(obj.type);
  }
  if (seen.size < 2 && ctx.environment) {
    for (const obj of getEnvironmentPreset(ctx.environment).objects) {
      push(obj.type);
    }
  }

  return [...seen];
}

function briefForNormalize(
  ctx: EnsureEngagementContext,
  props: PropType[]
): SceneBrief {
  if (ctx.sceneBrief?.keyProps?.length) return ctx.sceneBrief;
  return {
    mood: ctx.sceneBrief?.mood ?? 'warm',
    density: ctx.sceneBrief?.density ?? 'balanced',
    paletteHint: ctx.sceneBrief?.paletteHint ?? {
      warmth: 0.55,
      saturation: 0.5,
      contrast: 0.45,
    },
    keyProps: props.map((type) => ({ type, role: 'dressing' as const })),
  };
}

function buildDefaultTreasureHunt(props: PropType[]): TreasureHuntActivity | undefined {
  const targets: TreasureHuntTarget[] = [];
  for (const propType of props) {
    const cat = PROP_CATALOG[propType];
    if (!cat) continue;
    targets.push({
      propType,
      clueEn: cat.clueEn,
      clueRw: cat.clueRw,
      revealEn: cat.revealEn,
      revealRw: cat.revealRw,
    });
    if (targets.length >= 3) break;
  }
  if (targets.length < 2) return undefined;
  return {
    type: 'treasure_hunt',
    introEn: 'Find the story treasures hiding in the world!',
    introRw: 'Shaka ibintu by\'inkuru mu isi!',
    targets,
  };
}

function buildDefaultVocabMatch(props: PropType[]): VocabMatchActivity | undefined {
  const pairs: VocabMatchPair[] = [];
  for (const propType of props) {
    const cat = PROP_CATALOG[propType];
    if (!cat) continue;
    pairs.push({
      propType,
      wordRw: cat.wordRw,
      glossEn: cat.glossEn,
    });
    if (pairs.length >= 3) break;
  }
  if (pairs.length < 3) return undefined;
  return {
    type: 'vocab_match',
    promptEn: GLOW_TRAIL_PROMPT_EN,
    promptRw: GLOW_TRAIL_PROMPT_RW,
    pairs,
  };
}

function buildDefaultSequence(
  sentences: EnsureEngagementContext['sentences']
): SequenceActivity | undefined {
  const lines = (sentences ?? [])
    .map(sentenceText)
    .filter((s) => s.en.length > 0);
  if (lines.length < 4) return undefined;

  const indexes =
    lines.length === 4
      ? [0, 1, 2, 3]
      : [
          0,
          Math.floor((lines.length - 1) / 3),
          Math.floor((2 * (lines.length - 1)) / 3),
          lines.length - 1,
        ];
  // Deduplicate indexes if story is short-ish
  const unique = [...new Set(indexes)];
  while (unique.length < 4 && unique.length < lines.length) {
    for (let i = 0; i < lines.length && unique.length < 4; i++) {
      if (!unique.includes(i)) unique.push(i);
    }
  }
  if (unique.length < 4) return undefined;

  const beats: SequenceBeat[] = unique.slice(0, 4).map((lineIndex, order) => {
    const line = lines[lineIndex];
    const beat: SequenceBeat = {
      id: `beat-${order}`,
      labelEn: snippetLabel(line.en),
      correctOrder: order,
    };
    if (line.rw) beat.labelRw = snippetLabel(line.rw);
    return beat;
  });

  return {
    type: 'sequence',
    promptEn: 'Put the story moments back in order!',
    promptRw: 'Shyira ibihe by\'inkuru mu buryo bukwiriye!',
    beats,
  };
}

function buildDefaultPredictNext(
  sentences: EnsureEngagementContext['sentences']
): PredictNextActivity | undefined {
  const lines = (sentences ?? [])
    .map(sentenceText)
    .filter((s) => s.en.length > 0);
  if (lines.length < 4) return undefined;

  const last = lines[lines.length - 1];
  const earlier = lines.slice(0, -1);
  const distractorA = earlier[Math.floor(earlier.length / 3)] ?? earlier[0];
  const distractorB =
    earlier[Math.floor((2 * earlier.length) / 3)] ?? earlier[earlier.length - 1];

  const choices: PredictNextChoice[] = [
    { id: 'a', textEn: snippetLabel(distractorA.en, 100) },
    { id: 'b', textEn: snippetLabel(last.en, 100) },
    { id: 'c', textEn: snippetLabel(distractorB.en, 100) },
  ];
  if (distractorA.rw) choices[0].textRw = snippetLabel(distractorA.rw, 100);
  if (last.rw) choices[1].textRw = snippetLabel(last.rw, 100);
  if (distractorB.rw) choices[2].textRw = snippetLabel(distractorB.rw, 100);

  // Ensure three distinct choice texts
  const texts = new Set(choices.map((c) => c.textEn.toLowerCase()));
  if (texts.size < 3) {
    choices[0].textEn = 'They rest quietly at home';
    choices[2].textEn = 'They run far away forever';
    delete choices[0].textRw;
    delete choices[2].textRw;
  }

  return {
    type: 'predict_next',
    promptEn: 'What happens at the end?',
    promptRw: 'Ni iki kizaba ku mpera?',
    choices,
    correctChoiceId: 'b',
    encouragementEn: 'Nice thinking — here comes the real ending!',
    encouragementRw: 'Utekereje neza — reba uko inkuru irangira!',
  };
}

/**
 * Build a full engagement pack from scene + sentences for legacy stories
 * that predate Claude-generated engagementActivities.
 */
export function buildDefaultEngagementActivities(
  ctx: EnsureEngagementContext
): EngagementActivity[] | undefined {
  const props = resolveEngagementPropTypes(ctx);
  const brief = briefForNormalize(ctx, props);
  const raw: EngagementActivity[] = [];

  const predict = buildDefaultPredictNext(ctx.sentences);
  if (predict) raw.push(predict);

  // Glow Trail (stored as vocab_match) is the sole post-story 3D game
  const vocab = buildDefaultVocabMatch(props);
  if (vocab) raw.push(vocab);

  return normalizeEngagementActivities(raw, brief, {
    sentenceCount: ctx.sentences?.length ?? 0,
  });
}

/**
 * Prefer stored AI activities when valid; fill any missing activity types
 * (or replace an empty pack) so older stories still get predict + post games.
 */
export function ensureEngagementActivities(
  stored: EngagementActivity[] | null | undefined,
  ctx: EnsureEngagementContext
): EngagementActivity[] | undefined {
  const props = resolveEngagementPropTypes(ctx);
  const brief = briefForNormalize(ctx, props);
  const sentenceCount = ctx.sentences?.length ?? 0;

  const normalized = normalizeEngagementActivities(stored, brief, { sentenceCount });
  const defaults = buildDefaultEngagementActivities(ctx);

  if (!normalized?.length) {
    return defaults;
  }

  const byType = new Map<EngagementActivity['type'], EngagementActivity>();
  for (const activity of normalized) {
    byType.set(activity.type, activity);
  }

  const defaultByType = new Map<EngagementActivity['type'], EngagementActivity>();
  for (const activity of defaults ?? []) {
    defaultByType.set(activity.type, activity);
  }

  // Fill predict if missing
  if (!byType.has('predict_next')) {
    const fallbackPredict = defaultByType.get('predict_next');
    if (fallbackPredict) byType.set('predict_next', fallbackPredict);
  }

  // Ensure Glow Trail source (vocab_match) exists; synthesize from hunt if needed
  if (!byType.has('vocab_match')) {
    const fromHunt = resolveGlowTrailActivity(
      [...byType.values()],
      ctx
    );
    if (fromHunt) {
      byType.set('vocab_match', fromHunt);
    } else {
      const fallback = defaultByType.get('vocab_match');
      if (fallback) byType.set('vocab_match', fallback);
    }
  }

  const postTypes: EngagementActivity['type'][] = [
    'vocab_match',
    'treasure_hunt',
    'sequence',
  ];
  const post = postTypes
    .map((t) => byType.get(t))
    .filter((a): a is EngagementActivity => Boolean(a))
    .slice(0, 2);

  const predict = byType.get('predict_next');
  const result: EngagementActivity[] = [];
  if (predict) result.push(predict);
  result.push(...post);

  return result.length > 0 ? result : defaults;
}
