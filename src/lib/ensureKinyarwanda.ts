import type { StorySentenceInput } from '@/lib/storyHelpers';

/** Fill missing Kinyarwanda lines via /api/translate before create/save. */
export async function ensureKinyarwandaOnSentences(
  sentences: StorySentenceInput[]
): Promise<StorySentenceInput[]> {
  const missingIndexes = sentences
    .map((s, i) => (!s.kinyarwandaText?.trim() ? i : -1))
    .filter((i) => i >= 0);

  if (missingIndexes.length === 0) return sentences;

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: missingIndexes.map((i) => sentences[i].sentenceText),
      target: 'rw',
    }),
  });
  const data = (await res.json()) as { translations?: string[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not generate Kinyarwanda translations');
  }

  const translations = data.translations ?? [];
  return sentences.map((sentence, index) => {
    const missAt = missingIndexes.indexOf(index);
    if (missAt < 0) return sentence;
    const rw = translations[missAt]?.trim();
    if (!rw) {
      throw new Error(`Kinyarwanda is required for sentence ${index + 1}.`);
    }
    return { ...sentence, kinyarwandaText: rw };
  });
}
