import { supabaseAdmin } from './supabase-admin';
import type { AccountStatus, InviteRole, UserRole } from './roles';
import { normalizeInviteRole, normalizeRole } from './roles';

const MIGRATION_HINT =
  'Run supabase/auth_schema.sql in the Supabase SQL Editor (Dashboard → SQL → New query), then try again.';

const CORE_PROFILE_SELECT = 'id, email, name, role, household_id, created_at';
const BASE_PROFILE_SELECT = `${CORE_PROFILE_SELECT}, invited_by`;
const EXTENDED_PROFILE_SELECT = `${BASE_PROFILE_SELECT}, account_status, approved_by, parent_email`;

let profileSchemaMode: 'legacy' | 'extended' | null = null;

async function getProfileSchemaMode(): Promise<'legacy' | 'extended'> {
  if (profileSchemaMode) return profileSchemaMode;

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .select('account_status')
    .limit(1);

  profileSchemaMode =
    error?.message?.includes('account_status') ||
    error?.message?.includes('schema cache')
      ? 'legacy'
      : 'extended';

  return profileSchemaMode;
}

async function fetchProfileRow(filter: { column: 'id' | 'email'; value: string }) {
  const mode = await getProfileSchemaMode();
  const fieldSets =
    mode === 'extended'
      ? [EXTENDED_PROFILE_SELECT, BASE_PROFILE_SELECT, CORE_PROFILE_SELECT]
      : [BASE_PROFILE_SELECT, CORE_PROFILE_SELECT];

  for (const selectFields of fieldSets) {
    const query = supabaseAdmin.from('user_profiles').select(selectFields);
    const { data, error } =
      filter.column === 'id'
        ? await query.eq('id', filter.value).maybeSingle()
        : await query.eq('email', filter.value).maybeSingle();

    if (!error && data && typeof data === 'object' && 'id' in data) {
      return mapProfile(data as unknown as Record<string, unknown>);
    }
  }

  return null;
}

function stripExtendedProfileFields(row: Record<string, unknown>) {
  const { account_status, parent_email, approved_by, updated_at, ...base } = row;
  void account_status;
  void parent_email;
  void approved_by;
  void updated_at;
  return base;
}

