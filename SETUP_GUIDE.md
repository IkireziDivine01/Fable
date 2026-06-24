# Fable Sign In/Sign Up Integration Guide

I've successfully integrated sign in and sign up functionality with your Supabase database. Here's what was set up:

## 🎯 What Was Completed

### 1. **Supabase Integration** (`src/lib/supabase.ts`)
   - Created reusable functions for authentication and database operations
   - `signUpUser()` - Creates users and profiles in Supabase
   - `signInUser()` - Authenticates with email and password
   - `getStoriesByHousehold()` - Fetches family stories
   - `createStory()` - Creates new stories in the database

### 2. **Updated Authentication** (`src/auth.ts`)
   - Connected NextAuth to Supabase for real authentication
   - Now validates credentials against Supabase database
   - Added `householdId` and `role` to session data
   - JWT callbacks pass session data through the app

### 3. **Sign Up Page** (`src/app/auth/signup/page.tsx`)
   - Now creates actual users in Supabase
   - Creates household if first user
   - Shows error messages for validation failures
   - Auto-redirects to sign in after successful signup

### 4. **Sign In Page** (`src/app/auth/signin/page.tsx`)
   - Simplified to just email/password (role set at signup)
   - Validates against Supabase users
   - Redirects to `/dashboard` after successful login

### 5. **Dashboard Page** (`src/app/dashboard/page.tsx`)
   - **Protected route** - only accessible after sign in
   - Displays all stories for the user's household
   - Shows story status (draft/published)
   - Quick access to create new stories
   - Sign out button in header

### 6. **Middleware Protection** (`src/middleware.ts`)
   - Updated to protect `/dashboard` and `/stories` routes
   - Ensures only authenticated users can access

## 🚀 Setup Steps

### Step 1: Set Environment Variables
Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**How to get Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create or open your project
3. Go to Settings → API
4. Copy the Project URL and public anon key

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 2: Create Supabase Tables

Your Supabase database needs these tables:

```sql
-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'parent',
  household_id UUID REFERENCES households(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security policy for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to select their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- If you see an error like "Could not find the table 'public.user_profiles' in the schema cache", create this table first.

-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Story sentences table
CREATE TABLE story_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  sentence_text TEXT,
  sentence_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Step 3: Run Your App
```bash
npm run dev
```

Visit:
- **Signup**: `http://localhost:3000/auth/signup`
- **Sign In**: `http://localhost:3000/auth/signin`
- **Dashboard**: `http://localhost:3000/dashboard`

## 🔄 How It Works

### Signup Flow
1. User fills form with name, email, password, household name
2. `signUpUser()` creates auth user in Supabase
3. Creates household if new
4. Creates user_profile record linking user to household
5. Redirects to signin

### Signin Flow
1. User enters email and password
2. `signInUser()` validates with Supabase
3. `getUserProfile()` fetches user's profile and household
4. NextAuth session stores `householdId` for queries
5. Redirects to dashboard

### Dashboard Flow
1. Protected by middleware - redirects to signin if not authenticated
2. Fetches all stories for user's household
3. Displays them in a grid with status badges
4. Users can create new stories or view existing ones

## 📊 Database Schema

The integration uses these key fields:

- **User Profile**: `id`, `email`, `name`, `role`, `household_id`
- **Household**: `id`, `name`
- **Stories**: `id`, `household_id`, `author_id`, `title`, `status`

All authenticated users get their `householdId` in the session, so you can always query: `getStoriesByHousehold(session.user.householdId)`

## 🛠️ Next Steps

To extend this, you can:

1. **Create Story Page** - Add form to create new stories
   ```tsx
   // src/app/stories/new/page.tsx
   // Use createStory() from @/lib/supabase
   ```

2. **View Story Page** - Show individual story with sentences
   ```tsx
   // src/app/stories/[id]/page.tsx
   // Use getStorySentences() to fetch content
   ```

### Service Role Key
For server-side signup, add this to your `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```


3. **Add Story Sentences** - Let users add/edit sentences
   ```tsx
   // Implement insertStorySentence() in @/lib/supabase
   ```

4. **Multi-user Household** - Invite family members to same household
   ```tsx
   // Create invite system using email/codes
   ```

## ⚡ Important Notes

- **Offline-first RxDB**: Your schema supports offline sync. The Supabase client works server-side for initial load; RxDB handles offline sync once implemented.
- **Session Data**: `session.user` now includes `id`, `email`, `name`, `role`, `householdId` - use these throughout your app
- **Protected Routes**: Add `useSession()` to any page that needs auth, it auto-redirects if not signed in
- **Error Handling**: All Supabase functions throw errors - wrap in try/catch

## 📝 Example: Using Session in a Component

```tsx
'use client';
import { useSession } from 'next-auth/react';
import { getStoriesByHousehold } from '@/lib/supabase';

export default function MyComponent() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (session?.user?.householdId) {
      const stories = await getStoriesByHousehold(session.user.householdId);
      // Use stories...
    }
  }, [session]);
  
  return <div>{session?.user?.name}'s stories</div>;
}
```

You now have a complete authentication system connected to your database! 🎉
