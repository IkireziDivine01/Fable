# Parental Consent & Onboarding System

This guide explains the new parent-controlled account creation system for Fable.

## Overview

- **Parents** can create accounts directly at signup
- **Kids & Authors** can ONLY create accounts via parent invitation code
- **Parents** manage family members from the parent dashboard
- **Account types**: `parent`, `kid`, `author`

## The Invitation Flow

### Where Parents Invite From

**Parents invite new family members from the Family Dashboard:**
1. Sign in as parent
2. Go to `/parent/family` 
3. Scroll to "Invite a New Family Member" section
4. Choose account type: **Learner** (kid) or **Author** (storyteller)
5. Optionally add a name hint (e.g., "Sarah's friend" or "Grandpa Mike")
6. Click "GENERATE INVITATION CODE"
7. Copy the generated code (e.g., "ABC123DEF456")
8. Share code with the person joining (via text, email, etc.)

### How Family Members Use Invitations

**Learners and Authors join with invitation code:**
1. They visit `/auth/onboard`
2. Enter the invitation code
3. System validates code (checks expiry, one-time use)
4. They create account with name, email, password
5. Account is created with their role (learner or author)
6. They're redirected to signin
7. They sign in and access the family dashboard

## Account Type Roles

- **Parent**: Creates household, manages family members, generates invitations
- **Learner (Kid)**: Views and explores family stories, explores gateways
- **Author**: Records, writes, and publishes family stories (can also contribute as learner)

## Database Schema Updates

Add these tables to your Supabase database:

```sql
-- Invitations table: Tracks pending family member invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE, -- 6-char code like "ABC123"
  role TEXT NOT NULL CHECK (role IN ('kid', 'elder')), -- kid or elder only
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  name_hint TEXT, -- Optional: "For Sarah's friend" or similar
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  used_at TIMESTAMP,
  used_by UUID REFERENCES auth.users(id),
  CONSTRAINT not_used_or_expired CHECK (used_at IS NULL OR used_at <= expires_at)
);

-- Add invited_by column to user_profiles (if not already present)
ALTER TABLE user_profiles ADD COLUMN invited_by UUID REFERENCES auth.users(id);
ALTER TABLE user_profiles ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Parents can see invitations they created
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

-- Only the inviting parent can create invitations
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

## Signup Flow Changes

### Parent Signup (No changes)
- Parents visit `/auth/signup` 
- Create household, set password
- Account role automatically set to `parent`
- Creates new household automatically

### Kid/Elder Signup (NEW)
- Kids/Elders visit `/auth/onboard`
- Enter invitation code (from parent)
- Choose password
- Account created with `parent_id` set to the parent who invited them
- Account role: `kid` or `elder` based on invitation

## New API Routes

### `POST /api/auth/signup`
- Unchanged - creates parent account with new household
- Role: `parent`

### `POST /api/parent/invite` (NEW)
- Parent generates invitation code for kid/author
- Params: `role` (kid|author), `nameHint` (optional)
- Returns: `code` (e.g., "ABC123DEF456")

### `POST /api/auth/onboard` (NEW)
- Kid/Author signs up using invitation code
- Params: `code`, `email`, `password`, `name`
- Validates code hasn't expired/been used
- Creates user with role from invitation
- Marks invitation as used

### `GET /api/parent/invitations` (NEW)
- Get all pending/used invitations for parent's household
- Returns: Array of invitations with status

### `DELETE /api/parent/invitations/:id` (NEW)
- Cancel pending invitation (before expiry)

## New Pages

### `/auth/onboard` (NEW)
- Kid/Author onboarding page
- Invitation code input
- Email, password, name fields
- Shows which parent invited them after code validation

### `/parent/family` (NEW)
- Dashboard for managing household members
- List of parents, kids, authors
- Generate new invitation codes
- View pending invitations
- Remove family members

### `/parent/settings` (UPDATED)
- Add option to view/manage household name
- View account type

## Implementation Order

1. ✅ Create invitations table and RLS policies
2. ⏳ Create API routes (invite, onboard)
3. ⏳ Create invitation management page (/parent/family)
4. ⏳ Create onboarding page (/auth/onboard)
5. ⏳ Update signup copy to explain parent-first flow
6. ⏳ Add parent dashboard navigation

## Security Model

- Invitation codes expire after 30 days
- Codes can only be used once
- Parents can only invite to their own household
- Parents see all family members (via role check in queries)
- Kids/Authors only see shared household stories (RLS enforces)
- No kid/author can invite others
