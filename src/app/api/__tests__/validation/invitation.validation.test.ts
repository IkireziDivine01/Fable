import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonRequest, readJson } from '@/test/helpers/apiMocks';

vi.mock('@/lib/auth-server', () => ({
  validateInvitationCode: vi.fn(),
}));

import { POST } from '@/app/api/auth/validate-invitation/route';

describe('POST /api/auth/validate-invitation validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when invitation code is missing', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/validate-invitation', {})
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toBe('Invitation code is required');
  });

  it('returns 400 when invitation code is blank', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/validate-invitation', {
        code: '   ',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toBe('Invitation code is required');
  });
});
