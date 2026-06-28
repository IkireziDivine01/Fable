import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `Missing Supabase environment variables. Please add to .env.local:
  NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? '✓' : '✗ missing'}
  NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey ? '✓' : '✗ missing'}
  
Get your credentials from: https://supabase.com → Select Project → Settings → API`;
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
  
  console.warn('[Supabase] Warning:', errorMsg);
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
  
/**
 * Sign up a new user and create their profile
 */
export async function signUpUser(
  email: string,
  password: string,
  name: string,
  householdName: string,
  role: 'parent' | 'learner' | 'elder'
) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Sign up failed: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('User creation failed');
  }

  // Create household if this is the first parent
  const { data: householdData } = await supabase
    .from('households')
    .select('id')
    .eq('name', householdName)
    .single();

  let householdId = householdData?.id;

  if (!householdId) {
    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert([{ name: householdName }])
      .select('id')
      .single();

    if (householdError) {
      throw new Error(`Household creation failed: ${householdError.message}`);
    }

    householdId = newHousehold.id;
  }

  // Create user profile
  const { error: profileError } = await supabase.from('user_profiles').insert([
    {
      id: authData.user.id,
      email,
      name,
      role,
      household_id: householdId,
      created_at: new Date().toISOString(),
    },
  ]);

  if (profileError) {
    const missingTableMessage = profileError.message.includes('does not exist') || profileError.details?.includes('does not exist')
      ? `Profile creation failed because the Supabase table 'user_profiles' does not exist. Create it in your Supabase project using:

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'parent',
  household_id UUID REFERENCES households(id),
  created_at TIMESTAMP DEFAULT NOW()
);
`
      : `Profile creation failed: ${profileError.message}`;

    const rlsMessage = profileError.message.includes('row-level security') || profileError.details?.includes('row-level security')
      ? `${missingTableMessage}\n\nIt also looks like row-level security is enabled on 'user_profiles'. Add a policy that allows authenticated users to insert their own profile.`
      : missingTableMessage;

    throw new Error(rlsMessage);
  }

  return authData.user;
} 

/**
 * Sign in user with email and password
 */
export async function signInUser(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign in failed');
  }

  return data.user;
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      email,
      name,
      role,
      local_pin,
      household_id,
      invited_by,
      created_at,
      updated_at
    `)
    .eq('id', userId)
    .single();

  if (error) {
    const missingTableMessage = error.message.includes('does not exist') || error.details?.includes('does not exist')
      ? `Failed to fetch profile because the Supabase table 'user_profiles' does not exist. Create it in your Supabase project using:

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'parent',
  local_pin TEXT,
  household_id UUID REFERENCES households(id),
  invited_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`
      : `Failed to fetch profile: ${error.message}`;

    const rlsMessage = error.message.includes('row-level security') || error.details?.includes('row-level security')
      ? `${missingTableMessage}\n\nIt also looks like row-level security is enabled on 'user_profiles'. Add a policy that allows authenticated users to select their own profile.`
      : missingTableMessage;

    throw new Error(rlsMessage);
  }

  // Map snake_case from database to camelCase for the app
  if (data) {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      localPin: data.local_pin,
      householdId: data.household_id,
      invitedBy: data.invited_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  return data;
}

/**
 * Fetch all stories for a household
 */
export async function getStoriesByHousehold(householdId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch stories: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch story sentences by story ID
 */
export async function getStorySentences(storyId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('story_sentences')
    .select('*')
    .eq('story_id', storyId)
    .order('sentence_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sentences: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new story
 */
export async function createStory(
  householdId: string,
  authorId: string,
  title: string,
  status: 'draft' | 'published' = 'draft'
) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('stories')
    .insert([
      {
        household_id: householdId,
        author_id: authorId,
        title,
        status,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create story: ${error.message}`);
  }

  return data;
}

/**
 * Generate an invitation code for a kid or elder
 */
export async function generateInvitation(
  householdId: string,
  role: 'kid' | 'author',
  nameHint?: string
) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) {
    throw new Error('Must be authenticated to generate invitations');
  }

  // Generate a random 12-character code
  const code = Math.random().toString(36).substring(2, 14).toUpperCase().slice(0, 12);

  const { data: inviteData, error } = await supabase
    .from('invitations')
    .insert([
      {
        household_id: householdId,
        code,
        role,
        invited_by: data.session.user.id,
        name_hint: nameHint,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  return inviteData;
}

/**
 * Validate and get invitation details
 */
export async function validateInvitation(code: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    throw new Error('Invitation code not found');
  }

  // Check if already used
  if (data.used_at) {
    throw new Error('This invitation code has already been used');
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('This invitation code has expired');
  }

  return data;
}

/**
 * Sign up a kid or elder using an invitation code
 */
export async function signUpWithInvitation(
  code: string,
  email: string,
  password: string,
  name: string
) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  // Validate invitation
  const invitation = await validateInvitation(code);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Sign up failed: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('User creation failed');
  }

  // Create user profile with invitation details
  const { error: profileError } = await supabase.from('user_profiles').insert([
    {
      id: authData.user.id,
      email,
      name,
      role: invitation.role,
      household_id: invitation.household_id,
      invited_by: invitation.invited_by,
      created_at: new Date().toISOString(),
    },
  ]);

  if (profileError) {
    throw new Error(`Profile creation failed: ${profileError.message}`);
  }

  // Mark invitation as used
  const { error: updateError } = await supabase
    .from('invitations')
    .update({
      used_at: new Date().toISOString(),
      used_by: authData.user.id,
    })
    .eq('id', invitation.id);

  if (updateError) {
    console.error('Warning: Failed to mark invitation as used:', updateError.message);
  }

  return authData.user;
}

/**
 * Get all pending invitations for a household
 */
export async function getInvitationsByHousehold(householdId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all members of a household
 */
export async function getUsersByHousehold(householdId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch household members: ${error.message}`);
  }

  return data || [];
}

/**
 * Cancel an invitation (only if not used)
 */
export async function cancelInvitation(invitationId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add environment variables to .env.local');
  }

  const { data, error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('used_at', null); // Only delete if not used

  if (error) {
    throw new Error(`Failed to cancel invitation: ${error.message}`);
  }

  return data;
}
