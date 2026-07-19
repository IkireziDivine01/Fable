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
    speaker: (row.speaker as string) ?? null,
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
    speaker: sentence.speaker ?? null,
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
      speaker: sentence.speaker ?? null,
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

export type StoryReadStatus = 'new' | 'reading' | 'completed';

/** Stories published within this window get a “just in” mark when still unread. */
const FRESH_STORY_DAYS = 14;

export interface KidLibraryStory {
  id: string;
  title: string;
  status: string;
  generation_type?: string | null;
  is_immersive?: boolean | null;
  created_at: string;
  themes?: string[] | null;
  readStatus: StoryReadStatus;
  /** Unread and published within the last FRESH_STORY_DAYS. */
  isFresh: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

function isFreshPublished(createdAt: string, now = Date.now()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= FRESH_STORY_DAYS * 24 * 60 * 60 * 1000;
}

function readStatusFromMaps(
  storyId: string,
  startedAt: Map<string, string>,
  completedAt: Map<string, string>
): StoryReadStatus {
  if (completedAt.has(storyId)) return 'completed';
  if (startedAt.has(storyId)) return 'reading';
  return 'new';
}

function collectProgressMaps(
  logs: { story_id?: unknown; event_type?: unknown; created_at?: unknown }[]
) {
  const startedAt = new Map<string, string>();
  const completedAt = new Map<string, string>();

  for (const row of logs) {
    if (!row.story_id) continue;
    const storyId = String(row.story_id);
    const ts = String(row.created_at ?? '');
    if (row.event_type === 'STORY_COMPLETED' && !completedAt.has(storyId)) {
      completedAt.set(storyId, ts);
    }
    if (row.event_type === 'STORY_STARTED' && !startedAt.has(storyId)) {
      startedAt.set(storyId, ts);
    }
  }

  return { startedAt, completedAt };
}

export async function logStoryActivity(input: {
  householdId: string;
  actorId: string;
  storyId: string;
  eventType:
    | 'STORY_STARTED'
    | 'STORY_COMPLETED'
    | 'ACTIVITY_STARTED'
    | 'ACTIVITY_COMPLETED';
  metadata?: Record<string, unknown>;
}) {
  const baseRow = {
    id: crypto.randomUUID(),
    household_id: input.householdId,
    actor_id: input.actorId,
    story_id: input.storyId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
    synced_to_cloud: false,
    created_at: new Date().toISOString(),
  };

  let { error } = await supabaseAdmin.from('interaction_logs').insert([baseRow]);

  // Older DBs may lack optional columns — strip and retry.
  if (error?.message?.includes('created_at') || error?.message?.includes('synced_to_cloud')) {
    const { created_at: _c, synced_to_cloud: _s, ...withoutOptional } = baseRow;
    const retry = await supabaseAdmin.from('interaction_logs').insert([withoutOptional]);
    if (!retry.error) return;
    error = retry.error;
  }

  if (error) {
    const hint = error.message.includes('actor_id_fkey')
      ? ' Re-run supabase/fix_interaction_logs_actor_fk.sql (actor_id must reference user_profiles).'
      : error.message.includes('interaction_logs') || error.message.includes('created_at')
        ? ' Re-run supabase/fix_interaction_logs_actor_fk.sql.'
        : '';
    throw new Error(`${error.message}.${hint}`);
  }
}

/** Current shelf status for one kid + story (new / reading / completed). */
export async function getKidStoryReadStatus(
  householdId: string,
  kidId: string,
  storyId: string
): Promise<StoryReadStatus> {
  const { data, error } = await supabaseAdmin
    .from('interaction_logs')
    .select('event_type')
    .eq('household_id', householdId)
    .eq('actor_id', kidId)
    .eq('story_id', storyId)
    .in('event_type', ['STORY_STARTED', 'STORY_COMPLETED'])
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  const events = new Set((data ?? []).map((row) => String(row.event_type)));
  if (events.has('STORY_COMPLETED')) return 'completed';
  if (events.has('STORY_STARTED')) return 'reading';
  return 'new';
}

/**
 * Persist reading events for the parent dashboard + kid shelf.
 * STORY_STARTED is idempotent (first open only). Completions always log so re-reads count.
 */
export async function recordKidReadingEvent(input: {
  householdId: string;
  actorId: string;
  storyId: string;
  eventType:
    | 'STORY_STARTED'
    | 'STORY_COMPLETED'
    | 'ACTIVITY_STARTED'
    | 'ACTIVITY_COMPLETED';
  metadata?: Record<string, unknown>;
}): Promise<{ logged: boolean; readStatus: StoryReadStatus }> {
  if (input.eventType === 'ACTIVITY_STARTED' || input.eventType === 'ACTIVITY_COMPLETED') {
    await logStoryActivity(input);
    const readStatus = await getKidStoryReadStatus(
      input.householdId,
      input.actorId,
      input.storyId
    );
    return { logged: true, readStatus };
  }

  const current = await getKidStoryReadStatus(
    input.householdId,
    input.actorId,
    input.storyId
  );

  if (input.eventType === 'STORY_STARTED') {
    if (current !== 'new') {
      return { logged: false, readStatus: current };
    }
    await logStoryActivity(input);
    return { logged: true, readStatus: 'reading' };
  }

  // STORY_COMPLETED — always record (re-reads still matter for weekly activity)
  await logStoryActivity(input);
  return { logged: true, readStatus: 'completed' };
}

/** Per-kid story shelf with new / reading / completed from the same logs parents see. */
export async function getKidLibraryWithProgress(
  householdId: string,
  kidId: string
): Promise<KidLibraryStory[]> {
  const stories = await listStoriesForHousehold(householdId, { publishedOnly: true });

  const { data: logs, error } = await supabaseAdmin
    .from('interaction_logs')
    .select('story_id, event_type, created_at')
    .eq('household_id', householdId)
    .eq('actor_id', kidId)
    .in('event_type', ['STORY_STARTED', 'STORY_COMPLETED'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      error.message.includes('interaction_logs') || error.message.includes('created_at')
        ? `${error.message}. Re-run supabase/stories_schema.sql to add interaction_logs.created_at.`
        : error.message
    );
  }

  const { startedAt, completedAt } = collectProgressMaps(logs ?? []);
  const now = Date.now();

  const shelf = stories.map((story) => {
    const row = story as Record<string, unknown>;
    const id = String(row.id);
    const createdAt = String(row.created_at);
    const readStatus = readStatusFromMaps(id, startedAt, completedAt);

    return {
      id,
      title: String(row.title),
      status: String(row.status),
      generation_type: (row.generation_type as string) ?? null,
      is_immersive: row.is_immersive != null ? Boolean(row.is_immersive) : null,
      created_at: createdAt,
      themes: Array.isArray(row.themes) ? (row.themes as string[]) : null,
      readStatus,
      isFresh: readStatus === 'new' && isFreshPublished(createdAt, now),
      startedAt: startedAt.get(id) ?? null,
      completedAt: completedAt.get(id) ?? null,
    };
  });

  // Reading first, then fresh new, then other unread, then finished
  const rank = (s: KidLibraryStory) => {
    if (s.readStatus === 'reading') return 0;
    if (s.readStatus === 'new' && s.isFresh) return 1;
    if (s.readStatus === 'new') return 2;
    return 3;
  };

  return shelf.sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export interface ReadingActivityItem {
  id: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string;
  eventType: 'STORY_STARTED' | 'STORY_COMPLETED' | 'QUESTION_ASKED';
  timestamp: string;
}

export interface LearnerShelfCounts {
  /** Never opened (includes fresh “new” stories). */
  unread: number;
  /** Unread and published in the last FRESH_STORY_DAYS. */
  fresh: number;
  reading: number;
  completed: number;
  published: number;
}

export interface HouseholdReadingSummary {
  learners: {
    id: string;
    name: string;
    storiesReadThisWeek: number;
    storiesStartedThisWeek: number;
    storiesCompletedTotal: number;
    storiesInProgress: number;
    shelf: LearnerShelfCounts;
    lastActiveAt: string | null;
    accountStatus?: string;
  }[];
  recentActivity: ReadingActivityItem[];
  totalReadsThisWeek: number;
  totalStartsThisWeek: number;
  activeLearnersThisWeek: number;
  /** Sum of each learner’s shelf (same story can count once per learner). */
  shelfTotals: LearnerShelfCounts;
  /** Published in the last FRESH_STORY_DAYS (unique stories). */
  freshPublishedCount: number;
  dailyCompletions: { date: string; label: string; count: number }[];
  topStories: { storyId: string; title: string; completions: number }[];
  unansweredQuestions: number;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function uniqueStoryIds(
  rows: { actor_id?: unknown; story_id?: unknown; event_type?: unknown }[],
  eventType: string,
  kidId?: string
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.event_type !== eventType || !row.story_id) continue;
    if (kidId && String(row.actor_id) !== kidId) continue;
    ids.add(String(row.story_id));
  }
  return ids;
}

function emptyShelfCounts(published = 0): LearnerShelfCounts {
  return { unread: 0, fresh: 0, reading: 0, completed: 0, published };
}

function shelfCountsForKid(
  publishedStories: { id: string; created_at: string }[],
  startedAt: Map<string, string>,
  completedAt: Map<string, string>,
  now = Date.now()
): LearnerShelfCounts {
  const shelf = emptyShelfCounts(publishedStories.length);
  for (const story of publishedStories) {
    const status = readStatusFromMaps(story.id, startedAt, completedAt);
    if (status === 'completed') shelf.completed += 1;
    else if (status === 'reading') shelf.reading += 1;
    else {
      shelf.unread += 1;
      if (isFreshPublished(story.created_at, now)) shelf.fresh += 1;
    }
  }
  return shelf;
}

export async function getHouseholdReadingActivity(
  householdId: string
): Promise<HouseholdReadingSummary> {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [householdLearners, publishedRows] = await Promise.all([
    listHouseholdLearners(householdId),
    listStoriesForHousehold(householdId, { publishedOnly: true }),
  ]);

  const publishedStories = publishedRows.map((row) => {
    const r = row as Record<string, unknown>;
    return { id: String(r.id), created_at: String(r.created_at), title: String(r.title) };
  });
  const publishedIds = new Set(publishedStories.map((s) => s.id));

  // Full reading history for accurate shelf + weekly stats (not capped with questions).
  const { data: readingLogs, error: readingError } = await supabaseAdmin
    .from('interaction_logs')
    .select('id, actor_id, story_id, event_type, created_at')
    .eq('household_id', householdId)
    .in('event_type', ['STORY_STARTED', 'STORY_COMPLETED'])
    .order('created_at', { ascending: false });

  if (readingError) {
    throw new Error(
      readingError.message.includes('interaction_logs') ||
        readingError.message.includes('created_at')
        ? `${readingError.message}. Re-run supabase/stories_schema.sql to add interaction_logs.created_at.`
        : readingError.message
    );
  }

  const { data: feedLogs, error: feedError } = await supabaseAdmin
    .from('interaction_logs')
    .select('id, actor_id, story_id, event_type, created_at')
    .eq('household_id', householdId)
    .in('event_type', ['STORY_STARTED', 'STORY_COMPLETED', 'QUESTION_ASKED'])
    .order('created_at', { ascending: false })
    .limit(40);

  if (feedError) {
    console.warn('Could not load activity feed:', feedError.message);
  }

  const readingRows = readingLogs ?? [];
  const feedRows = feedLogs ?? [];
  const weekRows = readingRows.filter((r) => new Date(String(r.created_at)) >= weekStart);

  let unansweredQuestions = 0;
  try {
    const qRes = await supabaseAdmin
      .from('kid_questions')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .is('answer_text', null);
    if (!qRes.error) unansweredQuestions = qRes.count ?? 0;
  } catch {
    // Tables may not exist until kid_questions_schema.sql is applied
  }

  const actorIds = [
    ...new Set([
      ...householdLearners.map((kid) => String((kid as Record<string, unknown>).id)),
      ...feedRows.map((r) => String(r.actor_id)),
      ...readingRows.map((r) => String(r.actor_id)),
    ]),
  ];
  const storyIds = [
    ...new Set([
      ...publishedStories.map((s) => s.id),
      ...feedRows.filter((r) => r.story_id).map((r) => String(r.story_id)),
    ]),
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
  for (const s of publishedStories) {
    if (!storyMap.has(s.id)) storyMap.set(s.id, s.title);
  }

  const now = Date.now();
  // Per-kid maps from full history (oldest→newest so first timestamps stick)
  const progressByKid = new Map<string, ReturnType<typeof collectProgressMaps>>();
  const chronological = [...readingRows].reverse();
  for (const row of chronological) {
    if (!row.story_id) continue;
    const kidId = String(row.actor_id);
    const storyId = String(row.story_id);
    if (!publishedIds.has(storyId)) continue;
    let maps = progressByKid.get(kidId);
    if (!maps) {
      maps = { startedAt: new Map(), completedAt: new Map() };
      progressByKid.set(kidId, maps);
    }
    const ts = String(row.created_at);
    if (row.event_type === 'STORY_STARTED' && !maps.startedAt.has(storyId)) {
      maps.startedAt.set(storyId, ts);
    }
    if (row.event_type === 'STORY_COMPLETED' && !maps.completedAt.has(storyId)) {
      maps.completedAt.set(storyId, ts);
    }
  }

  const learners = householdLearners.map((kid) => {
    const row = kid as Record<string, unknown>;
    const kidId = String(row.id);
    const completedThisWeek = uniqueStoryIds(weekRows, 'STORY_COMPLETED', kidId).size;
    const startedThisWeek = uniqueStoryIds(weekRows, 'STORY_STARTED', kidId).size;
    const maps = progressByKid.get(kidId) ?? { startedAt: new Map(), completedAt: new Map() };
    const shelf = shelfCountsForKid(publishedStories, maps.startedAt, maps.completedAt, now);
    const lastEvent =
      feedRows.find((r) => String(r.actor_id) === kidId) ??
      readingRows.find((r) => String(r.actor_id) === kidId);
    return {
      id: kidId,
      name: String(row.name ?? 'Learner'),
      storiesReadThisWeek: completedThisWeek,
      storiesStartedThisWeek: startedThisWeek,
      storiesCompletedTotal: shelf.completed,
      storiesInProgress: shelf.reading,
      shelf,
      lastActiveAt: lastEvent ? String(lastEvent.created_at) : null,
      accountStatus: row.account_status ? String(row.account_status) : 'active',
    };
  });

  const activeLearners = learners.filter((l) => l.accountStatus !== 'pending');
  const shelfTotals = activeLearners.reduce<LearnerShelfCounts>(
    (acc, learner) => ({
      unread: acc.unread + learner.shelf.unread,
      fresh: acc.fresh + learner.shelf.fresh,
      reading: acc.reading + learner.shelf.reading,
      completed: acc.completed + learner.shelf.completed,
      published: Math.max(acc.published, learner.shelf.published),
    }),
    emptyShelfCounts(publishedStories.length)
  );
  shelfTotals.published = publishedStories.length;

  const recentActivity: ReadingActivityItem[] = feedRows.slice(0, 24).map((row) => {
    const actorId = String(row.actor_id);
    const profile = profileMap.get(actorId);
    const storyId = row.story_id ? String(row.story_id) : null;
    const eventType = String(row.event_type) as ReadingActivityItem['eventType'];
    let storyTitle = storyId ? (storyMap.get(storyId) ?? 'Untitled story') : 'Untitled story';
    if (eventType === 'QUESTION_ASKED') {
      storyTitle = storyId
        ? `Asked about “${storyMap.get(storyId) ?? 'a story'}”`
        : 'Asked a question';
    }
    return {
      id: String(row.id),
      kidId: actorId,
      kidName: profile?.name ?? 'Learner',
      storyId,
      storyTitle,
      eventType,
      timestamp: String(row.created_at),
    };
  });

  // Unique kid+story completions this week — matches what kids see as "completed"
  const weekCompletionKeys = new Set<string>();
  for (const row of weekRows) {
    if (row.event_type !== 'STORY_COMPLETED' || !row.story_id) continue;
    weekCompletionKeys.add(`${row.actor_id}:${row.story_id}`);
  }
  const weekStartKeys = new Set<string>();
  for (const row of weekRows) {
    if (row.event_type !== 'STORY_STARTED' || !row.story_id) continue;
    weekStartKeys.add(`${row.actor_id}:${row.story_id}`);
  }

  const totalReadsThisWeek = weekCompletionKeys.size;
  const totalStartsThisWeek = weekStartKeys.size;
  const activeLearnersThisWeek = new Set(weekRows.map((r) => String(r.actor_id))).size;

  const dailyCompletions = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = dayKey(date);
    const dayKeys = new Set<string>();
    for (const r of weekRows) {
      if (r.event_type !== 'STORY_COMPLETED' || !r.story_id) continue;
      if (dayKey(new Date(String(r.created_at))) !== key) continue;
      dayKeys.add(`${r.actor_id}:${r.story_id}`);
    }
    return {
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count: dayKeys.size,
    };
  });

  // Unique kids who finished each story this week (not duplicate finish events)
  const storyKidFinishes = new Map<string, Set<string>>();
  for (const row of weekRows) {
    if (row.event_type !== 'STORY_COMPLETED' || !row.story_id) continue;
    const id = String(row.story_id);
    if (!storyKidFinishes.has(id)) storyKidFinishes.set(id, new Set());
    storyKidFinishes.get(id)!.add(String(row.actor_id));
  }
  const topStories = [...storyKidFinishes.entries()]
    .map(([storyId, kids]) => ({
      storyId,
      title: storyMap.get(storyId) ?? 'Untitled story',
      completions: kids.size,
    }))
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 5);

  const freshPublishedCount = publishedStories.filter((s) =>
    isFreshPublished(s.created_at, now)
  ).length;

  return {
    learners,
    recentActivity,
    totalReadsThisWeek,
    totalStartsThisWeek,
    activeLearnersThisWeek,
    shelfTotals,
    freshPublishedCount,
    dailyCompletions,
    topStories,
    unansweredQuestions,
  };
}
