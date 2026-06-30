import { supabaseAdmin } from '../supabase-admin';
import type {
  AnimationData,
  EnvironmentType,
  ImmersiveStoryMeta,
  MouthSyncTiming,
  StoryCharacterSlot,
} from './types';

function parseCharacters(raw: unknown): StoryCharacterSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      id: row.id ? String(row.id) : undefined,
      name: String(row.name ?? row.character_name ?? `Character ${index + 1}`),
      type: (row.type ?? row.character_type ?? 'grandma') as StoryCharacterSlot['type'],
      position: Number(row.position ?? index + 1),
      mouthSyncTimings: Array.isArray(row.mouthSyncTimings)
        ? row.mouthSyncTimings
        : Array.isArray(row.mouth_sync_timings)
          ? row.mouth_sync_timings
          : [],
    };
  });
}

function parseAnimationData(raw: unknown): AnimationData {
  if (!raw || typeof raw !== 'object') return { version: 1 };
  const obj = raw as Record<string, unknown>;
  return {
    version: Number(obj.version ?? 1),
    useAiVoice: obj.useAiVoice !== undefined ? Boolean(obj.useAiVoice) : undefined,
    sentenceTimings:
      obj.sentenceTimings && typeof obj.sentenceTimings === 'object'
        ? (obj.sentenceTimings as Record<string, MouthSyncTiming[]>)
        : undefined,
  };
}

export function extractImmersiveMeta(row: Record<string, unknown>): ImmersiveStoryMeta {
  return {
    environment: (row.environment as EnvironmentType) ?? 'village',
    characters: parseCharacters(row.characters),
    audioUrl: (row.audio_url as string) ?? null,
    videoUrl: (row.video_url as string) ?? null,
    isImmersive: Boolean(row.is_immersive),
    animationData: parseAnimationData(row.animation_data),
  };
}

export async function getStoryCharactersFromDb(storyId: string): Promise<StoryCharacterSlot[]> {
  const { data } = await supabaseAdmin
    .from('story_characters')
    .select('*')
    .eq('story_id', storyId)
    .order('position', { ascending: true });

  if (!data?.length) return [];

  return data.map((row) => ({
    id: String(row.id),
    name: String(row.character_name),
    type: row.character_type as StoryCharacterSlot['type'],
    position: Number(row.position),
    mouthSyncTimings: Array.isArray(row.mouth_sync_timings) ? row.mouth_sync_timings : [],
  }));
}

export async function saveImmersiveStory(
  storyId: string,
  householdId: string,
  meta: Partial<ImmersiveStoryMeta>
) {
  const { data: story } = await supabaseAdmin
    .from('stories')
    .select('id')
    .eq('id', storyId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!story) throw new Error('Story not found');

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (meta.environment) payload.environment = meta.environment;
  if (meta.characters) payload.characters = meta.characters;
  if (meta.isImmersive !== undefined) payload.is_immersive = meta.isImmersive;
  if (meta.animationData) payload.animation_data = meta.animationData;
  if (meta.videoUrl !== undefined) payload.video_url = meta.videoUrl;

  const { data, error } = await supabaseAdmin
    .from('stories')
    .update(payload)
    .eq('id', storyId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  if (meta.characters?.length) {
    await supabaseAdmin.from('story_characters').delete().eq('story_id', storyId);

    const rows = meta.characters.map((c) => ({
      story_id: storyId,
      character_type: c.type,
      character_name: c.name,
      position: c.position,
      mouth_sync_timings: c.mouthSyncTimings ?? [],
    }));

    const { error: charError } = await supabaseAdmin.from('story_characters').insert(rows);
    if (charError && !charError.message.includes('does not exist')) {
      console.warn('story_characters insert:', charError.message);
    }
  }

  return extractImmersiveMeta(data as Record<string, unknown>);
}

export async function getFullImmersiveStory(storyId: string, householdId: string) {
  const { data: storyRow, error } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error || !storyRow) return null;

  let characters = parseCharacters(storyRow.characters);
  if (characters.length === 0) {
    characters = await getStoryCharactersFromDb(storyId);
  }

  const meta = extractImmersiveMeta(storyRow as Record<string, unknown>);
  meta.characters = characters.length > 0 ? characters : meta.characters;

  return meta;
}
