import type { StoryCharacterSlot } from './types';

export interface SpeakerSentence {
  speaker?: string | null;
}

export function getCharacterSpread(count: number): number {
  return Math.min(2.4, Math.max(1.4, count * 1.0));
}

export function getCharacterX(index: number, count: number): number {
  const spread = getCharacterSpread(count);
  return (index - (count - 1) / 2) * spread;
}

/**
 * Resolves which character is speaking for a sentence.
 * Uses explicit speaker name when set; falls back to round-robin for legacy stories.
 */
export function resolveActiveCharacterIndex(
  sentence: SpeakerSentence | null | undefined,
  characters: StoryCharacterSlot[],
  sentenceIndex: number
): number {
  if (characters.length === 0) return 0;

  const speaker = sentence?.speaker?.trim();
  if (speaker) {
    const normalized = speaker.toLowerCase();

    const byName = characters.findIndex(
      (c) => c.name.trim().toLowerCase() === normalized
    );
    if (byName >= 0) return byName;

    const byType = characters.findIndex((c) => c.type.toLowerCase() === normalized);
    if (byType >= 0) return byType;

    const partial = characters.findIndex((c) => {
      const name = c.name.trim().toLowerCase();
      return name.length > 0 && (normalized.includes(name) || name.includes(normalized));
    });
    if (partial >= 0) return partial;
  }

  return sentenceIndex % characters.length;
}
