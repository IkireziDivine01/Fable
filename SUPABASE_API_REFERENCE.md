# Supabase API Reference

Quick reference for all available functions in `src/lib/supabase.ts`

## Authentication Functions

### `signUpUser(email, password, name, householdName, role)`
Creates a new user account and user profile.
```tsx
await signUpUser('user@example.com', 'password123', 'John Doe', 'Smith Family', 'parent');
```

### `signInUser(email, password)`
Signs in a user with email and password. Returns the Supabase user object.
```tsx
const user = await signInUser('user@example.com', 'password123');
```

### `signOutUser()`
Signs out the current user.
```tsx
await signOutUser();
```

### `getCurrentSession()`
Gets the current session object.
```tsx
const session = await getCurrentSession();
```

## User Functions

### `getUserProfile(userId)`
Fetches a user's profile with their role and household.
```tsx
const profile = await getUserProfile(session.user.id);
// Returns: { id, email, name, role, household_id, created_at, updated_at }
```

## Household & Story Functions

### `getStoriesByHousehold(householdId)`
Fetches all stories for a household, most recent first.
```tsx
const stories = await getStoriesByHousehold(session.user.householdId);
// Returns array of stories with title, status, author_id, created_at, etc.
```

### `getStorySentences(storyId)`
Fetches all sentences for a story in order.
```tsx
const sentences = await getStorySentences(storyId);
// Returns: [{ id, story_id, sentence_text, sentence_order, created_at, ... }]
```

### `createStory(householdId, authorId, title, status?)`
Creates a new story in the database. Status defaults to 'draft'.
```tsx
const story = await createStory(
  session.user.householdId,
  session.user.id,
  'My First Story',
  'draft'
);
// Returns: { id, household_id, author_id, title, status, created_at, ... }
```

## Usage Examples

### Example 1: Fetching Stories in a Component
```tsx
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getStoriesByHousehold } from '@/lib/supabase';

export default function StoryList() {
  const { data: session } = useSession();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    if (session?.user?.householdId) {
      getStoriesByHousehold(session.user.householdId)
        .then(setStories)
        .catch(console.error);
    }
  }, [session?.user?.householdId]);

  return (
    <ul>
      {stories.map(story => (
        <li key={story.id}>{story.title}</li>
      ))}
    </ul>
  );
}
```

### Example 2: Creating a Story
```tsx
async function handleCreateStory(title: string) {
  try {
    const story = await createStory(
      session.user.householdId,
      session.user.id,
      title
    );
    console.log('Story created:', story.id);
    router.push(`/stories/${story.id}`);
  } catch (error) {
    console.error('Failed to create story:', error);
  }
}
```

### Example 3: Fetching Story with Sentences
```tsx
async function loadStory(storyId: string) {
  try {
    const [story] = await Promise.all([
      // Get story metadata
      supabase.from('stories').select('*').eq('id', storyId).single(),
      // Get sentences
      getStorySentences(storyId)
    ]);
    
    return { story, sentences };
  } catch (error) {
    console.error('Failed to load story:', error);
  }
}
```

## Error Handling

All functions throw errors if something goes wrong. Always wrap in try/catch:

```tsx
try {
  const stories = await getStoriesByHousehold(householdId);
  // use stories
} catch (error) {
  if (error instanceof Error) {
    console.error('Error message:', error.message);
  }
}
```

## Session Access

In any Next.js component, access the user's info:

```tsx
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session } = useSession();
  
  // Available fields
  session.user.id          // User ID from Supabase
  session.user.email       // User email
  session.user.name        // User name from profile
  session.user.role        // 'parent', 'learner', 'elder'
  session.user.householdId // Household ID for queries
}
```

## Adding New Functions

To add more database operations, follow this pattern:

```tsx
export async function myNewFunction(param: string) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('column', param);

  if (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }

  return data;
}
```
