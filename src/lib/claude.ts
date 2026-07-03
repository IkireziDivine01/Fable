import { parseClaudeJson } from './storyHelpers';

const STORY_TOOL_NAME = 'submit_family_story';

const ENVIRONMENT_TYPES = ['forest', 'home', 'village', 'school', 'market'] as const;
const CHARACTER_TYPES = ['boy', 'girl', 'grandma', 'grandpa', 'dog', 'teacher'] as const;
const SCENE_PROP_TYPES = ['tree', 'hut', 'fire', 'stall', 'board', 'rock', 'flower', 'bench'] as const;

const SCENE_SPEC_SCHEMA = {
  type: 'object',
  description:
    'Unique 3D scene layout and palette for this story — custom colors and prop placement, not generic defaults',
  properties: {
    backgroundColor: { type: 'string', description: 'Sky/backdrop hex color e.g. #3d2914' },
    fogColor: { type: 'string', description: 'Atmospheric fog hex color' },
    groundColor: { type: 'string', description: 'Ground/earth hex color' },
    accentColor: { type: 'string', description: 'Highlight hex color for props and details' },
    lightingColor: { type: 'string', description: 'Directional light hex color' },
    lightingIntensity: {
      type: 'number',
      description: 'Light brightness between 0.5 and 1.1',
    },
    objects: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      description: 'Props placed in the scene — vary types and x positions for each story',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...SCENE_PROP_TYPES] },
          x: { type: 'number', description: 'Horizontal position from -4 to 4' },
          z: { type: 'number', description: 'Depth position from -3 to 1, optional' },
          scale: { type: 'number', description: 'Size multiplier 0.7-1.4, optional' },
        },
        required: ['type', 'x'],
      },
    },
  },
  required: [
    'backgroundColor',
    'fogColor',
    'groundColor',
    'accentColor',
    'lightingColor',
    'objects',
  ],
};

const CHARACTER_APPEARANCE_SCHEMA = {
  type: 'object',
  description: 'Unique visual appearance for this character in the 3D scene',
  properties: {
    skinColor: { type: 'string', description: 'Skin or fur hex color' },
    garmentColor: { type: 'string', description: 'Clothing or body hex color' },
    accentColor: { type: 'string', description: 'Sash, collar, or accessory hex color' },
    heightScale: {
      type: 'number',
      description: 'Relative height 0.85-1.25 compared to the character archetype',
    },
    eyeColor: { type: 'string', description: 'Eye hex color for canvas face, e.g. #1e1b18' },
    hasBlush: { type: 'boolean', description: 'Whether to draw cheek blush on the face' },
    blushColor: { type: 'string', description: 'Cheek blush hex color when hasBlush is true' },
    bodyPattern: {
      description:
        'Single garment hex color or array of 2-4 hex colors for horizontal torso stripes',
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
      ],
    },
    accessories: {
      type: 'array',
      items: { type: 'string', enum: ['headwrap', 'necklace'] },
      description: 'Optional worn accessories',
    },
  },
  required: ['skinColor', 'garmentColor', 'accentColor'],
};

const STORY_TOOL = {
  name: STORY_TOOL_NAME,
  description:
    'Submit the completed intergenerational family story with title, transcript, cultural themes, sentences, and an immersive world that fits the narrative.',
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
      environment: {
        type: 'string',
        enum: [...ENVIRONMENT_TYPES],
        description: 'Best 3D setting preset for where the story takes place',
      },
      environmentDescription: {
        type: 'string',
        description:
          '2-3 vivid sentences describing the setting — sights, sounds, and mood — written for the family to read before entering the scene',
      },
      sceneSpec: SCENE_SPEC_SCHEMA,
      characters: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Character name used in the story' },
            type: {
              type: 'string',
              enum: [...CHARACTER_TYPES],
              description: 'Visual character preset that best matches this person or animal',
            },
            description: {
              type: 'string',
              description:
                '1-2 sentences about who they are and their role in this story — personality and relationship to the family',
            },
            appearance: CHARACTER_APPEARANCE_SCHEMA,
          },
          required: ['name', 'type', 'description', 'appearance'],
        },
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
    required: [
      'title',
      'transcript',
      'themes',
      'environment',
      'environmentDescription',
      'sceneSpec',
      'characters',
      'sentences',
    ],
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
Use the ${STORY_TOOL_NAME} tool to return the story and the immersive world built around it.

Rules:
- Write age-appropriate family stories (ages 6-12)
- Include at least 5 sentences
- Weave in Rwandan cultural values
- Assign each sentence one theme from Ubuntu, Ubwiyunge, or Umuganda
- Include childPrompt and elderTalkingPoints on some sentences when meaningful
- Choose environment and characters that match the story — names in characters must appear in the narrative
- environmentDescription should paint the scene families will enter in the 3D world
- Include 1-3 characters who are central to the story
- sceneSpec must be unique to THIS story: custom earth-tone hex colors and 4-7 props with varied x positions — never copy preset defaults
- Each character needs a unique appearance with hex colors that reflect their personality and role in the narrative`;

  const userPrompt = `Create a family story from this prompt:\n${prompt}`;
  return callClaudeForStory(userPrompt, systemPrompt);
}

export async function expandTwoSentences(
  sentenceOne: string,
  sentenceTwo: string
): Promise<unknown> {
  const systemPrompt = `You are a children's storyteller expanding short story seeds into full family narratives.
Use the ${STORY_TOOL_NAME} tool to return the story and the immersive world built around it.

Rules:
- Expand the two seed sentences into a complete story with at least 5 sentences total
- Keep the tone warm and intergenerational
- Tag each sentence with Ubuntu, Ubwiyunge, or Umuganda
- Derive environment, environmentDescription, sceneSpec, and characters from the finished story
- Character names must match who appears in the narrative
- sceneSpec colors and prop layout must be unique to this story — tailor props to what happens in the narrative
- Give every character a distinct appearance with custom hex colors`;

  const userPrompt = `Expand these two sentences into a full story:\n1. ${sentenceOne}\n2. ${sentenceTwo}`;
  return callClaudeForStory(userPrompt, systemPrompt);
}
