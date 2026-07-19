import { supabaseAdmin } from './supabase-admin';

export type WaruzikoCategory =
  | 'culture'
  | 'language'
  | 'history'
  | 'values'
  | 'nature'
  | 'food';

export interface WaruzikoFact {
  id: string;
  dayIndex: number;
  titleEn: string;
  titleRw: string | null;
  bodyEn: string;
  bodyRw: string | null;
  category: WaruzikoCategory;
  themeLabel: string | null;
}

function mapFact(row: Record<string, unknown>): WaruzikoFact {
  return {
    id: String(row.id),
    dayIndex: Number(row.day_index),
    titleEn: String(row.title_en),
    titleRw: row.title_rw != null ? String(row.title_rw) : null,
    bodyEn: String(row.body_en),
    bodyRw: row.body_rw != null ? String(row.body_rw) : null,
    category: String(row.category ?? 'culture') as WaruzikoCategory,
    themeLabel: row.theme_label != null ? String(row.theme_label) : null,
  };
}

/** Day-of-year index into the seeded fact cycle (0-based). */
export function waruzikoDayIndex(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, dayOfYear - 1);
}

export async function listWaruzikoFacts(): Promise<WaruzikoFact[]> {
  const { data, error } = await supabaseAdmin
    .from('waruziko_facts')
    .select('*')
    .order('day_index', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapFact(row as Record<string, unknown>));
}

export async function getTodaysWaruzikoFact(date = new Date()): Promise<WaruzikoFact | null> {
  const facts = await listWaruzikoFacts();
  if (facts.length === 0) return null;
  const index = waruzikoDayIndex(date) % facts.length;
  return facts.find((f) => f.dayIndex === index) ?? facts[index] ?? facts[0];
}

export async function recordWaruzikoView(input: {
  householdId: string;
  kidId: string;
  factId: string;
}) {
  const { error } = await supabaseAdmin.from('waruziko_views').upsert(
    [
      {
        household_id: input.householdId,
        kid_id: input.kidId,
        fact_id: input.factId,
        viewed_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'kid_id,fact_id' }
  );

  if (error) {
    console.warn('Could not record Waruziko view:', error.message);
  }

  const { error: logError } = await supabaseAdmin.from('interaction_logs').insert([
    {
      household_id: input.householdId,
      actor_id: input.kidId,
      story_id: null,
      event_type: 'WARUZIKO_VIEWED',
      metadata: { factId: input.factId },
      timestamp: new Date().toISOString(),
    },
  ]);
  if (logError) {
    console.warn('Could not log Waruziko activity:', logError.message);
  }
}

export async function countWaruzikoViewsThisWeek(householdId: string): Promise<number> {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const { count, error } = await supabaseAdmin
    .from('waruziko_views')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .gte('viewed_at', weekStart.toISOString());

  if (error) {
    console.warn('Could not count Waruziko views:', error.message);
    return 0;
  }
  return count ?? 0;
}
