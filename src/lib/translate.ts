/**
 * Translate story lines into Kinyarwanda for kid playback when a story
 * was saved without kinyarwanda_text.
 */

const MAX_LINES = 24;
const MAX_CHARS_PER_LINE = 1200;

export async function translateLinesToKinyarwanda(texts: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const cleaned = texts
    .slice(0, MAX_LINES)
    .map((t) => String(t ?? '').trim().slice(0, MAX_CHARS_PER_LINE));

  if (cleaned.length === 0) return [];

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
      system: `You translate children's story lines into natural, warm Ikinyarwanda for ages 6–12.
Keep meaning, tone, and character names. Return ONLY valid JSON: {"translations":["..."]}
with the same number of strings, same order, no commentary.`,
      messages: [
        {
          role: 'user',
          content: `Translate each line to Kinyarwanda (Ikinyarwanda):\n${JSON.stringify(cleaned)}`,
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
    const rw = typeof value === 'string' ? value.trim() : '';
    return rw || original;
  });
}
