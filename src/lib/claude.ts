import { parseClaudeJson } from './storyHelpers';

const STORY_TOOL_NAME = 'submit_family_story';

const ENVIRONMENT_TYPES = ['forest', 'home', 'village', 'school', 'market'] as const;
const CHARACTER_TYPES = ['boy', 'girl', 'grandma', 'grandpa', 'dog', 'teacher'] as const;
const SCENE_PROP_TYPES = [
  'tree',
  'hut',
  'fire',
  'stall',
  'board',
  'rock',
  'flower',
  'bench',
  'banana_tree',
  'path',
  'water_jug',
  'drum',
  'goat',
  'millet_field',
] as const;
const WEATHER_TYPES = ['clear', 'rain', 'fireflies', 'mist'] as const;
const TIME_OF_DAY_TYPES = ['dawn', 'midday', 'dusk', 'night'] as const;
const GESTURE_TYPES = ['nod', 'wave', 'clap', 'point', 'surprise'] as const;
const SCENE_MOODS = [
  'warm',
  'solemn',
  'playful',
  'tense',
  'nostalgic',
  'hopeful',
  'cozy',
] as const;
const SCENE_DENSITIES = ['sparse', 'balanced', 'busy'] as const;
const SCENE_PROP_ROLES = ['landmark', 'focus', 'dressing'] as const;

const SCENE_EVENT_SCHEMA = {
  type: 'object',
  description:
    'Sticky scene change that applies from this sentence onward (lighting, props, weather, time of day). gesture is one-shot for the speaker on this sentence only.',
  properties: {
    weather: {
      type: 'string',
      enum: [...WEATHER_TYPES],
      description: 'Atmospheric overlay — rain, fireflies at night, mist, or clear',
    },
    timeOfDay: {
      type: 'string',
      enum: [...TIME_OF_DAY_TYPES],
      description: 'Sky mood — dawn (pink soft), midday (bright), dusk (orange), night (stars)',
    },
    gesture: {
      type: 'string',
      enum: [...GESTURE_TYPES],
      description:
        'Brief reaction for the speaking character on this sentence — nod, wave, clap, point, or surprise',
    },
    lightingColor: { type: 'string', description: 'New light hex color for this beat' },
    lightingIntensity: {
      type: 'number',
      description: 'New light brightness 0.4-1.2',
    },
    backgroundColor: { type: 'string', description: 'Optional sky hex shift' },
    fogColor: { type: 'string', description: 'Optional fog hex shift' },
    addObjects: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...SCENE_PROP_TYPES] },
          x: { type: 'number' },
          z: { type: 'number' },
          scale: { type: 'number' },
        },
        required: ['type', 'x'],
      },
      description: 'Props that appear from this sentence onward',
    },
    removeTypes: {
      type: 'array',
      items: { type: 'string', enum: [...SCENE_PROP_TYPES] },
      description: 'Prop types to remove from the scene from this sentence onward',
    },
  },
};

const HOTSPOT_SCHEMA = {
  type: 'object',
  properties: {
    propType: {
      type: 'string',
      enum: [...SCENE_PROP_TYPES],
      description: 'Which prop kids can tap',
    },
    propIndex: {
      type: 'number',
      description: '0-based index among props of that type (usually 0)',
    },
    title: { type: 'string', description: 'Short English tooltip title' },
    body: {
      type: 'string',
      description: '1-2 warm sentences — cultural note or story detail for kids',
    },
    titleRw: { type: 'string', description: 'Optional Kinyarwanda title' },
    bodyRw: { type: 'string', description: 'Optional Kinyarwanda body' },
  },
  required: ['propType', 'title', 'body'],
};

