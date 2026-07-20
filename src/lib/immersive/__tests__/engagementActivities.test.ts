import { describe, expect, it } from 'vitest';
import {
  buildDefaultEngagementActivities,
  ensureEngagementActivities,
  getPostStoryActivities,
  getPredictNextActivity,
  normalizeEngagementActivities,
} from '../engagementActivities';
import type { EngagementActivity, SceneBrief } from '../types';

const sceneBrief: SceneBrief = {
  mood: 'playful',
  density: 'balanced',
  paletteHint: { warmth: 0.5, saturation: 0.5, contrast: 0.5 },
  keyProps: [
    { type: 'hut', role: 'landmark' },
    { type: 'drum', role: 'focus' },
    { type: 'goat', role: 'dressing' },
    { type: 'bench', role: 'dressing' },
  ],
};

function treasureHunt(overrides: Record<string, unknown> = {}) {
  return {
    type: 'treasure_hunt',
    introEn: 'Find the village treasures!',
    targets: [
      { propType: 'hut', clueEn: 'A home of clay and straw' },
      { propType: 'drum', clueEn: 'Listen for the beat' },
      { propType: 'goat', clueEn: 'A bleating friend' },
    ],
    ...overrides,
  };
}

function vocabMatch(overrides: Record<string, unknown> = {}) {
  return {
    type: 'vocab_match',
    promptEn: 'Match the words',
    pairs: [
      { propType: 'hut', wordRw: 'inzu', glossEn: 'house' },
      { propType: 'drum', wordRw: 'ingoma', glossEn: 'drum' },
      { propType: 'goat', wordRw: 'ihene', glossEn: 'goat' },
    ],
    ...overrides,
  };
}

function sequence(overrides: Record<string, unknown> = {}) {
  return {
    type: 'sequence',
    promptEn: 'Put the story in order',
    beats: [
      { id: 'a', labelEn: 'Morning', correctOrder: 0 },
      { id: 'b', labelEn: 'Market', correctOrder: 1 },
      { id: 'c', labelEn: 'Song', correctOrder: 2 },
      { id: 'd', labelEn: 'Home', correctOrder: 3 },
    ],
    ...overrides,
  };
}

function predictNext(overrides: Record<string, unknown> = {}) {
  return {
    type: 'predict_next',
    promptEn: 'What happens next?',
    encouragementEn: 'Nice thinking!',
    correctChoiceId: 'b',
    choices: [
      { id: 'a', textEn: 'They sleep' },
      { id: 'b', textEn: 'They share food' },
      { id: 'c', textEn: 'They leave' },
    ],
    ...overrides,
  };
}

