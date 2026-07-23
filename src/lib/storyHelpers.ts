import { SYSTEM_THEME_NAMES, type SystemThemeName } from './themes';
import { normalizeEngagementActivities } from './immersive/engagementActivities';
import { normalizeSceneBrief } from './immersive/sceneBrief';
import {
  normalizeHotspots,
  normalizeSceneEvents,
} from './immersive/sceneEvents';
import {
  normalizeCharacterAppearance,
  normalizeSceneSpec,
} from './immersive/sceneSpec';
import type {
  CharacterType,
  EngagementActivity,
  EnvironmentType,
  SceneBrief,
  SceneEvent,
  StoryCharacterSlot,
  StoryHotspot,
  StorySceneSpec,
} from './immersive/types';

const VALID_ENVIRONMENTS: EnvironmentType[] = ['forest', 'home', 'village', 'school', 'market'];
const VALID_CHARACTER_TYPES: CharacterType[] = [
  'boy',
  'girl',
  'grandma',
  'grandpa',
  'dog',
  'teacher',
];

export type StoryGenerationType = 'ai' | 'quick' | 'manual';
export type StoryStatus = 'draft' | 'published';

export interface StorySentenceInput {
  id?: string;
  sentenceText: string;
  sentenceOrder: number;
  /** Character name speaking this line — must match a character in the story */
  speaker?: string;
  /** Required Ikinyarwanda translation of this sentence */
  kinyarwandaText: string;
  themeLabel?: string;
  elderTalkingPoints?: string;
  childPrompt?: string;
  audioUrl?: string;
  /** Pre-generated or recorded Kinyarwanda narration */
  kinyarwandaAudioUrl?: string;
}

export interface GeneratedStoryPayload {
  title: string;
  transcript: string;
  themes: string[];
  sentences: StorySentenceInput[];
  environment?: EnvironmentType;
  environmentDescription?: string;
  /** Normalized creative direction; omit when Claude/legacy payload has none */
  sceneBrief?: SceneBrief;
  sceneSpec?: StorySceneSpec;
  sceneEvents?: Record<string, SceneEvent>;
  hotspots?: StoryHotspot[];
  engagementActivities?: EngagementActivity[];
  characters?: StoryCharacterSlot[];
}

export interface StoryRecord {
  id: string;
  household_id: string;
  author_id: string;
  title: string;
  status: StoryStatus;
  transcript?: string | null;
  audio_url?: string | null;
  generation_type?: StoryGenerationType | null;
  source?: string | null;
  themes?: string[] | null;
  environment?: string | null;
  characters?: unknown;
  video_url?: string | null;
  is_immersive?: boolean | null;
  animation_data?: unknown;
  created_at: string;
  updated_at?: string | null;
}

export interface StorySentenceRecord {
  id: string;
  story_id: string;
  sentence_text: string;
  sentence_order: number;
  speaker?: string | null;
  kinyarwanda_text?: string | null;
  theme_label?: string | null;
  elder_talking_points?: string | null;
  child_prompt?: string | null;
  audio_url?: string | null;
  kinyarwanda_audio_url?: string | null;
  created_at?: string | null;
}

export function splitTranscriptIntoSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function buildSentencesFromTranscript(
  transcript: string,
  themes: string[] = []
): StorySentenceInput[] {
  const parts = splitTranscriptIntoSentences(transcript);
  const defaultTheme = themes[0];

  return parts.map((text, index) => ({
    sentenceText: text,
    sentenceOrder: index,
    themeLabel: defaultTheme,
    kinyarwandaText: '',
  }));
}

/** Every story line must include a non-empty Kinyarwanda (Ikinyarwanda) translation. */
export function assertSentencesHaveKinyarwanda(
  sentences: Array<{
    sentenceText?: string;
    kinyarwandaText?: string | null;
    kinyarwanda_text?: string | null;
    sentence_text?: string;
  }>
): void {
  if (!sentences.length) {
    throw new Error('At least one sentence is required.');
  }

  const missing: number[] = [];
  sentences.forEach((sentence, index) => {
    const rw = String(
      sentence.kinyarwandaText ?? sentence.kinyarwanda_text ?? ''
    ).trim();
    if (!rw) missing.push(index + 1);
  });

  if (missing.length > 0) {
    const list =
      missing.length <= 5
        ? missing.join(', ')
        : `${missing.slice(0, 5).join(', ')}…`;
    throw new Error(
      `Kinyarwanda is required for every sentence. Missing on sentence${missing.length === 1 ? '' : 's'} ${list}.`
    );
  }
}

