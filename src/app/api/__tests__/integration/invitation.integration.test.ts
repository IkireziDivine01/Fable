import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonRequest, readJson } from '@/test/helpers/apiMocks';

vi.mock('@/lib/auth-server', () => ({
  validateInvitationCode: vi.fn(),
}));

import { validateInvitationCode } from '@/lib/auth-server';
import { POST } from '@/app/api/auth/validate-invitation/route';

const validateMock = vi.mocked(validateInvitationCode);

describe('POST /api/auth/validate-invitation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invitation details when the code is valid', async () => {
    validateMock.mockResolvedValue({
      id: 'inv-1',
      role: 'kid',
      nameHint: 'Ama',
      expiresAt: '2026-12-31T00:00:00.000Z',
      householdId: 'hh-1',
      invitedBy: 'parent-1',
      inviterName: 'Parent One',
    });

    const res = await POST(
      jsonRequest('http://localhost/api/auth/validate-invitation', {
        code: 'ABC123',
      })
    );
    const { status, body } = await readJson<{
      success: boolean;
      role: string;
      nameHint: string;
      expiresAt: string;
      inviterName: string;
    }>(res);

    expect(status).toBe(200);
    expect(body).toEqual({
      success: true,
      role: 'kid',
      nameHint: 'Ama',
      expiresAt: '2026-12-31T00:00:00.000Z',
      inviterName: 'Parent One',
    });
    expect(validateMock).toHaveBeenCalledWith('ABC123');
  });

  it('returns 400 when the invitation service rejects the code', async () => {
    validateMock.mockRejectedValue(new Error('Invitation code not found'));

    const res = await POST(
      jsonRequest('http://localhost/api/auth/validate-invitation', {
        code: 'BADCODE',
      })
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(400);
    expect(body.error).toBe('Invitation code not found');
  });
});