const ENGAGEMENT_ACTIVITIES_SCHEMA = {
  type: 'array',
  minItems: 2,
  maxItems: 3,
  description:
    '2–3 kid engagement activities (at most one of each type). Always include predict_next when there are ≥4 sentences. Also include 1–2 of treasure_hunt, sequence, vocab_match. Prop types for hunt/vocab MUST appear in sceneBrief.keyProps.',
  items: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['treasure_hunt', 'sequence', 'vocab_match', 'predict_next'],
      },
      introEn: {
        type: 'string',
        description: 'treasure_hunt: short intro before the hunt',
      },
      introRw: { type: 'string' },
      targets: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        description: 'treasure_hunt: props to find (propType ∈ sceneBrief.keyProps)',
        items: {
          type: 'object',
          properties: {
            propType: { type: 'string', enum: [...SCENE_PROP_TYPES] },
            clueEn: {
              type: 'string',
              description: 'Story-fact clue — seed from keyProps[].note when present',
            },
            clueRw: { type: 'string' },
            revealEn: {
              type: 'string',
              description: 'Optional override when found (else hotspot copy)',
            },
            revealRw: { type: 'string' },
          },
          required: ['propType', 'clueEn'],
        },
      },
      promptEn: {
        type: 'string',
        description: 'sequence | vocab_match | predict_next: kid-facing prompt',
      },
      promptRw: { type: 'string' },
      beats: {
        type: 'array',
        minItems: 4,
        maxItems: 5,
        description: 'sequence: story moments with correctOrder 0..n-1',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            labelEn: { type: 'string', description: 'Short card label' },
            labelRw: { type: 'string' },
            correctOrder: {
              type: 'number',
              description: '0-based correct position in the story arc',
            },
          },
          required: ['id', 'labelEn', 'correctOrder'],
        },
      },
      pairs: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        description: 'vocab_match: Kinyarwanda word → prop in the scene',
        items: {
          type: 'object',
          properties: {
            wordRw: { type: 'string', description: 'Kinyarwanda word' },
            glossEn: { type: 'string', description: 'Short English gloss' },
            propType: {
              type: 'string',
              enum: [...SCENE_PROP_TYPES],
              description: 'Must be in sceneBrief.keyProps',
            },
          },
          required: ['wordRw', 'glossEn', 'propType'],
        },
      },
      choices: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        description: 'predict_next: exactly 3 choices before the final beat',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            textEn: { type: 'string' },
            textRw: { type: 'string' },
          },
          required: ['id', 'textEn'],
        },
      },
      correctChoiceId: {
        type: 'string',
        description: 'predict_next: id of the choice matching the final beat',
      },
      encouragementEn: {
        type: 'string',
        description: 'predict_next: warm line after the kid picks, then final beat plays',
      },
      encouragementRw: { type: 'string' },
    },
    required: ['type'],
  },
};

