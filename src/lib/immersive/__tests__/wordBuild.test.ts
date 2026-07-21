import { describe, expect, it } from 'vitest';
import { buildWordPuzzle, buildWordPuzzles, kidWordBlurb } from '../wordBuild';

describe('wordBuild', () => {
  it('builds a single-blank puzzle with the correct letter in choices', () => {
    const puzzle = buildWordPuzzle({
      wordRw: 'umuriro',
      glossEn: 'fire',
      propType: 'fire',
    });
    expect(puzzle).not.toBeNull();
    if (!puzzle) return;
    expect(puzzle.slots.filter((s) => s.blank)).toHaveLength(1);
    expect(puzzle.choices).toContain(puzzle.correctLetter);
    expect(puzzle.choices.length).toBeGreaterThanOrEqual(3);
    expect(puzzle.slots.map((s) => s.char).join('')).toBe('umuriro');
  });

  it('blanks a middle letter and keeps distractors out of the word', () => {
    const puzzle = buildWordPuzzle({
      wordRw: 'ingoma',
      glossEn: 'drum',
      propType: 'drum',
    });
    expect(puzzle).not.toBeNull();
    if (!puzzle) return;

    const letterIndexes = [...'ingoma']
      .map((ch, i) => ({ ch, i }))
      .filter(({ ch }) => /[a-z]/i.test(ch))
      .map(({ i }) => i);
    const mid = letterIndexes[Math.floor(letterIndexes.length / 2)];
    expect(puzzle.blankIndex).toBe(mid);

    const wordLetters = new Set([...'ingoma']);
    for (const choice of puzzle.choices) {
      if (choice === puzzle.correctLetter) continue;
      expect(wordLetters.has(choice)).toBe(false);
    }
  });

  it('skips tiny or empty words', () => {
    expect(
      buildWordPuzzle({ wordRw: 'a', glossEn: 'a', propType: 'hut' })
    ).toBeNull();
    expect(
      buildWordPuzzle({ wordRw: 'inzu', glossEn: '', propType: 'hut' })
    ).toBeNull();
  });

  it('builds up to four puzzles and skips invalid pairs mid-pack', () => {
    const puzzles = buildWordPuzzles([
      { wordRw: 'inzu', glossEn: 'house', propType: 'hut' },
      { wordRw: 'x', glossEn: 'tiny', propType: 'rock' },
      { wordRw: 'ingoma', glossEn: 'drum', propType: 'drum' },
      { wordRw: 'ihene', glossEn: '', propType: 'goat' },
      { wordRw: 'ibuye', glossEn: 'rock', propType: 'rock' },
      { wordRw: 'igiti', glossEn: 'tree', propType: 'tree' },
      { wordRw: 'intebe', glossEn: 'bench', propType: 'bench' },
    ]);
    expect(puzzles).toHaveLength(4);
    expect(puzzles.map((p) => p.word)).toEqual([
      'inzu',
      'ingoma',
      'ibuye',
      'igiti',
    ]);
  });

  it('explains words in kid language without sticker icons', () => {
    expect(kidWordBlurb('stall', 'market stall')).toMatch(/shop|market/i);
    expect(kidWordBlurb('unknown_prop', 'widget')).toMatch(/widget/);
  });
});
