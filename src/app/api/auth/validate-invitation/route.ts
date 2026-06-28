import { NextResponse } from 'next/server';
import { validateInvitationCode } from '@/lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const code = String(body.code || '').trim();

  if (!code) {
    return NextResponse.json({ error: 'Invitation code is required' }, { status: 400 });
  }

  try {
    const invitation = await validateInvitationCode(code);
    return NextResponse.json({
      success: true,
      role: invitation.role,
      nameHint: invitation.nameHint,
      expiresAt: invitation.expiresAt,
      inviterName: invitation.inviterName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate invitation' },
      { status: 400 }
    );
  }
}