const SCENE_BRIEF_SCHEMA = {
  type: 'object',
  description:
    'Semantic creative direction for this story’s 3D world. Chooses mood, prop emphasis, density, and a time-of-day arc on top of the environment biome preset — do not invent a new biome.',
  properties: {
    mood: {
      type: 'string',
      enum: [...SCENE_MOODS],
      description:
        'Emotional lighting from THIS story’s peak/resolution — not the setting’s usual vibe. warm (hearth/family peak), solemn (quiet respect), playful (joyous play as the story beat), tense (conflict edge — cool crimson), nostalgic (memory), hopeful (courage/renewal), cozy (intimate enclosed glow). Markets are not automatically playful; quarrel stories are tense (or resolution mood).',
    },
    paletteHint: {
      type: 'object',
      description:
        'Subtle palette knobs 0–1. Prefer mid values (~0.4–0.65); mood carries most of the look. Use accentBias only when a story color clearly matters.',
      properties: {
        warmth: {
          type: 'number',
          description: '0 = cooler, 1 = warmer (default around 0.5)',
        },
        saturation: {
          type: 'number',
          description: '0 = muted, 1 = vivid (default around 0.5)',
        },
        contrast: {
          type: 'number',
          description: '0 = soft, 1 = punchy (default around 0.5)',
        },
        accentBias: {
          type: 'string',
          description: 'Optional accent hex bias e.g. #FF7956',
        },
      },
      required: ['warmth', 'saturation', 'contrast'],
    },
    keyProps: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      description:
        '1–5 story-important props. At least one landmark or focus type must be named/implied in the story text. type from prop enum; role landmark|focus|dressing. Deduplicate by type. Prefer fewer props over biome padding.',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...SCENE_PROP_TYPES] },
          role: { type: 'string', enum: [...SCENE_PROP_ROLES] },
          note: {
            type: 'string',
            description:
              'Required for landmark/focus: cite the story beat that justifies this prop. Optional short kid-facing note for dressing.',
          },
        },
        required: ['type', 'role'],
      },
    },
    density: {
      type: 'string',
      enum: [...SCENE_DENSITIES],
      description:
        'How many story props to place: sparse (few concrete props), balanced, or busy only when the narrative names many. Object count follows keyProps only — never invent biome filler.',
    },
    timeOfDayArc: {
      type: 'object',
      description:
        'Sticky time-of-day from sentence index onward — same string keys as sceneEvents ("0","1",…). Example: {"0":"dawn","4":"dusk","8":"night"}. Include 1–3 beats.',
      additionalProperties: { type: 'string', enum: [...TIME_OF_DAY_TYPES] },
    },
    weatherBias: {
      type: 'string',
      enum: [...WEATHER_TYPES],
      description: 'Optional default atmosphere until a sceneEvent overrides it',
    },
  },
  required: ['mood', 'paletteHint', 'keyProps', 'density'],
};

