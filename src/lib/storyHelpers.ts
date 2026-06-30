import { SYSTEM_THEME_NAMES, type SystemThemeName } from './themes';

export type StoryGenerationType = 'ai' | 'quick' | 'manual';
export type StoryStatus = 'draft' | 'published';

export interface StorySentenceInput {
  id?: string;
  sentenceText: string;
  sentenceOrder: number;
  kinyarwandaText?: string;
  themeLabel?: string;
  elderTalkingPoints?: string;
  childPrompt?: string;
  audioUrl?: string;
}

export interface GeneratedStoryPayload {
  title: string;
  transcript: string;
  themes: string[];
  sentences: StorySentenceInput[];
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
  kinyarwanda_text?: string | null;
  theme_label?: string | null;
  elder_talking_points?: string | null;
  child_prompt?: string | null;
  audio_url?: string | null;
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
  }));
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
      return {
        sentenceText,
        sentenceOrder:
          typeof row.order === 'number'
            ? row.order
            : typeof row.sentence_order === 'number'
              ? row.sentence_order
              : index,
        themeLabel: String(row.theme ?? row.themeLabel ?? row.theme_label ?? themes[0] ?? 'Ubuntu'),
        kinyarwandaText: row.kinyarwandaText
          ? String(row.kinyarwandaText)
          : row.kinyarwanda_text
            ? String(row.kinyarwanda_text)
            : undefined,
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
      };
    }).filter((s) => s.sentenceText.length > 0);
  } else if (transcript) {
    sentences = buildSentencesFromTranscript(transcript, themes);
  }

  if (!title) throw new Error('Story title is required.');
  if (sentences.length < 3) throw new Error('Story must have at least 3 sentences.');

  const normalizedThemes = themes.filter((t) =>
    SYSTEM_THEME_NAMES.includes(t as SystemThemeName)
  );

  return {
    title,
    transcript: transcript || sentences.map((s) => s.sentenceText).join(' '),
    themes: normalizedThemes.length > 0 ? normalizedThemes : ['Ubuntu'],
    sentences,
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

export async function mirrorStoryToRxDB(
  story: StoryRecord,
  sentences: StorySentenceRecord[]
): Promise<void> {
  try {
    const { initializeDatabase } = await import('@/db');
    const db = await initializeDatabase();
    const now = Date.now();

    await db.stories.upsert({
      id: story.id,
      householdId: story.household_id,
      title: story.title,
      authorId: story.author_id,
      status: story.status,
      transcript: story.transcript ?? undefined,
      audioUrl: story.audio_url ?? undefined,
      attribution: story.generation_type === 'ai' ? 'AI-assisted' : undefined,
      isOriginal: story.generation_type === 'manual',
      createdAt: now,
      updatedAt: now,
      syncedToCloud: 1,
    });

    for (const sentence of sentences) {
      await db.storySentences.upsert({
        id: sentence.id,
        storyId: sentence.story_id,
        sentenceText: sentence.sentence_text,
        sentenceOrder: sentence.sentence_order,
        kinyarwandaText: sentence.kinyarwanda_text ?? undefined,
        themeLabel: sentence.theme_label ?? undefined,
        elderTalkingPoints: sentence.elder_talking_points ?? undefined,
        childPrompt: sentence.child_prompt ?? undefined,
        createdAt: now,
      });
    }
  } catch {
    // RxDB is optional offline cache — cloud remains source of truth
  }
}
