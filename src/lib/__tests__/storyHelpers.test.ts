import { describe, expect, it } from 'vitest';
import {
  parseClaudeJson,
  splitTranscriptIntoSentences,
  validateGeneratedStory,
} from '../storyHelpers';

function minimalStory(overrides: Record<string, unknown> = {}) {
  return {
    title: 'The Drum at Dawn',
    themes: ['Ubuntu'],
    sentences: [
      {
        text: 'The village woke early.',
        order: 0,
        kinyarwandaText: 'Umudugudu wabyutse kare.',
      },
      {
        text: 'Ama sang by the fire.',
        order: 1,
        kinyarwandaText: 'Ama yaririmbye ku gicaniro.',
      },
      {
        text: 'Everyone shared the beat.',
        order: 2,
        kinyarwandaText: 'Bose basangiye umuvuduko.',
      },
    ],
    ...overrides,
  };
}

describe('splitTranscriptIntoSentences', () => {
  it('splits on .!?', () => {
    expect(
      splitTranscriptIntoSentences('Hello there. How are you? Fine!')
    ).toEqual(['Hello there.', 'How are you?', 'Fine!']);
  });

  it('trims and drops empties', () => {
    expect(splitTranscriptIntoSentences('  One.   Two.  ')).toEqual([
      'One.',
      'Two.',
    ]);
  });
});

describe('parseClaudeJson', () => {
  it('parses raw JSON', () => {
    expect(parseClaudeJson('{"title":"Hi"}')).toEqual({ title: 'Hi' });
  });

  it('parses fenced json blocks', () => {
    const content = 'Here you go:\n```json\n{"ok":true}\n```\nThanks!';
    expect(parseClaudeJson(content)).toEqual({ ok: true });
  });

  it('parses brace-sliced content with trailing prose', () => {
    const content = 'Result: {"a":1,"b":2} end';
    expect(parseClaudeJson(content)).toEqual({ a: 1, b: 2 });
  });

  it('tolerates trailing commas and smart quotes', () => {
    expect(parseClaudeJson('{“title”: “Story”,}')).toEqual({ title: 'Story' });
  });

  it('throws when nothing parses', () => {
    expect(() => parseClaudeJson('not json at all')).toThrow(
      /Could not parse AI response/
    );
  });
});

describe('validateGeneratedStory', () => {
  it('throws on missing title', () => {
    expect(() =>
      validateGeneratedStory(minimalStory({ title: '   ' }))
    ).toThrow(/title/i);
  });

  it('throws when fewer than 3 sentences', () => {
    expect(() =>
      validateGeneratedStory(
        minimalStory({
          sentences: [{ text: 'One.' }, { text: 'Two.' }],
        })
      )
    ).toThrow(/at least 3 sentences/i);
  });

  it('throws when Kinyarwanda is missing on a sentence', () => {
    expect(() =>
      validateGeneratedStory(
        minimalStory({
          sentences: [
            { text: 'One.', kinyarwandaText: 'Rimwe.' },
            { text: 'Two.' },
            { text: 'Three.', kinyarwandaText: 'Gatatu.' },
          ],
        })
      )
    ).toThrow(/Kinyarwanda is required/i);
  });

  it('accepts sentences from an array', () => {
    const story = validateGeneratedStory(minimalStory());
    expect(story.title).toBe('The Drum at Dawn');
    expect(story.sentences).toHaveLength(3);
    expect(story.sentences[0]?.sentenceText).toBe('The village woke early.');
    expect(story.sentences[0]?.kinyarwandaText).toBe('Umudugudu wabyutse kare.');
  });

  it('rejects transcript-only payloads without Kinyarwanda', () => {
    expect(() =>
      validateGeneratedStory({
        title: 'Three Beats',
        themes: ['Ubuntu'],
        transcript: 'First beat. Second beat. Third beat.',
      })
    ).toThrow(/Kinyarwanda is required/i);
  });

  it('passes through normalized sceneBrief and engagementActivities', () => {
    const story = validateGeneratedStory(
      minimalStory({
        environment: 'village',
        sceneBrief: {
          mood: 'warm',
          density: 'sparse',
          keyProps: [
            { type: 'hut', role: 'landmark' },
            { type: 'drum', role: 'focus' },
          ],
        },
        engagementActivities: [
          {
            type: 'treasure_hunt',
            introEn: 'Find them!',
            targets: [
              { propType: 'hut', clueEn: 'Home' },
              { propType: 'drum', clueEn: 'Beat' },
            ],
          },
          {
            type: 'predict_next',
            promptEn: 'Next?',
            encouragementEn: 'Good!',
            correctChoiceId: 'a',
            choices: [
              { id: 'a', textEn: 'Share' },
              { id: 'b', textEn: 'Hide' },
              { id: 'c', textEn: 'Run' },
            ],
          },
        ],
        sentences: [
          { text: 'One.', kinyarwandaText: 'Rimwe.' },
          { text: 'Two.', kinyarwandaText: 'Kabiri.' },
          { text: 'Three.', kinyarwandaText: 'Gatatu.' },
          { text: 'Four.', kinyarwandaText: 'Kane.' },
        ],
      })
    );

    expect(story.sceneBrief?.mood).toBe('warm');
    expect(story.sceneBrief?.keyProps.map((p) => p.type)).toEqual([
      'hut',
      'drum',
    ]);
    expect(story.engagementActivities?.map((a) => a.type)).toEqual([
      'predict_next',
      'treasure_hunt',
    ]);
  });

  it('omits invalid sceneBrief instead of inventing a default', () => {
    const story = validateGeneratedStory(
      minimalStory({
        sceneBrief: { mood: 'invalid', keyProps: [{ type: 'hut' }] },
      })
    );

    expect(story.sceneBrief).toBeUndefined();
  });
});
