/**
 * Pure helpers for Letter Party / learning stars (no DB imports).
 */

/** Stars from Letter Party / word_build ACTIVITY_COMPLETED metadata. */
export function starsFromActivityMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0;
  const m = metadata as Record<string, unknown>;
  const activityType = String(m.activityType ?? '');
  if (activityType && activityType !== 'word_build' && activityType !== 'glow_trail') {
    return 0;
  }
  // Prefer explicit stars; fall back to score for older logs
  const raw = m.stars ?? m.score;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(20, Math.floor(n));
}
