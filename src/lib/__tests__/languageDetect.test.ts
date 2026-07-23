import { describe, expect, it } from 'vitest';
import { looksLikeKinyarwanda } from '@/lib/languageDetect';

describe('looksLikeKinyarwanda', () => {
  it('detects Kinyarwanda story text', () => {
    const rw =
      'Nuko nyina atangira gutabaza abahisi n\'abagenzi, ashaka uwamurangira umuti wo kumurutsa. Mbese ubundi urinda kwiba?';
    expect(looksLikeKinyarwanda(rw)).toBe(true);
  });

  it('detects English story text', () => {
    const en =
      'The sun was high when Amara and Kofi arrived at the village market together, and they said they would help.';
    expect(looksLikeKinyarwanda(en)).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(looksLikeKinyarwanda('')).toBe(false);
  });
});
