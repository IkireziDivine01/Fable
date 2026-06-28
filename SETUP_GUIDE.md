# Fable Auth & Family Setup Guide

## 🎯 System Overview - NEW: Parental Consent System

### Account Types
- **Parent/Guardian** - Creates household, invites family members
- **Learner (Kid)** - Can only join via parent invitation code  
- **Author** - Can only join via parent invitation code

### Key Changes
- ✅ Parents sign up directly at `/auth/signup`
- ✅ Kids/Authors join via `/auth/onboard` with invitation code
- ✅ Parents manage family members at `/parent/family`
- ✅ Invitation codes expire after 30 days
- ✅ Codes are one-time use only

## 🎯 What Was Completed

### 1. **Supabase Integration** (`src/lib/supabase.ts`)
   - Created reusable functions for authentication and database operations
   - `signUpUser()` - Creates parent users and profiles
   - `signInUser()` - Authenticates with email and password
   - `generateInvitation()` - Creates invitation codes (NEW)
   - `validateInvitation()` - Validates invitation codes (NEW)
   - `signUpWithInvitation()` - Signs up kids/authors with code (NEW)
   - `getStoriesByHousehold()` - Fetches family stories
   - `getUsersByHousehold()` - Gets all household members (NEW)

### 2. **Updated Authentication** (`src/auth.ts`)
   - Connected NextAuth to Supabase for real authentication
   - Now validates credentials against Supabase database
   - Added `householdId` and `role` to session data
   - JWT callbacks pass session data through the app

### 3. **Sign Up Page** (`src/app/auth/signup/page.tsx`)
   - Now creates parent accounts only
   - Creates household if first parent
   - Auto-redirects to sign in after successful signup
   - Link to onboarding page for kids/authors with codes

### 4. **Onboarding Page** (`src/app/auth/onboard/page.tsx`) - NEW
   - Kids/Authors join with invitation code
   - Two-step flow: validate code → create account
   - Shows which parent invited them
   - Auto-redirects to sign in after successful signup

### 5. **Family Management Page** (`src/parent/family/page.tsx`) - NEW
   - Parents view all household members
   - Generate invitation codes for kids/authors
   - See pending/used invitations
   - Copy codes to clipboard easily
   - Manage family member lifecycle

### 6. **Sign In Page** (`src/app/auth/signin/page.tsx`)
   - Any account type can sign in
   - Email and password required
   - Redirects to `/dashboard` after successful login

### 7. **Dashboard Page** (`src/app/dashboard/page.tsx`)
   - Protected route - only accessible after sign in
   - Works for any account type (parent, kid, author)
   - Displays all stories for the user's household
   - Shows story status (draft/published)
   - Sign out button in header

### 8. **Middleware Protection** (`src/middleware.ts`)
   - Updated to protect `/dashboard`, `/parent/family`, and `/stories` routes
   - Ensures only authenticated users can access

## 🚀 Setup Steps

### Step 1: Set Environment Variables
Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**How to get Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create or open your project
3. Go to Settings → API
4. Copy:
   - Project URL
   - Public anon key
   - **Service role key** (NEW - needed for parental invitations)

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 2: Create Supabase Tables

Your Supabase database needs these tables:

```sql
-- Create households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user profiles table (with new invited_by column for parental tracking)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'parent' CHECK (role IN ('parent', 'kid', 'author')),
  household_id UUID REFERENCES households(id),
  invited_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create invitations table (NEW - for parental consent)
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('kid', 'author')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  name_hint TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  used_at TIMESTAMP,
  used_by UUID REFERENCES auth.users(id),
  CONSTRAINT not_used_or_expired CHECK (used_at IS NULL OR used_at <= expires_at)
);

-- Create stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create story_sentences table
CREATE TABLE story_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  sentence_text TEXT,
  sentence_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Step 3: Enable Row-Level Security (RLS)

```sql
-- Enable RLS on user_profiles
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

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their household invitations"
  ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.household_id = invitations.household_id
      AND user_profiles.role = 'parent'
    )
  );

CREATE POLICY "Parents can create invitations for their household"
  ON invitations
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.household_id = invitations.household_id
      AND user_profiles.role = 'parent'
    )
  );
```

### Step 4: Run Your App
```bash
npm run dev
```

Visit:
- **Parent Signup**: `http://localhost:3000/auth/signup`
- **Kid/Author Onboard**: `http://localhost:3000/auth/onboard`
- **Sign In**: `http://localhost:3000/auth/signin`
- **Family Dashboard**: `http://localhost:3000/parent/family` (parents only)
- **Story Dashboard**: `http://localhost:3000/dashboard`

## 🔄 How It Works

### Parent Signup Flow
1. Parent fills form with name, household name, email, password
2. `signUpUser()` creates auth user in Supabase
3. Creates household if new
4. Creates user_profile with role='parent' linking to household
5. Redirects to signin

### Kid/Author Onboarding Flow
1. Kid/Author visits `/auth/onboard`
2. Enters invitation code from parent
3. `validateInvitation()` checks code is valid, not expired, not used
4. System creates auth user and profile with:
   - role from invitation (kid or author)
   - invited_by set to parent's ID
   - household_id from invitation
5. Marks invitation as used_at=now, used_by=kid's ID
6. Redirects to signin

### Signin Flow
1. User enters email and password
2. `signInUser()` validates with Supabase
3. `getUserProfile()` fetches user's profile and household
4. NextAuth session stores `householdId` and `role` for queries
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
