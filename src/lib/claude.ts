const STORY_JSON_SCHEMA = `{
  "title": "string",
  "transcript": "string",
  "themes": ["Ubuntu" | "Ubwiyunge" | "Umuganda"],
  "sentences": [
    {
      "text": "string",
      "theme": "Ubuntu" | "Ubwiyunge" | "Umuganda",
      "kinyarwandaText": "optional string",
      "elderTalkingPoints": "optional string",
      "childPrompt": "optional string"
    }
  ]
}`;

export async function callClaude(userPrompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Add it to .env.local to use AI story generation.'
    );
  }

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
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('Claude returned an empty response.');
  return text;
}

export async function generateStoryFromPrompt(prompt: string) {
  const systemPrompt = `You are a children's storyteller preserving Kinyarwanda cultural heritage for families.
Return ONLY valid JSON matching this schema (no markdown outside JSON):
${STORY_JSON_SCHEMA}

Rules:
- Write age-appropriate family stories (ages 6-12)
- Include at least 5 sentences
- Weave in Rwandan cultural values
- Assign each sentence one theme from Ubuntu, Ubwiyunge, or Umuganda
- Include optional childPrompt and elderTalkingPoints where meaningful`;

  const userPrompt = `Create a family story from this prompt:\n${prompt}`;

  return callClaude(userPrompt, systemPrompt);
}

export async function expandTwoSentences(sentenceOne: string, sentenceTwo: string) {
  const systemPrompt = `You are a children's storyteller expanding short story seeds into full family narratives.
Return ONLY valid JSON matching this schema:
${STORY_JSON_SCHEMA}

Rules:
- Expand the two seed sentences into a complete story with at least 5 sentences total
- Keep the tone warm and intergenerational
- Tag each sentence with Ubuntu, Ubwiyunge, or Umuganda`;

  const userPrompt = `Expand these two sentences into a full story:\n1. ${sentenceOne}\n2. ${sentenceTwo}`;

  return callClaude(userPrompt, systemPrompt);
}
