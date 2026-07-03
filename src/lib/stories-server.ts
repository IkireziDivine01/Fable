import { supabaseAdmin } from './supabase-admin';
import { listHouseholdLearners } from './auth-server';
import type {
  StoryGenerationType,
  StorySentenceInput,
  StorySentenceRecord,
  StoryRecord,
  StoryStatus,
} from './storyHelpers';

function mapStory(row: Record<string, unknown>): StoryRecord {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    author_id: String(row.author_id),
    title: String(row.title),
    status: row.status as StoryStatus,
    transcript: (row.transcript as string) ?? null,
    audio_url: (row.audio_url as string) ?? null,
    generation_type: (row.generation_type as StoryGenerationType) ?? null,
    source: (row.source as string) ?? null,
    themes: Array.isArray(row.themes) ? (row.themes as string[]) : null,
    environment: (row.environment as string) ?? null,
    characters: row.characters ?? null,
    video_url: (row.video_url as string) ?? null,
    is_immersive: row.is_immersive != null ? Boolean(row.is_immersive) : null,
    animation_data: row.animation_data ?? null,
    created_at: String(row.created_at),
    updated_at: (row.updated_at as string) ?? null,
  };
}

function mapSentence(row: Record<string, unknown>): StorySentenceRecord {
  return {
    id: String(row.id),
    story_id: String(row.story_id),
    sentence_text: String(row.sentence_text),
    sentence_order: Number(row.sentence_order),
    kinyarwanda_text: (row.kinyarwanda_text as string) ?? null,
    theme_label: (row.theme_label as string) ?? null,
    elder_talking_points: (row.elder_talking_points as string) ?? null,
    child_prompt: (row.child_prompt as string) ?? null,
    audio_url: (row.audio_url as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  };
}

export async function createStoryWithSentences(input: {
  householdId: string;
  authorId: string;
  title: string;
  transcript: string;
  generationType: StoryGenerationType;
  themes: string[];
  sentences: StorySentenceInput[];
  status?: StoryStatus;
  audioUrl?: string;
  source?: string;
}) {
  const status = input.status ?? 'draft';
  const now = new Date().toISOString();

  const storyInsert: Record<string, unknown> = {
    household_id: input.householdId,
    author_id: input.authorId,
    title: input.title,
    status,
    transcript: input.transcript,
    created_at: now,
    updated_at: now,
  };

  if (input.audioUrl) storyInsert.audio_url = input.audioUrl;
  if (input.source) storyInsert.source = input.source;

  let storyRow: Record<string, unknown> | null = null;
  let storyError: { message: string } | null = null;

  const extendedInsert = {
    ...storyInsert,
    generation_type: input.generationType,
    themes: input.themes,
  };

  const extendedResult = await supabaseAdmin
    .from('stories')
    .insert([extendedInsert])
    .select('*')
    .single();

  if (extendedResult.error) {
    const fallbackResult = await supabaseAdmin
      .from('stories')
      .insert([storyInsert])
      .select('*')
      .single();
    storyRow = fallbackResult.data as Record<string, unknown> | null;
    storyError = fallbackResult.error;
  } else {
    storyRow = extendedResult.data as Record<string, unknown>;
  }

  if (storyError || !storyRow) {
    const msg = storyError?.message ?? 'Failed to create story';
    if (msg.includes('stories_author_id_fkey')) {
      throw new Error(
        'Your account is not linked in the database. Sign out and sign in again. If this persists, run supabase/stories_schema.sql in the Supabase SQL Editor.'
      );
    }
    throw new Error(msg);
  }

  const story = mapStory(storyRow as Record<string, unknown>);

  const sentenceRows = input.sentences.map((sentence) => ({
    story_id: story.id,
    sentence_text: sentence.sentenceText,
    sentence_order: sentence.sentenceOrder,
    kinyarwanda_text: sentence.kinyarwandaText ?? null,
    theme_label: sentence.themeLabel ?? null,
    elder_talking_points: sentence.elderTalkingPoints ?? null,
    child_prompt: sentence.childPrompt ?? null,
    audio_url: sentence.audioUrl ?? null,
    created_at: now,
  }));

  const { data: insertedSentences, error: sentenceError } = await supabaseAdmin
    .from('story_sentences')
    .insert(sentenceRows)
    .select('*');

  if (sentenceError) {
    await supabaseAdmin.from('stories').delete().eq('id', story.id);
    throw new Error(sentenceError.message);
  }

  const sentences = (insertedSentences ?? []).map((row) =>
    mapSentence(row as Record<string, unknown>)
  );

  return { story, sentences };
}

export async function getStoryById(storyId: string) {
  const { data: storyRow, error } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .maybeSingle();

  if (error || !storyRow) return null;

  const { data: sentenceRows } = await supabaseAdmin
    .from('story_sentences')
    .select('*')
    .eq('story_id', storyId)
    .order('sentence_order', { ascending: true });

  return {
    story: mapStory(storyRow as Record<string, unknown>),
    sentences: (sentenceRows ?? []).map((row) => mapSentence(row as Record<string, unknown>)),
  };
}

export async function listStoriesForHousehold(
  householdId: string,
  options?: { publishedOnly?: boolean }
) {
  let query = supabaseAdmin
    .from('stories')
    .select('id, title, status, created_at, author_id, generation_type, source, themes, transcript, is_immersive, environment')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (options?.publishedOnly) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function publishStory(storyId: string, householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('stories')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', storyId)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to publish story');
  return mapStory(data as Record<string, unknown>);
}

export async function updateStorySentences(
  storyId: string,
  householdId: string,
  sentences: StorySentenceInput[]
) {
  const existing = await getStoryById(storyId);
  if (!existing || existing.story.household_id !== householdId) {
    throw new Error('Story not found');
  }

  const audioByOrder = new Map(
    existing.sentences.map((s) => [s.sentence_order, s.audio_url ?? null])
  );
  const audioById = new Map(existing.sentences.map((s) => [s.id, s.audio_url ?? null]));

  await supabaseAdmin.from('story_sentences').delete().eq('story_id', storyId);

  const now = new Date().toISOString();
  const rows = sentences.map((sentence, index) => {
    const order = sentence.sentenceOrder ?? index;
    const preservedAudio =
      sentence.audioUrl ??
      (sentence.id ? audioById.get(sentence.id) : null) ??
      audioByOrder.get(order) ??
      null;

    return {
      story_id: storyId,
      sentence_text: sentence.sentenceText,
      sentence_order: order,
      kinyarwanda_text: sentence.kinyarwandaText ?? null,
      theme_label: sentence.themeLabel ?? null,
      elder_talking_points: sentence.elderTalkingPoints ?? null,
      child_prompt: sentence.childPrompt ?? null,
      audio_url: preservedAudio,
      created_at: now,
    };
  });

  const { data, error } = await supabaseAdmin.from('story_sentences').insert(rows).select('*');
  if (error) throw new Error(error.message);

  const transcript = sentences.map((s) => s.sentenceText).join(' ');
  await supabaseAdmin
    .from('stories')
    .update({ transcript, updated_at: now })
    .eq('id', storyId);

  return (data ?? []).map((row) => mapSentence(row as Record<string, unknown>));
}

export async function updateStoryDraft(
  storyId: string,
  householdId: string,
  patch: { title?: string; transcript?: string; audioUrl?: string; source?: string }
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title) payload.title = patch.title;
  if (patch.transcript) payload.transcript = patch.transcript;
  if (patch.audioUrl) payload.audio_url = patch.audioUrl;
  if (patch.source !== undefined) payload.source = patch.source || null;

  const { data, error } = await supabaseAdmin
    .from('stories')
    .update(payload)
    .eq('id', storyId)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update story');
  return mapStory(data as Record<string, unknown>);
}

