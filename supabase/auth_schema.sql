-- Fable auth migration — run once in Supabase Dashboard → SQL Editor → Run
-- Fixes: "Could not find the 'account_status' column of 'user_profiles' in the schema cache"

-- 1. Add columns the app expects on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS parent_email TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Backfill existing rows
UPDATE user_profiles SET account_status = 'active' WHERE account_status IS NULL;

-- 3. Optional check constraint (skip if you already have a conflicting constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_account_status_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_account_status_check
      CHECK (account_status IN ('active', 'pending'));
  END IF;
END $$;

-- 4. Normalize legacy role names (drop old CHECKs first — they block author→elder)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check') THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

UPDATE user_profiles SET role = 'elder' WHERE role IN ('author');
UPDATE user_profiles SET role = 'kid' WHERE role IN ('learner');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check') THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('parent', 'kid', 'elder'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check') THEN
      ALTER TABLE invitations DROP CONSTRAINT invitations_role_check;
    END IF;

    UPDATE invitations SET role = 'elder' WHERE role = 'author';

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check') THEN
      ALTER TABLE invitations
        ADD CONSTRAINT invitations_role_check
        CHECK (role IN ('kid', 'elder'));
    END IF;
  END IF;
END $$;

-- 5. Reload PostgREST schema cache (required after adding columns)
NOTIFY pgrst, 'reload schema';
