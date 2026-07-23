import type { StorySentenceInput } from '@/lib/storyHelpers';
import { looksLikeKinyarwanda } from '@/lib/languageDetect';

async function translateViaApi(texts: string[], target: 'rw' | 'en'): Promise<string[]> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target }),
  });
  const data = (await res.json()) as { translations?: string[]; error?: string };
  if (!res.ok) {
    throw new Error(
      data.error ||
        (target === 'en'
          ? 'Could not generate English translations'
          : 'Could not generate Kinyarwanda translations')
    );
  }
  return data.translations ?? [];
}

/**
 * Ensure each sentence has English `sentenceText` and Kinyarwanda `kinyarwandaText`.
 * Detects source language: English → fill RW; Kinyarwanda → keep RW and fill English.
 */
export async function ensureKinyarwandaOnSentences(
  sentences: StorySentenceInput[]
): Promise<StorySentenceInput[]> {
  if (sentences.length === 0) return sentences;

  const sample = sentences.map((s) => s.sentenceText).join(' ');
  const sourceIsKinyarwanda = looksLikeKinyarwanda(sample);

  if (sourceIsKinyarwanda) {
    const indexes = sentences
      .map((s, i) => {
        const rw = (s.kinyarwandaText?.trim() || s.sentenceText).trim();
        const enLooksReady =
          Boolean(s.sentenceText?.trim()) &&
          Boolean(s.kinyarwandaText?.trim()) &&
          !looksLikeKinyarwanda(s.sentenceText);
        return rw && !enLooksReady ? i : -1;
      })
      .filter((i) => i >= 0);

    if (indexes.length === 0) return sentences;

    const sources = indexes.map((i) => {
      const s = sentences[i];
      return (s.kinyarwandaText?.trim() || s.sentenceText).trim();
    });
    const translations = await translateViaApi(sources, 'en');

    return sentences.map((sentence, index) => {
      const at = indexes.indexOf(index);
      if (at < 0) return sentence;
      const rw = (sentence.kinyarwandaText?.trim() || sentence.sentenceText).trim();
      const en = translations[at]?.trim();
      if (!en) {
        throw new Error(`English translation is required for sentence ${index + 1}.`);
      }
      return { ...sentence, sentenceText: en, kinyarwandaText: rw };
    });
  }

  const missingIndexes = sentences
    .map((s, i) => (!s.kinyarwandaText?.trim() ? i : -1))
    .filter((i) => i >= 0);

  if (missingIndexes.length === 0) return sentences;

  const translations = await translateViaApi(
    missingIndexes.map((i) => sentences[i].sentenceText),
    'rw'
  );

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
