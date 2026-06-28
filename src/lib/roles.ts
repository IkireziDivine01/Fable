/** Canonical database role values */
export type UserRole = 'parent' | 'kid' | 'elder';

export type AccountStatus = 'active' | 'pending';

export type InviteRole = 'kid' | 'elder';

export const ROLE_LABELS: Record<UserRole, string> = {
  parent: 'Parent / Guardian',
  kid: 'Learner',
  elder: 'Author / Elder',
};

export const ROLE_HOME: Record<UserRole, string> = {
  parent: '/parent/dashboard',
  kid: '/kid/library',
  elder: '/elder/dashboard',
};

export function roleHome(role?: string | null, accountStatus?: string | null): string {
  if (role === 'kid' && accountStatus === 'pending') {
    return '/auth/pending';
  }
  if (role === 'parent') return ROLE_HOME.parent;
  if (role === 'kid') return ROLE_HOME.kid;
  if (role === 'elder') return ROLE_HOME.elder;
  return '/auth/signin';
}

/** Normalize legacy DB/API values to canonical roles */
export function normalizeRole(value?: string | null): UserRole | null {
  if (!value) return null;
  if (value === 'author' || value === 'learner') return value === 'author' ? 'elder' : 'kid';
  if (value === 'parent' || value === 'kid' || value === 'elder') return value;
  return null;
}

export function normalizeInviteRole(value?: string | null): InviteRole | null {
  const role = normalizeRole(value);
  if (role === 'kid' || role === 'elder') return role;
  return null;
}

export function displayRole(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (!normalized) return 'Member';
  return ROLE_LABELS[normalized];
}

export function canAccessParentRoutes(role?: string | null): boolean {
  return normalizeRole(role) === 'parent';
}

export function canAccessKidRoutes(role?: string | null, accountStatus?: string | null): boolean {
  return normalizeRole(role) === 'kid' && accountStatus !== 'pending';
}

export function canAccessElderRoutes(role?: string | null): boolean {
  return normalizeRole(role) === 'elder';
}
