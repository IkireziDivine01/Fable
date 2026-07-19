import { supabaseAdmin } from './supabase-admin';

export interface KidQuestionRecord {
  id: string;
  householdId: string;
  kidId: string;
  kidName: string;
  storyId: string | null;
  storyTitle: string | null;
  sentenceId: string | null;
  sentenceOrder: number | null;
  questionText: string;
  answerText: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
}

function mapQuestion(
  row: Record<string, unknown>,
  names: { kidName?: string; storyTitle?: string | null } = {}
): KidQuestionRecord {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    kidId: String(row.kid_id),
    kidName: names.kidName ?? 'Learner',
    storyId: row.story_id != null ? String(row.story_id) : null,
    storyTitle: names.storyTitle ?? null,
    sentenceId: row.sentence_id != null ? String(row.sentence_id) : null,
    sentenceOrder: row.sentence_order != null ? Number(row.sentence_order) : null,
    questionText: String(row.question_text),
    answerText: row.answer_text != null ? String(row.answer_text) : null,
    answeredBy: row.answered_by != null ? String(row.answered_by) : null,
    answeredAt: row.answered_at != null ? String(row.answered_at) : null,
    createdAt: String(row.created_at),
  };
}

export async function createKidQuestion(input: {
  householdId: string;
  kidId: string;
  storyId: string;
  sentenceId?: string | null;
  sentenceOrder?: number | null;
  questionText: string;
}) {
  const text = input.questionText.trim();
  if (text.length < 3) throw new Error('Please write a little more for your question.');
  if (text.length > 500) throw new Error('That question is a bit too long.');

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('kid_questions')
    .insert([
      {
        household_id: input.householdId,
        kid_id: input.kidId,
        story_id: input.storyId,
        sentence_id: input.sentenceId ?? null,
        sentence_order: input.sentenceOrder ?? null,
        question_text: text,
        created_at: now,
      },
    ])
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save question');

  await supabaseAdmin.from('interaction_logs').insert([
    {
      household_id: input.householdId,
      actor_id: input.kidId,
      story_id: input.storyId,
      event_type: 'QUESTION_ASKED',
      metadata: {
        questionId: data.id,
        sentenceOrder: input.sentenceOrder ?? null,
      },
      created_at: now,
    },
  ]);

  return mapQuestion(data as Record<string, unknown>);
}

export async function listHouseholdQuestions(
  householdId: string,
  options?: { unansweredOnly?: boolean; limit?: number }
): Promise<KidQuestionRecord[]> {
  let query = supabaseAdmin
    .from('kid_questions')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.unansweredOnly) {
    query = query.is('answer_text', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const kidIds = [...new Set(rows.map((r) => String(r.kid_id)))];
  const storyIds = [
    ...new Set(rows.filter((r) => r.story_id).map((r) => String(r.story_id))),
  ];

  const [{ data: profiles }, { data: stories }] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('id, name').in('id', kidIds),
    storyIds.length
      ? supabaseAdmin.from('stories').select('id, title').in('id', storyIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [String(p.id), String(p.name ?? 'Learner')])
  );
  const storyMap = new Map(
    (stories ?? []).map((s) => [String(s.id), String(s.title)])
  );

  return rows.map((row) =>
    mapQuestion(row, {
      kidName: nameMap.get(String(row.kid_id)),
      storyTitle: row.story_id ? storyMap.get(String(row.story_id)) ?? null : null,
    })
  );
}

export async function answerKidQuestion(input: {
  questionId: string;
  householdId: string;
  answeredBy: string;
  answerText: string;
}) {
  const answer = input.answerText.trim();
  if (answer.length < 2) throw new Error('Please write an answer.');
  if (answer.length > 2000) throw new Error('That answer is a bit too long.');

  const { data, error } = await supabaseAdmin
    .from('kid_questions')
    .update({
      answer_text: answer,
      answered_by: input.answeredBy,
      answered_at: new Date().toISOString(),
    })
    .eq('id', input.questionId)
    .eq('household_id', input.householdId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save answer');
  return mapQuestion(data as Record<string, unknown>);
}

export async function listKidQuestionsForStory(
  kidId: string,
  storyId: string
): Promise<KidQuestionRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('kid_questions')
    .select('*')
    .eq('kid_id', kidId)
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapQuestion(row as Record<string, unknown>));
}
