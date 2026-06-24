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
    .select('*')
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
  household_id UUID REFERENCES households(id),
  created_at TIMESTAMP DEFAULT NOW()
);
`
      : `Failed to fetch profile: ${error.message}`;

    const rlsMessage = error.message.includes('row-level security') || error.details?.includes('row-level security')
      ? `${missingTableMessage}\n\nIt also looks like row-level security is enabled on 'user_profiles'. Add a policy that allows authenticated users to select their own profile.`
      : missingTableMessage;

    throw new Error(rlsMessage);
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