async function insertUserProfile(row: Record<string, unknown>) {
  const mode = await getProfileSchemaMode();

  if (mode === 'legacy') {
    if (row.account_status === 'pending') {
      throw new Error(
        `Learner signup with parent approval requires extra database columns. ${MIGRATION_HINT}`
      );
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .insert([stripExtendedProfileFields(row)]);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabaseAdmin.from('user_profiles').insert([row]);
  if (error) throw new Error(error.message);
}

function randomCode(): string {
  return Math.random().toString(36).substring(2, 14).toUpperCase().slice(0, 12);
}

export interface ProfileRecord {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  householdId: string | null;
  accountStatus: AccountStatus;
  approvedBy: string | null;
  invitedBy: string | null;
  parentEmail: string | null;
  createdAt: string | null;
}

function mapProfile(row: Record<string, unknown>): ProfileRecord {
  return {
    id: String(row.id),
    email: (row.email as string) ?? null,
    name: (row.name as string) ?? null,
    role: normalizeRole(row.role as string) ?? 'parent',
    householdId: (row.household_id as string) ?? null,
    accountStatus: ((row.account_status as string) ?? 'active') as AccountStatus,
    approvedBy: (row.approved_by as string) ?? null,
    invitedBy: (row.invited_by as string) ?? null,
    parentEmail: (row.parent_email as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
  };
}

export async function getProfileById(userId: string): Promise<ProfileRecord | null> {
  return fetchProfileRow({ column: 'id', value: userId });
}

export async function getProfileByEmail(email: string): Promise<ProfileRecord | null> {
  return fetchProfileRow({ column: 'email', value: email.trim().toLowerCase() });
}

async function findOrCreateHousehold(name: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('households')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from('households')
    .insert([{ name }])
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create household');
  }

  return created.id;
}

export async function createAuthUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('User creation failed');
  return data.user;
}

export async function signUpParentOrElder(input: {
  email: string;
  password: string;
  name: string;
  householdName: string;
  role: 'parent' | 'elder';
}) {
  const user = await createAuthUser(input.email, input.password);
  const householdId = await findOrCreateHousehold(input.householdName.trim());

  await insertUserProfile({
    id: user.id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    household_id: householdId,
    account_status: 'active',
    created_at: new Date().toISOString(),
  });

  return { userId: user.id, householdId };
}

export async function signUpKidPending(input: {
  email: string;
  password: string;
  name: string;
  parentEmail: string;
}) {
  const parentEmail = input.parentEmail.trim().toLowerCase();
  const parent = await getProfileByEmail(parentEmail);

  if (!parent || parent.role !== 'parent') {
    throw new Error('No parent account found with that email. Ask your parent to sign up first.');
  }

  if (!parent.householdId) {
    throw new Error('That parent account is not linked to a household yet.');
  }

  const user = await createAuthUser(input.email, input.password);

  await insertUserProfile({
    id: user.id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: 'kid',
    household_id: parent.householdId,
    account_status: 'pending',
    parent_email: parentEmail,
    created_at: new Date().toISOString(),
  });

  return { userId: user.id, parentName: parent.name };
}

export async function approveKidAccount(parentId: string, kidId: string) {
  const parent = await getProfileById(parentId);
  if (!parent || parent.role !== 'parent') {
    throw new Error('Only parents can approve learner accounts');
  }

  const kid = await getProfileById(kidId);
  if (!kid || kid.role !== 'kid') {
    throw new Error('Learner account not found');
  }

  if (kid.householdId !== parent.householdId) {
    throw new Error('This learner is not in your household');
  }

  if (kid.accountStatus === 'active') {
    throw new Error('This account is already approved');
  }

  const mode = await getProfileSchemaMode();
  if (mode === 'legacy') {
    throw new Error(`Account approval is not available until the database is migrated. ${MIGRATION_HINT}`);
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      account_status: 'active',
      approved_by: parentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kidId);

  if (error) throw new Error(error.message);
}

export async function getPendingKidsForHousehold(householdId: string) {
  const mode = await getProfileSchemaMode();
  if (mode === 'legacy') return [];

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, name, role, account_status, parent_email, created_at')
    .eq('household_id', householdId)
    .eq('role', 'kid')
    .eq('account_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createInvitation(input: {
  householdId: string;
  invitedBy: string;
  role: InviteRole;
  nameHint?: string;
}) {
  const code = randomCode();

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .insert([
      {
        household_id: input.householdId,
        code,
        role: input.role,
        invited_by: input.invitedBy,
        name_hint: input.nameHint?.trim() || null,
      },
    ])
    .select('code, expires_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function validateInvitationCode(code: string) {
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error || !data) throw new Error('Invitation code not found');
  if (data.used_at) throw new Error('This invitation code has already been used');
  if (new Date(data.expires_at) < new Date()) throw new Error('This invitation code has expired');

  const inviteRole = normalizeInviteRole(data.role);
  if (!inviteRole) throw new Error('Invalid invitation role');

  const inviter = await getProfileById(data.invited_by as string);

  return {
    id: data.id as string,
    role: inviteRole,
    nameHint: (data.name_hint as string) ?? null,
    expiresAt: data.expires_at as string,
    householdId: data.household_id as string,
    invitedBy: data.invited_by as string,
    inviterName: inviter?.name ?? inviter?.email ?? 'Your family',
  };
}

export async function signUpWithInvitationCode(input: {
  code: string;
  email: string;
  password: string;
  name: string;
}) {
  const invitation = await validateInvitationCode(input.code);
  const user = await createAuthUser(input.email, input.password);

  await insertUserProfile({
    id: user.id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: invitation.role,
    household_id: invitation.householdId,
    invited_by: invitation.invitedBy,
    account_status: 'active',
    approved_by: invitation.invitedBy,
    created_at: new Date().toISOString(),
  });

  const { error: updateError } = await supabaseAdmin
    .from('invitations')
    .update({
      used_at: new Date().toISOString(),
      used_by: user.id,
    })
    .eq('id', invitation.id);

  if (updateError) {
    console.warn('Failed to mark invitation as used:', updateError.message);
  }

  return { userId: user.id, role: invitation.role };
}

export async function listHouseholdMembers(householdId: string) {
  const selectFields =
    (await getProfileSchemaMode()) === 'extended'
      ? 'id, email, name, role, account_status, created_at'
      : 'id, email, name, role, created_at';

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select(selectFields)
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Learners in a household — matches family page logic (kid + legacy learner role). */
export async function listHouseholdLearners(householdId: string) {
  const members = (await listHouseholdMembers(householdId)) as unknown as Record<string, unknown>[];
  return members.filter((member) => normalizeRole(String(member.role)) === 'kid');
}

export async function listHouseholdInvitations(householdId: string) {
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cancelInvitation(invitationId: string, householdId: string) {
  const { error } = await supabaseAdmin
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('household_id', householdId)
    .is('used_at', null);

  if (error) throw new Error(error.message);
}

export async function assertHouseholdAccess(
  sessionUserId: string,
  sessionHouseholdId: string | undefined,
  requestedHouseholdId: string
) {
  const profile = await getProfileById(sessionUserId);
  if (!profile || profile.role !== 'parent') {
    throw new Error('Forbidden');
  }

  const effectiveHouseholdId = profile.householdId ?? sessionHouseholdId;
  if (!effectiveHouseholdId || effectiveHouseholdId !== requestedHouseholdId) {
    throw new Error('Forbidden');
  }
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match?.id) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function resolveAuthUserId(userId: string, email?: string | null): Promise<string> {
  if (email) {
    const byEmail = await findAuthUserIdByEmail(email);
    if (byEmail) return byEmail;
  }

  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (data?.user?.id) return data.user.id;

  if (email) {
    const profile = await getProfileByEmail(email.trim().toLowerCase());
    if (profile?.id) {
      const { data: retry } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (retry?.user?.id) return retry.user.id;
    }
  }

  throw new Error(
    'Your login could not be matched to a Supabase account. Sign out and sign in again.'
  );
}

async function ensureUserProfileForStory(input: {
  authorId: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
  householdId: string;
}): Promise<ProfileRecord> {
  const existing = await getProfileById(input.authorId);
  if (existing) return existing;

  await insertUserProfile({
    id: input.authorId,
    email: input.email?.trim().toLowerCase() ?? null,
    name: input.name?.trim() || 'Family member',
    role: input.role,
    household_id: input.householdId,
    account_status: 'active',
    created_at: new Date().toISOString(),
  });

  const created = await getProfileById(input.authorId);
  if (!created) {
    throw new Error(`Could not create your profile record. ${MIGRATION_HINT}`);
  }
  return created;
}

/**
 * Resolve author + household for story API routes.
 * Verifies the session user exists in auth.users and has (or receives) a user_profiles row.
 */
export async function resolveStorySession(session: {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    householdId?: string;
    role?: string;
  };
} | null): Promise<StorySessionContext | null> {
  if (!session?.user) return null;

  let candidateId = session.user.id;
  if (!candidateId && session.user.email) {
    const byEmail = await getProfileByEmail(session.user.email);
    candidateId = byEmail?.id;
  }
  if (!candidateId) return null;

  const authorId = await resolveAuthUserId(candidateId, session.user.email);
  let profile = await getProfileById(authorId);

  if (!profile && session.user.email) {
    profile = await getProfileByEmail(session.user.email);
  }

  if (profile && profile.id !== authorId) {
    throw new Error(
      'Your account has a profile/auth ID mismatch. Open /api/parent/account-health while logged in for repair steps, or sign up again with a new email.'
    );
  }

  const householdId = profile?.householdId ?? session.user.householdId;
  if (!householdId) return null;

  const role = normalizeRole(profile?.role ?? session.user.role) ?? 'parent';

  if (!profile) {
    profile = await ensureUserProfileForStory({
      authorId,
      email: session.user.email,
      name: session.user.name,
      role,
      householdId,
    });
  }

  return {
    authorId,
    householdId,
    role: profile.role,
  };
}

export interface StorySessionContext {
  authorId: string;
  householdId: string;
  role: UserRole;
}

export interface AccountHealthReport {
  ok: boolean;
  role: string | null;
  sessionUserId: string | null;
  authUserId: string | null;
  profileId: string | null;
  householdId: string | null;
  email: string | null;
  issues: string[];
  canCreateStories: boolean;
  repairSql: string | null;
  nextSteps: string[];
}

export async function getAccountHealth(session: {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    householdId?: string;
    role?: string;
  };
}): Promise<AccountHealthReport> {
  const sessionUserId = session.user.id ?? null;
  const email = session.user.email?.trim().toLowerCase() ?? null;
  const authUserId = email ? await findAuthUserIdByEmail(email) : null;
  const profile = email
    ? await getProfileByEmail(email)
    : sessionUserId
      ? await getProfileById(sessionUserId)
      : null;

  const issues: string[] = [];

  if (!authUserId) {
    issues.push('No Supabase auth user found for your email.');
  }
  if (!profile) {
    issues.push('No user_profiles row found for your account.');
  }
  if (!profile?.householdId && !session.user.householdId) {
    issues.push('No household linked to your account.');
  }
  if (profile && authUserId && profile.id !== authUserId) {
    issues.push('Profile ID does not match auth user ID — this causes story save failures.');
  }
  if (sessionUserId && authUserId && sessionUserId !== authUserId) {
    issues.push('Session user ID does not match auth user ID — sign out and sign in again.');
  }

  const canCreateStories =
    Boolean(authUserId) &&
    Boolean(profile?.householdId ?? session.user.householdId) &&
    (!profile || !authUserId || profile.id === authUserId);

  let repairSql: string | null = null;
  if (email && authUserId && profile && profile.id !== authUserId) {
    repairSql = `-- Fix profile/auth mismatch for ${email}
DELETE FROM user_profiles WHERE email = '${email}';

INSERT INTO user_profiles (id, email, name, role, household_id, account_status)
VALUES (
  '${authUserId}',
  '${email}',
  '${profile.name ?? 'Parent'}',
  '${profile.role}',
  '${profile.householdId ?? session.user.householdId ?? 'YOUR-HOUSEHOLD-UUID'}',
  'active'
);`;
  }

  return {
    ok: canCreateStories,
    role: profile?.role ?? session.user.role ?? null,
    sessionUserId,
    authUserId,
    profileId: profile?.id ?? null,
    householdId: profile?.householdId ?? session.user.householdId ?? null,
    email,
    issues,
    canCreateStories,
    repairSql,
    nextSteps: canCreateStories
      ? ['Your account looks good. Try creating a story again.']
      : [
          'Run supabase/stories_schema.sql in Supabase SQL Editor.',
          'Sign out completely, then sign in again.',
          ...(repairSql ? ['Run the repairSql in Supabase if profile/auth IDs mismatch.'] : []),
        ],
  };
}
