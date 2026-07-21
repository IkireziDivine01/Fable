import type { VocabMatchPair } from './types';

export type WordBuildSlot = {
  char: string;
  blank: boolean;
};

export type WordBuildPuzzle = {
  word: string;
  glossEn: string;
  propType: string;
  slots: WordBuildSlot[];
  /** Shuffled answer choices (1 correct + distractors) */
  choices: string[];
  blankIndex: number;
  correctLetter: string;
};

/** Short kid-facing blurb — bilingual card uses this instead of sticker icons */
const KID_BLURBS: Partial<Record<string, string>> = {
  tree: 'A tall plant with leaves — it gives shade in the story.',
  hut: 'A cozy home made of clay and straw.',
  fire: 'Warm light where people gather and tell stories.',
  stall: 'A little shop at the market where people sell things.',
  board: 'A flat board for lessons, drawings, or notes.',
  rock: 'A strong stone you might see by the path.',
  flower: 'A bright bloom that makes the world smile.',
  bench: 'A place to sit and listen to the story.',
  banana_tree: 'A tree with broad leaves and sweet bananas.',
  path: 'The road the story walks along.',
  water_jug: 'A jug that holds cool water to drink.',
  drum: 'An instrument you beat — boom, boom — for dancing.',
  goat: 'A friendly animal that says mee in the grass.',
  millet_field: 'A field of golden grain waving in the breeze.',
};

export function kidWordBlurb(propType: string, glossEn: string): string {
  return KID_BLURBS[propType] ?? `In our story, this word means “${glossEn}.”`;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function isLetter(ch: string): boolean {
  return /^[a-zàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]$/i.test(ch);
}

function nearbyLetters(letter: string, count: number, avoid: Set<string>): string[] {
  const base = letter.toLowerCase();
  const idx = ALPHABET.indexOf(base);
  const out: string[] = [];
  if (idx < 0) {
    for (const ch of ALPHABET) {
      if (avoid.has(ch)) continue;
      out.push(ch);
      if (out.length >= count) return out;
    }
    return out;
  }

  const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
  for (const off of offsets) {
    const ch = ALPHABET[(idx + off + ALPHABET.length * 3) % ALPHABET.length];
    if (!ch || avoid.has(ch) || ch === base) continue;
    out.push(ch);
    if (out.length >= count) break;
  }
  return out;
}

function pickBlankIndex(letters: string[]): number {
  const candidates = letters
    .map((ch, i) => ({ ch, i }))
    .filter(({ ch }) => isLetter(ch));
  if (candidates.length === 0) return 0;
  const mid = Math.floor(candidates.length / 2);
  return candidates[mid]?.i ?? candidates[0].i;
}

/**
 * One missing letter + playful distractor choices.
 * Keeps the word shape readable so kids guess from meaning + sound.
 */
export function buildWordPuzzle(pair: VocabMatchPair): WordBuildPuzzle | null {
  const word = pair.wordRw.trim().toLowerCase();
  const glossEn = pair.glossEn.trim();
  if (word.length < 2 || !glossEn) return null;

  const chars = [...word];
  const blankIndex = pickBlankIndex(chars);
  const correctLetter = chars[blankIndex];
  if (!correctLetter || !isLetter(correctLetter)) return null;

  const slots: WordBuildSlot[] = chars.map((char, i) => ({
    char,
    blank: i === blankIndex,
  }));

  const avoid = new Set<string>([correctLetter, ...chars.filter(isLetter)]);
  const distractors = nearbyLetters(correctLetter, 3, avoid);
  for (const ch of ALPHABET) {
    if (distractors.length >= 3) break;
    if (avoid.has(ch) || distractors.includes(ch)) continue;
    distractors.push(ch);
  }

  const choices = shuffleUnique([correctLetter, ...distractors.slice(0, 3)]);

  return {
    word,
    glossEn,
    propType: pair.propType,
    slots,
    choices,
    blankIndex,
    correctLetter,
  };
}

export function buildWordPuzzles(pairs: VocabMatchPair[]): WordBuildPuzzle[] {
  const puzzles: WordBuildPuzzle[] = [];
  for (const pair of pairs) {
    const puzzle = buildWordPuzzle(pair);
    if (puzzle) puzzles.push(puzzle);
    if (puzzles.length >= 4) break;
  }
  return puzzles;
}

function shuffleUnique(items: string[]): string[] {
  const copy = [...new Set(items)];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.length > 1 && copy[0] === items[0]) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}
