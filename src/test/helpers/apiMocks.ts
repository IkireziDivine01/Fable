import type { StorySessionContext } from '@/lib/auth-server';
import type { UserRole } from '@/lib/roles';

export const HOUSEHOLD_ID = 'hh-test-1';
export const AUTHOR_ID = 'user-test-1';

export function sessionFor(role: UserRole) {
  return {
    user: {
      id: AUTHOR_ID,
      email: `${role}@example.com`,
      name: `Test ${role}`,
      householdId: HOUSEHOLD_ID,
      role,
    },
  };
}

export function storyCtx(role: UserRole): StorySessionContext {
  return {
    authorId: AUTHOR_ID,
    householdId: HOUSEHOLD_ID,
    role,
  };
}

export const parentCtx = storyCtx('parent');
export const elderCtx = storyCtx('elder');
export const kidCtx = storyCtx('kid');

export function jsonRequest(url: string, body: unknown, method = 'POST') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function readJson<T = Record<string, unknown>>(res: Response) {
  return { status: res.status, body: (await res.json()) as T };
}

/** Minimal valid bilingual sentence payload for story create tests. */
export function threeValidSentences() {
  return [
    {
      text: 'The village woke early.',
      order: 0,
      kinyarwandaText: 'Umudugudu wabyutse kare.',
    },
    {
      text: 'Ama sang by the fire.',
      order: 1,
      kinyarwandaText: 'Ama yaririmbye ku gicaniro.',
    },
    {
      text: 'Everyone shared the beat.',
      order: 2,
      kinyarwandaText: 'Bose basangiye umuvuduko.',
    },
  ];
}
