import { describe, expect, it } from 'vitest';
import { starsFromActivityMetadata } from '../learningStars';

describe('starsFromActivityMetadata', () => {
  it('reads stars from Letter Party word_build logs', () => {
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        stars: 3,
        score: 3,
        total: 3,
      })
    ).toBe(3);
  });

  it('accepts glow_trail logs', () => {
    expect(
      starsFromActivityMetadata({
        activityType: 'glow_trail',
        stars: 4,
      })
    ).toBe(4);
  });

  it('falls back to score for older logs', () => {
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        score: 2,
        total: 3,
      })
    ).toBe(2);
  });

  it('coerces numeric strings and clamps to 20', () => {
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        stars: '5',
      })
    ).toBe(5);
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        stars: 99,
      })
    ).toBe(20);
  });

  it('counts stars when activityType is missing', () => {
    expect(starsFromActivityMetadata({ stars: 2 })).toBe(2);
  });

  it('ignores predict_next, non-positive, and empty metadata', () => {
    expect(
      starsFromActivityMetadata({
        activityType: 'predict_next',
        correct: true,
        stars: 5,
      })
    ).toBe(0);
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        stars: 0,
      })
    ).toBe(0);
    expect(
      starsFromActivityMetadata({
        activityType: 'word_build',
        stars: 'nope',
      })
    ).toBe(0);
    expect(starsFromActivityMetadata(null)).toBe(0);
    expect(starsFromActivityMetadata('x')).toBe(0);
  });
});