const SCENE_SPEC_SCHEMA = {
  type: 'object',
  description:
    'Optional explicit 3D layout override. Prefer sceneBrief for uniqueness; only include sceneSpec when you need precise hexes/placement beyond the brief.',
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
    hairStyle: {
      type: 'string',
      enum: ['short', 'braids', 'bun', 'afro', 'wrap'],
      description: 'Hairstyle silhouette for the 3D character',
    },
    hairColor: { type: 'string', description: 'Hair hex color' },
    faceShape: {
      type: 'string',
      enum: ['round', 'oval', 'elder'],
      description: 'Face proportions for the canvas face texture',
    },
    garmentStyle: {
      type: 'string',
      enum: ['tunic', 'dress', 'sash', 'collar'],
      description: 'Clothing silhouette — dress flares, collar for teachers, sash accent',
    },
    personalityPose: {
      type: 'string',
      enum: ['shy', 'confident', 'wise', 'playful'],
      description: 'Idle animation personality — shy leans back, wise leans forward, playful bounces',
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
        description:
          'Nearest 3D render biome (technical foundation only). Pick the closest match; uniqueness must come from environmentDescription + sceneBrief, not from defaulting to village.',
      },
      environmentDescription: {
        type: 'string',
        description:
          '2-3 vivid sentences naming THIS story’s specific landmarks, people, and atmosphere (from the user prompt / narrative). Ban generic filler like “homesteads and rolling hills” unless the story truly is village homestead life. Written for the family to read before entering the scene.',
      },
      sceneBrief: SCENE_BRIEF_SCHEMA,
      sceneSpec: SCENE_SPEC_SCHEMA,
      sceneEvents: {
        type: 'object',
        description:
          'Map of sentence index (as string keys "0","1",…) to scene changes. Include 2-4 meaningful beats only — e.g. night→fireflies, rain, market brightening. Keys must be valid sentence indices. Align timeOfDay beats with sceneBrief.timeOfDayArc when both are present.',
        additionalProperties: SCENE_EVENT_SCHEMA,
      },
      hotspots: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        description:
          'Clickable props with short cultural tooltip cards — match propTypes that appear in sceneBrief.keyProps (and sceneSpec.objects if provided)',
        items: HOTSPOT_SCHEMA,
      },
      engagementActivities: ENGAGEMENT_ACTIVITIES_SCHEMA,
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
            speaker: {
              type: 'string',
              description:
                'Name of the character speaking this sentence — must exactly match one of characters[].name',
            },
            kinyarwandaText: { type: 'string' },
            elderTalkingPoints: { type: 'string' },
            childPrompt: { type: 'string' },
          },
          required: ['text', 'theme', 'speaker'],
        },
      },
    },
    required: [
      'title',
      'transcript',
      'themes',
      'environment',
      'environmentDescription',
      'sceneBrief',
      'sceneEvents',
      'hotspots',
      'engagementActivities',
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

const SCENE_BRIEF_RULES = `
- Always include sceneBrief: pick the nearest environment biome for 3D rendering, then dress THIS story with mood, keyProps, density, paletteHint, and optional timeOfDayArc / weatherBias
- environment is a technical render backend only (forest|home|village|school|market). Uniqueness MUST live in environmentDescription + sceneBrief — never in a stock biome label
- Anti-default: do NOT default to village + warm + hut/path/banana_tree unless the narrative is clearly everyday village life. Legends, courts, markets, forests, schools, and homes each need their own brief
- environmentDescription must name prompt-specific landmarks, people, and atmosphere from THIS story. Ban generic filler (“homesteads and rolling hills”, “a typical Rwandan village”) unless the story truly is that
- sceneBrief.keyProps types must be from the prop enum; roles are landmark | focus | dressing; 1–5 unique types
- Every landmark and focus keyProp MUST include a note that cites the story beat justifying it
- sceneBrief.timeOfDayArc uses the SAME sentence-index string keys as sceneEvents ("0","1",…)
- Prefer mid paletteHint values (~0.4–0.65); let mood do the heavy lifting (tense = cool crimson conflict, not orange-brown warm)
- sceneSpec is optional — omit it unless you need precise hex overrides; uniqueness comes from sceneBrief
- Include 2-4 sceneEvents keyed by sentence index; align timeOfDay with sceneBrief.timeOfDayArc when both are set
- Prefer Rwanda-specific props when fitting: banana_tree, path, water_jug, drum, goat, millet_field — but only when the narrative supports them
- Include 2-4 hotspots on props from sceneBrief.keyProps — short kid-friendly cultural notes
- Always include engagementActivities (2–3 items, at most one of each type) in the SAME tool call — never a second round-trip
- Always include predict_next when the story has ≥4 sentences: 3 choices answerable from the story so far; correctChoiceId matches the actual final beat without quoting it verbatim; then encouragementEn
- Also include 1–2 of treasure_hunt, sequence, vocab_match based on what the narrative supports
- treasure_hunt / vocab_match propTypes MUST be types from sceneBrief.keyProps; seed clues/glosses from keyProps[].note when present
- sequence beats paraphrase real story moments (4–5 short labels) with correctOrder 0..n-1

Mood (critical — do not confuse place energy with story emotion):
- Choose mood from THIS story's emotional peak or resolution — the feeling of the conflict, turning point, or closing beat — NOT from what the setting usually feels like.
- Wrong signal: "markets are bustling → playful". Right signal: "cousins quarrel over a goat, then make peace → tense (or hopeful/warm if the resolution is the peak you emphasize)".
- Counter-example — market quarrel story:
  WRONG: { "mood": "playful", ... }  // only because a market looks lively
  RIGHT:  { "mood": "tense", ... }    // because the story's peak is conflict; or "hopeful"/"warm" if you center the peace-making resolution
- Apply the same test everywhere: a solemn home memory is solemn/nostalgic/cozy, not "warm" just because homes are comforting in general; a shy child's school courage beat is hopeful, not playful just because schoolyards are lively.

keyProps + density (story-grounded, not biome padding):
- At least one landmark or focus prop MUST be concretely named or clearly implied in the story text (transcript/sentences) — e.g. goat, stall, fire, board, path the child stands on — not merely "plausible for this biome".
- Dressing props may fill atmosphere, but do not invent landmark/focus props the narrative never mentions.
- If the story only gives one or two concrete props, keep keyProps short and prefer density "sparse" (or "balanced" only when the text supports more). Never pad keyProps with generic biome objects just to hit a busy count.
- The renderer places ONLY keyProps — density must match how many story props you actually list.

Example sceneBrief for a village story that softens from dawn gathering to dusk firelight (mood from the gathering's warmth, not "villages are busy"):
{
  "mood": "warm",
  "paletteHint": { "warmth": 0.55, "saturation": 0.5, "contrast": 0.45 },
  "keyProps": [
    { "type": "hut", "role": "landmark", "note": "Grandmother's courtyard — named in the story" },
    { "type": "drum", "role": "focus", "note": "The drum the children gather around in the text" },
    { "type": "banana_tree", "role": "dressing" }
  ],
  "density": "balanced",
  "timeOfDayArc": { "0": "dawn", "5": "dusk" },
  "weatherBias": "clear"
}

Example sceneBrief for a market quarrel that resolves in peace (mood from conflict peak, not market bustle):
{
  "mood": "tense",
  "paletteHint": { "warmth": 0.45, "saturation": 0.4, "contrast": 0.55 },
  "keyProps": [
    { "type": "stall", "role": "landmark", "note": "The market stall where the quarrel begins" },
    { "type": "goat", "role": "focus", "note": "The goat the cousins both want" },
    { "type": "path", "role": "dressing" }
  ],
  "density": "sparse",
  "timeOfDayArc": { "0": "midday", "4": "dusk" },
  "weatherBias": "clear"
}

Example for an epic legend like Ndabaga (nearest biome may be village, but description + props must NOT read as generic homestead life):
environment: "village"
environmentDescription: "A royal cattle court at dawn — long-horned inyambo stir beyond the gathering ground while elders wait for a girl who will prove courage can wear any name."
{
  "mood": "hopeful",
  "paletteHint": { "warmth": 0.42, "saturation": 0.48, "contrast": 0.58, "accentBias": "#C4A574" },
  "keyProps": [
    { "type": "drum", "role": "landmark", "note": "Court drums that call the kingdom to witness Ndabaga's vow" },
    { "type": "path", "role": "focus", "note": "The dusty path she walks toward the cattle and the test" },
    { "type": "goat", "role": "dressing", "note": "Herd animals at the edge of the royal grounds" }
  ],
  "density": "sparse",
  "timeOfDayArc": { "0": "dawn", "6": "midday" },
  "weatherBias": "mist"
}`;

export async function generateStoryFromPrompt(prompt: string): Promise<unknown> {
  const systemPrompt = `You are a children's storyteller preserving Kinyarwanda cultural heritage for families.
Use the ${STORY_TOOL_NAME} tool to return the story and the immersive world built around it.

Rules:
- Write age-appropriate family stories (ages 6-12)
- Include at least 5 sentences
- Weave in Rwandan cultural values
- Assign each sentence one theme from Ubuntu, Ubwiyunge, or Umuganda
- Include childPrompt and elderTalkingPoints on some sentences when meaningful
- Choose the nearest environment biome for rendering, then make environmentDescription and sceneBrief uniquely match THIS prompt — names in characters must appear in the narrative
- environmentDescription must paint THIS story’s specific place (not a reusable village/hills template)
- Include 1-3 characters who are central to the story
${SCENE_BRIEF_RULES}
- Each character needs a unique appearance with hex colors, hairStyle, garmentStyle, faceShape, and personalityPose that reflect their personality and role
- Every sentence must include a speaker field matching exactly one character name from characters[]`;

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
- Derive the nearest environment biome, a prompt-specific environmentDescription, sceneBrief, and characters from the finished story
- Character names must match who appears in the narrative
${SCENE_BRIEF_RULES}
- Give every character a distinct appearance with custom hex colors, hair, garment style, and personalityPose
- Every sentence must include a speaker field matching exactly one character name from characters[]`;

  const userPrompt = `Expand these two sentences into a full story:\n1. ${sentenceOne}\n2. ${sentenceTwo}`;
  return callClaudeForStory(userPrompt, systemPrompt);
}
