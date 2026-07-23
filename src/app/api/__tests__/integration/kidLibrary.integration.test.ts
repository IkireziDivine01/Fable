import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTHOR_ID,
  HOUSEHOLD_ID,
  kidCtx,
  parentCtx,
  readJson,
  sessionFor,
} from '@/test/helpers/apiMocks';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  resolveStorySession: vi.fn(),
}));

vi.mock('@/lib/stories-server', () => ({
  getKidLearningStars: vi.fn(),
  getKidLibraryWithProgress: vi.fn(),
}));

import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  getKidLearningStars,
  getKidLibraryWithProgress,
} from '@/lib/stories-server';
import { GET } from '@/app/api/kid/library/route';

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveStorySession);
const libraryMock = vi.mocked(getKidLibraryWithProgress);
const starsMock = vi.mocked(getKidLearningStars);

describe('GET /api/kid/library integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns library stories, shelf counts, and stars for a learner', async () => {
    authMock.mockResolvedValue(sessionFor('kid') as never);
    resolveMock.mockResolvedValue(kidCtx);
    libraryMock.mockResolvedValue([
      { id: 's1', readStatus: 'new', isFresh: true },
      { id: 's2', readStatus: 'new', isFresh: false },
      { id: 's3', readStatus: 'reading', isFresh: false },
      { id: 's4', readStatus: 'completed', isFresh: false },
    ] as never);
    starsMock.mockResolvedValue({ total: 3, recent: [] } as never);

    const res = await GET();
    const { status, body } = await readJson<{
      stories: unknown[];
      counts: Record<string, number>;
      stars: { total: number };
    }>(res);

    expect(status).toBe(200);
    expect(body.stories).toHaveLength(4);
    expect(body.counts).toEqual({
      new: 1,
      unread: 2,
      reading: 1,
      completed: 1,
      total: 4,
    });
    expect(body.stars.total).toBe(3);
    expect(libraryMock).toHaveBeenCalledWith(HOUSEHOLD_ID, AUTHOR_ID);
    expect(starsMock).toHaveBeenCalledWith(HOUSEHOLD_ID, AUTHOR_ID);
  });

  it('returns 403 when a parent calls the learner library endpoint', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const res = await GET();
    const { status, body } = await readJson(res);

    expect(status).toBe(403);
    expect(body.error).toBe('Learners only');
    expect(libraryMock).not.toHaveBeenCalled();
  });
});
