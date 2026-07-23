import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
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
import { POST } from '@/app/api/stories/route';

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveStorySession);

describe('POST /api/stories validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null as never);
    resolveMock.mockResolvedValue(null);

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: 'A story',
        transcript: 'One. Two. Three.',
        sentences: threeValidSentences(),
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('returns 403 when a learner tries to create a story', async () => {
    authMock.mockResolvedValue(sessionFor('kid') as never);
    resolveMock.mockResolvedValue(kidCtx);

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: 'A story',
        transcript: 'One. Two. Three.',
        sentences: threeValidSentences(),
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(403);
    expect(body.error).toMatch(/parents and authors/i);
  });

  it('returns 400 when title, transcript, or sentence count is insufficient', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: '',
        transcript: 'Only one sentence.',
        sentences: threeValidSentences().slice(0, 1),
        source: 'Oral tradition',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/at least 3 sentences/i);
  });

  it('returns 400 when Kinyarwanda is missing on a sentence', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const sentences = threeValidSentences();
    sentences[1] = { ...sentences[1], kinyarwandaText: '' };

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: 'The Drum',
        transcript: 'The village woke early. Ama sang by the fire. Everyone shared the beat.',
        sentences,
        source: 'Oral tradition',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/Kinyarwanda is required/i);
  });

  it('returns 400 when a parent creates a manual story without a source citation', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const res = await POST(
      jsonRequest('http://localhost/api/stories', {
        title: 'The Drum',
        transcript: 'The village woke early. Ama sang by the fire. Everyone shared the beat.',
        generationType: 'manual',
        sentences: threeValidSentences(),
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/cite the source/i);
  });
});