describe('normalizeEngagementActivities', () => {
  it('returns undefined for non-arrays', () => {
    expect(normalizeEngagementActivities(null, sceneBrief)).toBeUndefined();
    expect(normalizeEngagementActivities({}, sceneBrief)).toBeUndefined();
  });

  it('drops treasure_hunt / vocab targets outside sceneBrief.keyProps', () => {
    const activities = normalizeEngagementActivities(
      [
        treasureHunt({
          targets: [
            { propType: 'hut', clueEn: 'Home' },
            { propType: 'spaceship', clueEn: 'Sky ship' },
            { propType: 'drum', clueEn: 'Beat' },
            { propType: 'path', clueEn: 'Road' },
          ],
        }),
        vocabMatch({
          pairs: [
            { propType: 'hut', wordRw: 'inzu', glossEn: 'house' },
            { propType: 'path', wordRw: 'inzira', glossEn: 'path' },
            { propType: 'drum', wordRw: 'ingoma', glossEn: 'drum' },
            { propType: 'goat', wordRw: 'ihene', glossEn: 'goat' },
          ],
        }),
      ],
      sceneBrief
    );

    const hunt = activities?.find((a) => a.type === 'treasure_hunt');
    expect(hunt?.type).toBe('treasure_hunt');
    if (hunt?.type === 'treasure_hunt') {
      expect(hunt.targets.map((t) => t.propType).sort()).toEqual(['drum', 'hut']);
    }

    const vocab = activities?.find((a) => a.type === 'vocab_match');
    expect(vocab?.type).toBe('vocab_match');
    if (vocab?.type === 'vocab_match') {
      expect(vocab.pairs.map((p) => p.propType).sort()).toEqual([
        'drum',
        'goat',
        'hut',
      ]);
    }
  });

  it('rejects treasure_hunt with fewer than 2 valid targets', () => {
    const activities = normalizeEngagementActivities(
      [
        treasureHunt({
          targets: [
            { propType: 'hut', clueEn: 'Home' },
            { propType: 'spaceship', clueEn: 'Nope' },
          ],
        }),
      ],
      sceneBrief
    );
    expect(activities).toBeUndefined();
  });

  it('rejects predict_next without exactly 3 choices or matching correctChoiceId', () => {
    expect(
      normalizeEngagementActivities(
        [predictNext({ choices: [{ id: 'a', textEn: 'Only one' }] })],
        sceneBrief,
        { sentenceCount: 5 }
      )
    ).toBeUndefined();

    expect(
      normalizeEngagementActivities(
        [predictNext({ correctChoiceId: 'missing' })],
        sceneBrief,
        { sentenceCount: 5 }
      )
    ).toBeUndefined();
  });

  it('skips predict_next when sentenceCount is 1–3; allows when ≥4 or unset/0', () => {
    const raw = [predictNext()];

    expect(
      normalizeEngagementActivities(raw, sceneBrief, { sentenceCount: 2 })
    ).toBeUndefined();
    expect(
      normalizeEngagementActivities(raw, sceneBrief, { sentenceCount: 3 })
    ).toBeUndefined();

    expect(
      normalizeEngagementActivities(raw, sceneBrief, { sentenceCount: 4 })?.[0]
        ?.type
    ).toBe('predict_next');
    expect(normalizeEngagementActivities(raw, sceneBrief)?.[0]?.type).toBe(
      'predict_next'
    );
    expect(
      normalizeEngagementActivities(raw, sceneBrief, { sentenceCount: 0 })?.[0]
        ?.type
    ).toBe('predict_next');
  });

  it('dedupes by activity type and caps post-story pack to 2 while keeping predict_next', () => {
    const activities = normalizeEngagementActivities(
      [
        treasureHunt(),
        treasureHunt({ introEn: 'Duplicate hunt' }),
        vocabMatch(),
        sequence(),
        predictNext(),
      ],
      sceneBrief,
      { sentenceCount: 6 }
    );

    expect(activities?.map((a) => a.type)).toEqual([
      'predict_next',
      'treasure_hunt',
      'vocab_match',
    ]);
    expect(activities?.some((a) => a.type === 'sequence')).toBe(false);
  });

  it('skips prop-based activities when sceneBrief has no keyProps', () => {
    const emptyBrief: SceneBrief = {
      mood: 'warm',
      density: 'sparse',
      paletteHint: { warmth: 0.5, saturation: 0.5, contrast: 0.5 },
      keyProps: [],
    };

    const activities = normalizeEngagementActivities(
      [treasureHunt(), vocabMatch(), sequence()],
      emptyBrief
    );

    expect(activities?.map((a) => a.type)).toEqual(['sequence']);
  });
});

describe('activity getters', () => {
  const pack: EngagementActivity[] = [
    predictNext() as EngagementActivity,
    sequence() as EngagementActivity,
    treasureHunt() as EngagementActivity,
    vocabMatch() as EngagementActivity,
  ];

  it('getPredictNextActivity returns the predict_next entry', () => {
    expect(getPredictNextActivity(pack)?.type).toBe('predict_next');
    expect(getPredictNextActivity([])).toBeUndefined();
    expect(getPredictNextActivity(null)).toBeUndefined();
  });

  it('getPostStoryActivities orders hunt → vocab → sequence', () => {
    expect(getPostStoryActivities(pack).map((a) => a.type)).toEqual([
      'treasure_hunt',
      'vocab_match',
      'sequence',
    ]);
    expect(getPostStoryActivities(undefined)).toEqual([]);
  });
});

const longSentences = [
  'Morning light woke the village.',
  'Grandmother walked to the market.',
  'They sang a song by the fire.',
  'Everyone shared food at home.',
  'The stars watched them sleep.',
];

