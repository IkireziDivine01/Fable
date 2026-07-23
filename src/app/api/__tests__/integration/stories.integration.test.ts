import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTHOR_ID,
  HOUSEHOLD_ID,
  elderCtx,
  jsonRequest,
  kidCtx,
  parentCtx,
  readJson,
  sessionFor,
  threeValidSentences,
} from '@/test/helpers/apiMocks';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  resolveStorySession: vi.fn(),
}));

vi.mock('@/lib/stories-server', () => ({
  createStoryWithSentences: vi.fn(),
  listStoriesForHousehold: vi.fn(),
}));

import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import {
  createStoryWithSentences,
  listStoriesForHousehold,
} from '@/lib/stories-server';
import { GET, POST } from '@/app/api/stories/route';

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveStorySession);
const listMock = vi.mocked(listStoriesForHousehold);
const createMock = vi.mocked(createStoryWithSentences);

describe('stories API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists household stories for a parent', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);
    listMock.mockResolvedValue([{ id: 'story-1', title: 'The Drum' }] as never);

    const res = await GET();
    const { status, body } = await readJson(res);

    expect(status).toBe(200);
    expect(body).toEqual([{ id: 'story-1', title: 'The Drum' }]);
    expect(listMock).toHaveBeenCalledWith(HOUSEHOLD_ID, { publishedOnly: false });
  });

  it('lists published-only stories for a learner', async () => {
    authMock.mockResolvedValue(sessionFor('kid') as never);
    resolveMock.mockResolvedValue(kidCtx);
    listMock.mockResolvedValue([{ id: 'story-2', title: 'Published tale' }] as never);

    const res = await GET();
    const { status, body } = await readJson(res);

    expect(status).toBe(200);
    expect(body).toEqual([{ id: 'story-2', title: 'Published tale' }]);
    expect(listMock).toHaveBeenCalledWith(HOUSEHOLD_ID, { publishedOnly: true });
  });

  it('creates a story for an elder through auth and persistence layers', async () => {
    authMock.mockResolvedValue(sessionFor('elder') as never);
    resolveMock.mockResolvedValue(elderCtx);
    createMock.mockResolvedValue({
      story: { id: 'story-new', title: 'The Drum' },
      sentences: threeValidSentences(),
    } as never);

    const payload = {
      title: 'The Drum',
      transcript: 'The village woke early. Ama sang by the fire. Everyone shared the beat.',
      generationType: 'manual',
      themes: ['Ubuntu'],
      sentences: threeValidSentences(),
    };

    const res = await POST(jsonRequest('http://localhost/api/stories', payload));
    const { status, body } = await readJson<{
      story: { id: string; title: string };
    }>(res);

    expect(status).toBe(200);
    expect(body.story.id).toBe('story-new');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: HOUSEHOLD_ID,
        authorId: AUTHOR_ID,
        title: 'The Drum',
        generationType: 'manual',
        status: 'draft',
      })
    );
  });

  it('creates a manual story for a parent when source is cited', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);
    createMock.mockResolvedValue({
      story: { id: 'story-parent', title: 'The Drum' },
      sentences: threeValidSentences(),
    } as never);

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: 'The Drum',
        transcript: 'The village woke early. Ama sang by the fire. Everyone shared the beat.',
        generationType: 'manual',
        sentences: threeValidSentences(),
        source: 'Oral tradition',
      })
    );
    const { status, body } = await readJson<{
      story: { id: string };
    }>(res);

    expect(status).toBe(200);
    expect(body.story.id).toBe('story-parent');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'Oral tradition' })
    );
  });
});
