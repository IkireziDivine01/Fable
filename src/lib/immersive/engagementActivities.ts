import { VALID_PROP_TYPES } from './sceneSpec';
import type {
  EngagementActivity,
  PredictNextActivity,
  PredictNextChoice,
  PropType,
  SceneBrief,
  SequenceActivity,
  SequenceBeat,
  TreasureHuntActivity,
  TreasureHuntTarget,
  VocabMatchActivity,
  VocabMatchPair,
} from './types';

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

  // Cap post-story activities to 2 (hunt / sequence / vocab), keep predict_next
  const postTypes: EngagementActivity['type'][] = [
    'treasure_hunt',
    'vocab_match',
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

/** Post-story pack order: hunt → vocab → sequence (skip missing). */
export function getPostStoryActivities(
  activities: EngagementActivity[] | null | undefined
): Array<TreasureHuntActivity | VocabMatchActivity | SequenceActivity> {
  if (!activities?.length) return [];
  const order: Array<'treasure_hunt' | 'vocab_match' | 'sequence'> = [
    'treasure_hunt',
    'vocab_match',
    'sequence',
  ];
  const result: Array<TreasureHuntActivity | VocabMatchActivity | SequenceActivity> = [];
  for (const type of order) {
    const found = activities.find((a) => a.type === type);
    if (found && found.type !== 'predict_next') result.push(found);
  }
  return result;
}