describe('buildDefaultEngagementActivities', () => {
  it('builds predict + post pack from sceneBrief and sentences', () => {
    const activities = buildDefaultEngagementActivities({
      sceneBrief,
      sentences: longSentences,
      environment: 'village',
    });

    expect(activities?.map((a) => a.type)).toEqual([
      'predict_next',
      'treasure_hunt',
      'vocab_match',
    ]);

    const predict = activities?.find((a) => a.type === 'predict_next');
    expect(predict?.type).toBe('predict_next');
    if (predict?.type === 'predict_next') {
      expect(predict.choices).toHaveLength(3);
      expect(predict.correctChoiceId).toBe('b');
    }
  });

  it('skips predict_next for short stories', () => {
    const activities = buildDefaultEngagementActivities({
      sceneBrief,
      sentences: ['One', 'Two', 'Three'],
      environment: 'village',
    });
    expect(activities?.some((a) => a.type === 'predict_next')).toBe(false);
    expect(activities?.some((a) => a.type === 'treasure_hunt')).toBe(true);
  });

  it('falls back to environment props when sceneBrief has no keyProps', () => {
    const emptyBrief: SceneBrief = {
      mood: 'warm',
      density: 'sparse',
      paletteHint: { warmth: 0.5, saturation: 0.5, contrast: 0.5 },
      keyProps: [],
    };
    const activities = buildDefaultEngagementActivities({
      sceneBrief: emptyBrief,
      sentences: longSentences,
      environment: 'village',
    });
    expect(activities?.some((a) => a.type === 'treasure_hunt')).toBe(true);
    expect(activities?.some((a) => a.type === 'vocab_match')).toBe(true);
  });

  it('still builds sequence when props are unavailable', () => {
    const activities = buildDefaultEngagementActivities({
      sceneBrief: {
        mood: 'warm',
        density: 'sparse',
        paletteHint: { warmth: 0.5, saturation: 0.5, contrast: 0.5 },
        keyProps: [],
      },
      sentences: longSentences,
    });
    expect(activities?.map((a) => a.type)).toEqual(['predict_next', 'sequence']);
  });
});

describe('ensureEngagementActivities', () => {
  it('replaces empty/missing stored pack with defaults', () => {
    const ensured = ensureEngagementActivities(null, {
      sceneBrief,
      sentences: longSentences,
      environment: 'village',
    });
    expect(ensured?.length).toBeGreaterThan(0);
    expect(ensured?.some((a) => a.type === 'predict_next')).toBe(true);
    expect(getPostStoryActivities(ensured).length).toBeGreaterThan(0);
  });

  it('keeps stored AI activities and does not overwrite them', () => {
    const stored = [
      predictNext({
        promptEn: 'Custom AI prompt',
        correctChoiceId: 'b',
      }),
      treasureHunt({ introEn: 'AI hunt intro' }),
    ];
    const ensured = ensureEngagementActivities(stored as EngagementActivity[], {
      sceneBrief,
      sentences: longSentences,
      environment: 'village',
    });

    const predict = ensured?.find((a) => a.type === 'predict_next');
    expect(predict?.type).toBe('predict_next');
    if (predict?.type === 'predict_next') {
      expect(predict.promptEn).toBe('Custom AI prompt');
    }

    const hunt = ensured?.find((a) => a.type === 'treasure_hunt');
    expect(hunt?.type).toBe('treasure_hunt');
    if (hunt?.type === 'treasure_hunt') {
      expect(hunt.introEn).toBe('AI hunt intro');
    }
  });

  it('fills missing activity types from defaults', () => {
    const stored = [sequence()];
    const ensured = ensureEngagementActivities(stored as EngagementActivity[], {
      sceneBrief,
      sentences: longSentences,
      environment: 'village',
    });

    expect(ensured?.some((a) => a.type === 'predict_next')).toBe(true);
    expect(ensured?.some((a) => a.type === 'sequence')).toBe(true);
    // Cap still applies: at most 2 post activities
    expect(getPostStoryActivities(ensured).length).toBeLessThanOrEqual(2);
  });
});
