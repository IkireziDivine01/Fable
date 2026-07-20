import type {
  CharacterAccessory,
  CharacterType,
  DisplayLanguage,
  HairStyle,
  VocabMatchPair,
} from './types';

/** Keza — Fable’s dedicated Word Spark guide (UI mascot only). */
export const WORD_SPARK_GUIDE = {
  name: 'Keza',
  greetingEn: "Keza's here!",
  greetingRw: 'Keza yaje!',
  whisperLabelEn: 'Keza whispers',
  whisperLabelRw: 'Keza avuga',
  loadingEn: 'Keza is sparkling…',
  loadingRw: 'Keza araranga…',
  personality:
    'curious, warm, a little mischievous word-collector who explains like a clever older sister — never lecturing, never scary',
  /** Locked portrait so kids always recognize her */
  portrait: {
    type: 'girl' as CharacterType,
    skinColor: '#A67C52',
    garmentColor: '#FF7956',
    accentColor: '#C4A574',
    eyeColor: '#1a120c',
    hasBlush: true,
    blushColor: '#e8a090',
    hairStyle: 'braids' as HairStyle,
    hairColor: '#1e1b18',
    accessories: ['necklace'] as CharacterAccessory[],
  },
} as const;

export type WordSparkDefinition = {
  wordEn: string;
  wordRw: string;
  meaningEn: string;
  meaningRw: string;
  whisperEn: string;
  whisperRw: string;
};

/** Tiny function words kids don’t need to tap */
const SKIP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'of',
  'to',
  'in',
  'on',
  'at',
  'is',
  'are',
  'was',
  'were',
  'be',
  'am',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'me',
  'him',
  'them',
  'this',
  'that',
  'with',
  'for',
  'as',
  'by',
  'from',
  'so',
  'not',
  'no',
  'yes',
  'oh',
  'ah',
  'um',
  // Kinyarwanda particles / tiny words
  'ni',
  'na',
  'no',
  'ya',
  'yo',
  'ye',
  'ku',
  'mu',
  'kwa',
  'ko',
  'ca',
  'cy',
  'bya',
  'byo',
  'rya',
  'ryo',
  'za',
  'zo',
  'wa',
  'wo',
  'ba',
  'bo',
]);

export type DialogueToken =
  | { kind: 'word'; text: string; raw: string; tappable: boolean }
  | { kind: 'gap'; text: string };

/** Split dialogue into tappable words + gaps (spaces/punctuation). */
export function tokenizeDialogue(text: string): DialogueToken[] {
  const tokens: DialogueToken[] = [];
  const re = /(\s+)|([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) {
      tokens.push({ kind: 'gap', text: match[1] });
      continue;
    }
    const raw = match[2] ?? '';
    const cleaned = raw.replace(/^[^A-Za-zÀ-ÿŪūĪīĒēŌō]+|[^A-Za-zÀ-ÿŪūĪīĒēŌō']+$/g, '');
    const key = cleaned.toLowerCase();
    const tappable =
      cleaned.length >= 3 && !SKIP_WORDS.has(key) && /[A-Za-zÀ-ÿŪūĪīĒēŌō]/.test(cleaned);
    tokens.push({ kind: 'word', text: cleaned || raw, raw, tappable });
  }
  return tokens;
}

/**
 * Tokenize the full line, but only include characters revealed so far
 * (typewriter). Partial trailing words stay plain text, not tappable.
 */
export function tokenizeVisibleDialogue(fullText: string, visibleLength: number): DialogueToken[] {
  const visibleLen = Math.max(0, Math.min(visibleLength, fullText.length));
  if (visibleLen <= 0) return [];
  if (visibleLen >= fullText.length) return tokenizeDialogue(fullText);

  const all = tokenizeDialogue(fullText);
  const out: DialogueToken[] = [];
  let pos = 0;

  for (const token of all) {
    const chunk = token.kind === 'gap' ? token.text : token.raw;
    const end = pos + chunk.length;
    if (pos >= visibleLen) break;

    if (end <= visibleLen) {
      out.push(token);
      pos = end;
      continue;
    }

    const slice = chunk.slice(0, visibleLen - pos);
    if (slice) out.push({ kind: 'gap', text: slice });
    break;
  }

  return out;
}

export function guideGreeting(lang: DisplayLanguage): string {
  return lang === 'rw' ? WORD_SPARK_GUIDE.greetingRw : WORD_SPARK_GUIDE.greetingEn;
}

export function guideWhisperLabel(lang: DisplayLanguage): string {
  return lang === 'rw' ? WORD_SPARK_GUIDE.whisperLabelRw : WORD_SPARK_GUIDE.whisperLabelEn;
}

export function guideLoading(lang: DisplayLanguage): string {
  return lang === 'rw' ? WORD_SPARK_GUIDE.loadingRw : WORD_SPARK_GUIDE.loadingEn;
}

function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}']+/gu, '');
}

/** Instant definition when the word matches a vocab_match pair. */
export function definitionFromVocabPair(
  word: string,
  pairs: VocabMatchPair[]
): WordSparkDefinition | null {
  const key = normalizeWord(word);
  if (!key) return null;

  const pair = pairs.find(
    (p) => normalizeWord(p.wordRw) === key || normalizeWord(p.glossEn) === key
  );
  if (!pair) return null;

  const wordEn = pair.glossEn.trim();
  const wordRw = pair.wordRw.trim();

  return {
    wordEn,
    wordRw,
    meaningEn: `“${wordEn}” is like “${wordRw}” — cool!`,
    meaningRw: `“${wordRw}” bisobanura “${wordEn}” — ryiza!`,
    whisperEn: `Say “${wordRw}” with me — it means “${wordEn}”!`,
    whisperRw: `Vuga “${wordRw}” — bisobanura “${wordEn}”!`,
  };
}

export function pickSparkCopy(
  definition: WordSparkDefinition,
  lang: DisplayLanguage
): { word: string; meaning: string; whisper: string } {
  if (lang === 'rw') {
    return {
      word: definition.wordRw,
      meaning: definition.meaningRw,
      whisper: definition.whisperRw,
    };
  }
  return {
    word: definition.wordEn,
    meaning: definition.meaningEn,
    whisper: definition.whisperEn,
  };
}