export async function logStoryActivity(input: {
  householdId: string;
  actorId: string;
  storyId: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED';
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('interaction_logs').insert([
    {
      household_id: input.householdId,
      actor_id: input.actorId,
      story_id: input.storyId,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
      timestamp: new Date().toISOString(),
    },
  ]);

  if (error) {
    // Table may not exist yet — log silently in dev
    console.warn('Could not log activity:', error.message);
  }
}

export interface ReadingActivityItem {
  id: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED';
  timestamp: string;
}

export interface HouseholdReadingSummary {
  learners: {
    id: string;
    name: string;
    storiesReadThisWeek: number;
    accountStatus?: string;
  }[];
  recentActivity: ReadingActivityItem[];
  totalReadsThisWeek: number;
}

export async function getHouseholdReadingActivity(
  householdId: string
): Promise<HouseholdReadingSummary> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const householdLearners = await listHouseholdLearners(householdId);

  const { data: logs, error: logsError } = await supabaseAdmin
    .from('interaction_logs')
    .select('id, actor_id, story_id, event_type, timestamp')
    .eq('household_id', householdId)
    .in('event_type', ['STORY_STARTED', 'STORY_COMPLETED'])
    .order('timestamp', { ascending: false })
    .limit(40);

  if (logsError) {
    console.warn('Could not load reading activity:', logsError.message);
  }

  const rows = logs ?? [];
  const actorIds = [...new Set(rows.map((r) => String(r.actor_id)))];
  const storyIds = [
    ...new Set(rows.filter((r) => r.story_id).map((r) => String(r.story_id))),
  ];

  const [{ data: profiles }, { data: stories }] = await Promise.all([
    actorIds.length
      ? supabaseAdmin.from('user_profiles').select('id, name, role').in('id', actorIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    storyIds.length
      ? supabaseAdmin.from('stories').select('id, title').in('id', storyIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [String(p.id), { name: String(p.name ?? 'Learner'), role: String(p.role) }])
  );
  const storyMap = new Map((stories ?? []).map((s) => [String(s.id), String(s.title)]));

  const learners = householdLearners.map((kid) => {
    const row = kid as Record<string, unknown>;
    const kidId = String(row.id);
    const completedThisWeek = rows.filter(
      (r) =>
        String(r.actor_id) === kidId &&
        r.event_type === 'STORY_COMPLETED' &&
        new Date(String(r.timestamp)) >= weekStart
    ).length;
    return {
      id: kidId,
      name: String(row.name ?? 'Learner'),
      storiesReadThisWeek: completedThisWeek,
      accountStatus: row.account_status ? String(row.account_status) : 'active',
    };
  });

  const recentActivity: ReadingActivityItem[] = rows.map((row) => {
    const actorId = String(row.actor_id);
    const profile = profileMap.get(actorId);
    const storyId = row.story_id ? String(row.story_id) : null;
    return {
      id: String(row.id),
      kidId: actorId,
      kidName: profile?.name ?? 'Learner',
      storyId,
      storyTitle: storyId ? (storyMap.get(storyId) ?? 'Untitled story') : 'Untitled story',
      eventType: row.event_type as 'STORY_STARTED' | 'STORY_COMPLETED',
      timestamp: String(row.timestamp),
    };
  });

  const totalReadsThisWeek = rows.filter(
    (r) => r.event_type === 'STORY_COMPLETED' && new Date(String(r.timestamp)) >= weekStart
  ).length;

  return { learners, recentActivity, totalReadsThisWeek };
}
