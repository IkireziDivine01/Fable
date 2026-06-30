import { parseClaudeJson } from './storyHelpers';

const STORY_TOOL_NAME = 'submit_family_story';

const STORY_TOOL = {
  name: STORY_TOOL_NAME,
  description:
    'Submit the completed intergenerational family story with title, transcript, cultural themes, and sentences.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Story title' },
      transcript: { type: 'string', description: 'Full story text' },
      themes: {
        type: 'array',
        items: { type: 'string', enum: ['Ubuntu', 'Ubwiyunge', 'Umuganda'] },
        description: 'Cultural themes woven through the story',
      },
      sentences: {
        type: 'array',
        minItems: 5,
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            theme: { type: 'string', enum: ['Ubuntu', 'Ubwiyunge', 'Umuganda'] },
            kinyarwandaText: { type: 'string' },
            elderTalkingPoints: { type: 'string' },
            childPrompt: { type: 'string' },
          },
          required: ['text', 'theme'],
        },
      },
    },
    required: ['title', 'transcript', 'themes', 'sentences'],
  },
};

type ClaudeContentBlock =
  | { type: 'text'; text?: string }
  | { type: 'tool_use'; id?: string; name?: string; input?: unknown };

async function callClaudeForStory(userPrompt: string, systemPrompt: string): Promise<unknown> {
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
      tools: [STORY_TOOL],
      tool_choice: { type: 'tool', name: STORY_TOOL_NAME },
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = (await response.json()) as { content?: ClaudeContentBlock[] };
  const blocks = data.content ?? [];

  const toolBlock = blocks.find(
    (block): block is Extract<ClaudeContentBlock, { type: 'tool_use' }> =>
      block.type === 'tool_use' && block.name === STORY_TOOL_NAME && block.input != null
  );

  if (toolBlock?.input && typeof toolBlock.input === 'object') {
    return toolBlock.input;
  }

  const text = blocks.find((block) => block.type === 'text')?.text;
  if (text) {
    return parseClaudeJson(text);
  }

  throw new Error('Claude returned an empty response. Try again.');
}

export async function generateStoryFromPrompt(prompt: string): Promise<unknown> {
  const systemPrompt = `You are a children's storyteller preserving Kinyarwanda cultural heritage for families.
Use the ${STORY_TOOL_NAME} tool to return the story.

Rules:
- Write age-appropriate family stories (ages 6-12)
- Include at least 5 sentences
- Weave in Rwandan cultural values
- Assign each sentence one theme from Ubuntu, Ubwiyunge, or Umuganda
- Include childPrompt and elderTalkingPoints on some sentences when meaningful`;

  const userPrompt = `Create a family story from this prompt:\n${prompt}`;
  return callClaudeForStory(userPrompt, systemPrompt);
}

export async function expandTwoSentences(
  sentenceOne: string,
  sentenceTwo: string
): Promise<unknown> {
  const systemPrompt = `You are a children's storyteller expanding short story seeds into full family narratives.
Use the ${STORY_TOOL_NAME} tool to return the story.

Rules:
- Expand the two seed sentences into a complete story with at least 5 sentences total
- Keep the tone warm and intergenerational
- Tag each sentence with Ubuntu, Ubwiyunge, or Umuganda`;

  const userPrompt = `Expand these two sentences into a full story:\n1. ${sentenceOne}\n2. ${sentenceTwo}`;
  return callClaudeForStory(userPrompt, systemPrompt);
}
