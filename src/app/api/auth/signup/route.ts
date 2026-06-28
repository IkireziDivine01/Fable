import { NextResponse } from 'next/server';
import { signUpKidPending, signUpParentOrElder } from '@/lib/auth-server';
import { normalizeRole } from '@/lib/roles';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const householdName = String(body.household || body.householdName || '').trim();
  const parentEmail = String(body.parentEmail || '').trim().toLowerCase();
  const roleInput = String(body.role || 'parent');
  const role = normalizeRole(roleInput);

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Missing required signup fields.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  try {
    if (role === 'kid') {
      if (!parentEmail) {
        return NextResponse.json({ error: 'Parent email is required for learner signup.' }, { status: 400 });
      }

      const result = await signUpKidPending({ email, password, name, parentEmail });
      return NextResponse.json({
        success: true,
        pending: true,
        parentName: result.parentName,
      });
    }

    if (role !== 'parent' && role !== 'elder') {
      return NextResponse.json({ error: 'Invalid signup role.' }, { status: 400 });
    }

    if (!householdName) {
      return NextResponse.json({ error: 'Household name is required.' }, { status: 400 });
    }

    await signUpParentOrElder({ email, password, name, householdName, role });
    return NextResponse.json({ success: true, pending: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected signup error.' },
      { status: 400 }
    );
  }
}
