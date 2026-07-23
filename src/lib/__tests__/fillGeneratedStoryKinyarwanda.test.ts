import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fillMissingKinyarwandaOnPayload } from '@/lib/fillGeneratedStoryKinyarwanda';
import { validateGeneratedStory } from '@/lib/storyHelpers';

vi.mock('@/lib/translate', () => ({
  translateLinesToKinyarwanda: vi.fn(async (texts: string[]) =>
    texts.map((t, i) => `RW:${i}:${t}`)
  ),
}));

describe('fillMissingKinyarwandaOnPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fills missing kinyarwandaText so validation passes', async () => {
    const filled = await fillMissingKinyarwandaOnPayload({
      title: 'Gihanga',
      transcript: 'One. Two. Three.',
      themes: ['Ubuntu'],
      sentences: [
        { text: 'One.', theme: 'Ubuntu', speaker: 'Elder' },
        { text: 'Two.', theme: 'Ubuntu', speaker: 'Elder', kinyarwandaText: 'Kabiri.' },
        { text: 'Three.', theme: 'Ubuntu', speaker: 'Elder', kinyarwanda_text: '' },
      ],
    });

    const story = validateGeneratedStory(filled);
    expect(story.sentences[0]?.kinyarwandaText).toBe('RW:0:One.');
    expect(story.sentences[1]?.kinyarwandaText).toBe('Kabiri.');
    expect(story.sentences[2]?.kinyarwandaText).toBe('RW:1:Three.');
  });

  it('builds sentences from transcript when the array is empty', async () => {
    const filled = await fillMissingKinyarwandaOnPayload({
      title: 'Three Beats',
      themes: ['Ubuntu'],
      transcript: 'First beat. Second beat. Third beat.',
    });

    const story = validateGeneratedStory(filled);
    expect(story.sentences).toHaveLength(3);
    expect(story.sentences.every((s) => s.kinyarwandaText.startsWith('RW:'))).toBe(true);
  });
});
