import { translateLinesToKinyarwanda } from '@/lib/translate';
import { splitTranscriptIntoSentences } from '@/lib/storyHelpers';

type SentenceRow = Record<string, unknown>;

function sentenceEnglish(row: SentenceRow): string {
  return String(row.text ?? row.sentenceText ?? row.sentence_text ?? '').trim();
}

function sentenceKinyarwanda(row: SentenceRow): string {
  return String(row.kinyarwandaText ?? row.kinyarwanda_text ?? '').trim();
}

/**
 * When Claude omits or truncates kinyarwandaText (common on long immersive payloads),
 * fill gaps via the dedicated translate path before validation.
 */
export async function fillMissingKinyarwandaOnPayload(data: unknown): Promise<unknown> {
  if (!data || typeof data !== 'object') return data;

  const obj = { ...(data as Record<string, unknown>) };
  let sentences: SentenceRow[] = Array.isArray(obj.sentences)
    ? obj.sentences.map((item) =>
        item && typeof item === 'object' ? { ...(item as SentenceRow) } : {}
      )
    : [];

  const usable = sentences.filter((row) => sentenceEnglish(row).length > 0);
  if (usable.length === 0) {
    const transcript = String(obj.transcript ?? '').trim();
    if (!transcript) return obj;

    const themes = Array.isArray(obj.themes) ? obj.themes.map(String) : [];
    sentences = splitTranscriptIntoSentences(transcript).map((text, index) => ({
      text,
      theme: themes[0] ?? 'Ubuntu',
      kinyarwandaText: '',
      order: index,
    }));
  }

  const missingIndexes = sentences
    .map((row, index) =>
      sentenceEnglish(row) && !sentenceKinyarwanda(row) ? index : -1
    )
    .filter((index) => index >= 0);

  if (missingIndexes.length === 0) {
    obj.sentences = sentences;
    return obj;
  }

  const translations = await translateLinesToKinyarwanda(
    missingIndexes.map((index) => sentenceEnglish(sentences[index]))
  );

  missingIndexes.forEach((sentenceIndex, translationIndex) => {
    const rw = translations[translationIndex]?.trim();
    if (!rw) return;
    sentences[sentenceIndex] = {
      ...sentences[sentenceIndex],
      kinyarwandaText: rw,
    };
  });

  obj.sentences = sentences;
  return obj;
}
