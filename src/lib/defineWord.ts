import { parseClaudeJson } from './storyHelpers';
import { WORD_SPARK_GUIDE, type WordSparkDefinition } from './immersive/wordSparkGuide';

export type DefineWordInput = {
  word: string;
  sentence: string;
};

export async function defineWordForKids(input: DefineWordInput): Promise<WordSparkDefinition> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const word = String(input.word ?? '').trim().slice(0, 64);
  const sentence = String(input.sentence ?? '').trim().slice(0, 600);

  if (!word) {
    throw new Error('word is required');
  }

  const name = WORD_SPARK_GUIDE.name;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 700,
      system: `You help ${name}, a playful word guide for children ages 5–10 in a Rwandan family storytelling app.
${name} is ${WORD_SPARK_GUIDE.personality}.

Return ONLY valid JSON:
{
  "wordEn":"...",
  "wordRw":"...",
  "meaningEn":"...",
  "meaningRw":"...",
  "whisperEn":"...",
  "whisperRw":"..."
}

Rules:
- wordEn / wordRw: the word in English and natural kid-friendly Kinyarwanda
- meaningEn / meaningRw: VERY short kid lines (max 10 words each). Playful friend voice, NOT a dictionary.
- whisperEn / whisperRw: one playful spoken line AS ${name} in each language (max 16 words). Warm, silly, never scary.
- Always fill ALL six fields.
- No markdown, no commentary outside JSON.`,
      messages: [
        {
          role: 'user',
          content: `Tapped word: "${word}"
Sentence context: "${sentence || '(none)'}"
Give bilingual kid-friendly spark for English AND Kinyarwanda.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Define word failed (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((b) => b.type === 'text')?.text?.trim() ?? '';
  const parsed = parseClaudeJson(text) as Partial<WordSparkDefinition> | null;

  const wordEn = String(parsed?.wordEn ?? word).trim() || word;
  const wordRw = String(parsed?.wordRw ?? word).trim() || word;
  const meaningEn =
    String(parsed?.meaningEn ?? '').trim() || `${wordEn} — a special story word!`;
  const meaningRw =
    String(parsed?.meaningRw ?? '').trim() || `${wordRw} — ijambo ryiza cyane!`;
  const whisperEn =
    String(parsed?.whisperEn ?? '').trim() ||
    `I've got you! "${wordEn}" is a wonderful story word.`;
  const whisperRw =
    String(parsed?.whisperRw ?? '').trim() ||
    `Ndagufasha! "${wordRw}" ni ijambo ryiza cyane.`;

  return { wordEn, wordRw, meaningEn, meaningRw, whisperEn, whisperRw };
}
