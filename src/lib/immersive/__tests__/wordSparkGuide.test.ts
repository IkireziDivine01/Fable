import { describe, expect, it } from 'vitest';
import {
  definitionFromVocabPair,
  pickSparkCopy,
  tokenizeDialogue,
  tokenizeVisibleDialogue,
  WORD_SPARK_GUIDE,
} from '../wordSparkGuide';

describe('wordSparkGuide', () => {
  it('exposes Keza as the fixed guide', () => {
    expect(WORD_SPARK_GUIDE.name).toBe('Keza');
  });

  it('tokenizes tappable words and skips tiny ones', () => {
    const tokens = tokenizeDialogue('The brave girl walked home.');
    const words = tokens.filter((t) => t.kind === 'word');
    const tappable = words.filter((t) => t.tappable).map((t) => t.text);
    expect(tappable).toEqual(['brave', 'girl', 'walked', 'home']);
  });

  it('builds bilingual glosses from vocab_match pairs', () => {
    const def = definitionFromVocabPair('ingoma', [
      { wordRw: 'ingoma', glossEn: 'drum', propType: 'drum' },
    ]);
    expect(def?.wordEn).toBe('drum');
    expect(def?.wordRw).toBe('ingoma');
    expect(def?.meaningEn.toLowerCase()).toContain('drum');
    expect(def?.meaningRw.toLowerCase()).toContain('ingoma');
    expect(pickSparkCopy(def!, 'rw').whisper.toLowerCase()).toContain('ingoma');
  });

  it('only exposes fully revealed words while typewriting', () => {
    const full = 'The brave girl walked home.';
    const mid = tokenizeVisibleDialogue(full, 'The brave gi'.length);
    const tappable = mid
      .filter((t) => t.kind === 'word' && t.tappable)
      .map((t) => (t.kind === 'word' ? t.text : ''));
    expect(tappable).toEqual(['brave']);
  });
});