export function validateGeneratedStory(data: unknown): GeneratedStoryPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid story response from AI.');
  }

  const obj = data as Record<string, unknown>;
  const title = String(obj.title ?? '').trim();
  const transcript = String(obj.transcript ?? '').trim();
  const themes = Array.isArray(obj.themes)
    ? obj.themes.map(String).filter(Boolean)
    : [];

  let sentences: StorySentenceInput[] = [];

  if (Array.isArray(obj.sentences) && obj.sentences.length > 0) {
    sentences = obj.sentences.map((item, index) => {
      const row = item as Record<string, unknown>;
      const sentenceText = String(
        row.text ?? row.sentenceText ?? row.sentence_text ?? ''
      ).trim();
      const kinyarwandaText = String(
        row.kinyarwandaText ?? row.kinyarwanda_text ?? ''
      ).trim();
      return {
        sentenceText,
        sentenceOrder:
          typeof row.order === 'number'
            ? row.order
            : typeof row.sentence_order === 'number'
              ? row.sentence_order
              : index,
        themeLabel: String(row.theme ?? row.themeLabel ?? row.theme_label ?? themes[0] ?? 'Ubuntu'),
        kinyarwandaText,
        elderTalkingPoints: row.elderTalkingPoints
          ? String(row.elderTalkingPoints)
          : row.elder_talking_points
            ? String(row.elder_talking_points)
            : undefined,
        childPrompt: row.childPrompt
          ? String(row.childPrompt)
          : row.child_prompt
            ? String(row.child_prompt)
            : undefined,
        speaker: row.speaker ? String(row.speaker).trim() : undefined,
      };
    }).filter((s) => s.sentenceText.length > 0);
  } else if (transcript) {
    sentences = buildSentencesFromTranscript(transcript, themes);
  }

  if (!title) throw new Error('Story title is required.');
  if (sentences.length < 3) throw new Error('Story must have at least 3 sentences.');
  assertSentencesHaveKinyarwanda(sentences);

  const normalizedThemes = themes.filter((t) =>
    SYSTEM_THEME_NAMES.includes(t as SystemThemeName)
  );

  const environmentRaw = String(obj.environment ?? '').trim();
  const environment = VALID_ENVIRONMENTS.includes(environmentRaw as EnvironmentType)
    ? (environmentRaw as EnvironmentType)
    : undefined;

  const environmentDescription = obj.environmentDescription
    ? String(obj.environmentDescription).trim()
    : undefined;

  // Optional — legacy / incomplete payloads omit this; never invent a default brief
  const sceneBrief = normalizeSceneBrief(obj.sceneBrief);

  const sceneSpec = environment
    ? normalizeSceneSpec(obj.sceneSpec, environment)
    : undefined;

  const sceneEvents = environment
    ? normalizeSceneEvents(obj.sceneEvents, environment)
    : undefined;
  const hotspots = normalizeHotspots(obj.hotspots);
  const engagementActivities = normalizeEngagementActivities(
    obj.engagementActivities,
    sceneBrief,
    { sentenceCount: sentences.length }
  );

  let characters: StoryCharacterSlot[] | undefined;
  if (Array.isArray(obj.characters) && obj.characters.length > 0) {
    characters = obj.characters
      .slice(0, 3)
      .map((item, index) => {
        const row = item as Record<string, unknown>;
        const typeRaw = String(row.type ?? row.character_type ?? 'grandma');
        const type = VALID_CHARACTER_TYPES.includes(typeRaw as CharacterType)
          ? (typeRaw as CharacterType)
          : 'grandma';
        const name = String(row.name ?? row.character_name ?? `Character ${index + 1}`).trim();
        const description = row.description ? String(row.description).trim() : undefined;
        const appearance = normalizeCharacterAppearance(row.appearance, type);
        return {
          name: name || `Character ${index + 1}`,
          type,
          position: index + 1,
          description,
          appearance,
        };
      })
      .filter((c) => c.name.length > 0);
    if (characters.length === 0) characters = undefined;
  }

  return {
    title,
    transcript: transcript || sentences.map((s) => s.sentenceText).join(' '),
    themes: normalizedThemes.length > 0 ? normalizedThemes : ['Ubuntu'],
    sentences,
    environment,
    environmentDescription,
    ...(sceneBrief ? { sceneBrief } : {}),
    sceneSpec,
    sceneEvents,
    hotspots,
    ...(engagementActivities ? { engagementActivities } : {}),
    characters,
  };
}

export function parseClaudeJson(content: string): unknown {
  const trimmed = content.trim();
  const candidates: string[] = [trimmed];

  const fencedBlocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fencedBlocks) {
    if (match[1]?.trim()) candidates.push(match[1].trim());
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  const errors: string[] = [];

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    try {
      return JSON.parse(normalized);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'parse failed');
    }
  }

  throw new Error(
    'Could not parse AI response. Try regenerating with a shorter or clearer prompt.'
  );
}
