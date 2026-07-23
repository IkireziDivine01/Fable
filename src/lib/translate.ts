/**
 * Translate story lines between English and Kinyarwanda for bilingual drafts.
 */

const MAX_LINES = 24;
const MAX_CHARS_PER_LINE = 1200;

export type TranslateTarget = 'rw' | 'en';

async function translateChunk(texts: string[], target: TranslateTarget): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const cleaned = texts.map((t) => String(t ?? '').trim().slice(0, MAX_CHARS_PER_LINE));
  if (cleaned.length === 0) return [];

  const toLabel = target === 'rw' ? 'Kinyarwanda (Ikinyarwanda)' : 'English';
  const system =
    target === 'rw'
      ? `You translate children's story lines into natural, warm Ikinyarwanda for ages 6–12.
Keep meaning, tone, and character names. Return ONLY valid JSON: {"translations":["..."]}
with the same number of strings, same order, no commentary.`
      : `You translate children's story lines from Ikinyarwanda into clear, warm English for ages 6–12.
Keep meaning, tone, and character names. Return ONLY valid JSON: {"translations":["..."]}
with the same number of strings, same order, no commentary.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages: [
        {
          role: 'user',
          content: `Translate each line to ${toLabel}:\n${JSON.stringify(cleaned)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Translate failed (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((b) => b.type === 'text')?.text?.trim() ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Translate returned no JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as { translations?: unknown };
  const translations = Array.isArray(parsed.translations) ? parsed.translations : [];

  return cleaned.map((original, i) => {
    const value = translations[i];
    const translated = typeof value === 'string' ? value.trim() : '';
    return translated || original;
  });
}

/** Translate lines to `rw` or `en`, batching when there are many sentences. */
export async function translateLines(
  texts: string[],
  target: TranslateTarget = 'rw'
): Promise<string[]> {
  const cleaned = texts.map((t) => String(t ?? '').trim().slice(0, MAX_CHARS_PER_LINE));
  if (cleaned.length === 0) return [];

  const results: string[] = [];
  for (let i = 0; i < cleaned.length; i += MAX_LINES) {
    const chunk = cleaned.slice(i, i + MAX_LINES);
    results.push(...(await translateChunk(chunk, target)));
  }
  return results;
}

export async function translateLinesToKinyarwanda(texts: string[]): Promise<string[]> {
  return translateLines(texts, 'rw');
}

export async function translateLinesToEnglish(texts: string[]): Promise<string[]> {
  return translateLines(texts, 'en');
}
