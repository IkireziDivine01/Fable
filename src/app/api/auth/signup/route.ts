import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '');
  const householdName = String(body.household || '').trim();
  const role = String(body.role || 'parent') as 'parent' | 'learner' | 'elder';

  if (!email || !password || !name || !householdName) {
    return NextResponse.json({ error: 'Missing required signup fields.' }, { status: 400 });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed.' }, { status: 500 });
    }

    const userId = authData.user.id;

    const { data: existingHousehold, error: householdSelectError } = await supabaseAdmin
      .from('households')
      .select('id')
      .eq('name', householdName)
      .limit(1)
      .maybeSingle();

    if (householdSelectError) {
      return NextResponse.json({ error: householdSelectError.message }, { status: 500 });
    }

    let householdId = existingHousehold?.id;

    if (!householdId) {
      const { data: newHousehold, error: householdInsertError } = await supabaseAdmin
        .from('households')
        .insert([{ name: householdName }])
        .select('id')
        .single();

      if (householdInsertError) {
        return NextResponse.json({ error: householdInsertError.message }, { status: 500 });
      }

      householdId = newHousehold.id;
    }

    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert([
      {
        id: userId,
        email,
        name,
        role,
        household_id: householdId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected signup error.' },
      { status: 500 }
    );
  }
}
