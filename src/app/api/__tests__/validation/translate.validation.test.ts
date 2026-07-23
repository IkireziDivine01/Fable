import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  jsonRequest,
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

vi.mock('@/lib/translate', () => ({
  translateLines: vi.fn(),
}));

import { auth } from '@/auth';
import { resolveStorySession } from '@/lib/auth-server';
import { POST } from '@/app/api/translate/route';

const authMock = vi.mocked(auth);
const resolveMock = vi.mocked(resolveStorySession);

describe('POST /api/translate validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null as never);
    resolveMock.mockResolvedValue(null);

    const res = await POST(
      jsonRequest('http://localhost/api/translate', {
        texts: ['Hello'],
        target: 'rw',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('returns 400 for an unsupported target language', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const res = await POST(
      jsonRequest('http://localhost/api/translate', {
        texts: ['Hello'],
        target: 'fr',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/Supported translation targets/i);
  });

  it('returns 400 when texts is missing or empty', async () => {
    authMock.mockResolvedValue(sessionFor('parent') as never);
    resolveMock.mockResolvedValue(parentCtx);

    const res = await POST(
      jsonRequest('http://localhost/api/translate', {
        texts: [],
        target: 'rw',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/texts array is required/i);
  });
});
