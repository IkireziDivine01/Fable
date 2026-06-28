import { NextResponse } from 'next/server';
import { signUpWithInvitationCode, validateInvitationCode } from '@/lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const code = String(body.code || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();

  if (!code || !email || !password || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: code, email, password, name' },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const result = await signUpWithInvitationCode({ code, email, password, name });
    return NextResponse.json({ success: true, userId: result.userId, role: result.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Onboarding failed' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code');
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
