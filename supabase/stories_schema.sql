-- Run in Supabase SQL Editor for story creation features

-- Fix author_id FK: must reference auth.users(id), not user_profiles
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_author_id_fkey;
ALTER TABLE stories
  ADD CONSTRAINT stories_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id);

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS transcript TEXT;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS generation_type TEXT DEFAULT 'manual'
    CHECK (generation_type IN ('ai', 'quick', 'manual'));

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS themes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS kinyarwanda_text TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS theme_label TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS elder_talking_points TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS child_prompt TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS kinyarwanda_audio_url TEXT;

ALTER TABLE story_sentences
  ADD COLUMN IF NOT EXISTS speaker TEXT;

-- Optional: public bucket for sentence audio (service role uploads; learners stream)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio', 'story-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  -- Learners/parents live in user_profiles (not empty public.users)
  actor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  gateway_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_to_cloud BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Older installs used a reserved-ish column name "timestamp", or had no time column.
-- Normalize to created_at so kid library + parent dashboard progress queries work.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interaction_logs'
      AND column_name = 'timestamp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interaction_logs'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE interaction_logs RENAME COLUMN "timestamp" TO created_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interaction_logs'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE interaction_logs
      ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interaction_logs'
      AND column_name = 'synced_to_cloud'
  ) THEN
    ALTER TABLE interaction_logs
      ADD COLUMN synced_to_cloud BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Repair installs that still FK actor_id → public.users (empty) or auth.users
ALTER TABLE interaction_logs
  DROP CONSTRAINT IF EXISTS interaction_logs_actor_id_fkey;

ALTER TABLE interaction_logs
  ADD CONSTRAINT interaction_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE interaction_logs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS interaction_logs_household_created_idx
  ON interaction_logs (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS interaction_logs_actor_story_event_idx
  ON interaction_logs (actor_id, story_id, event_type);

NOTIFY pgrst, 'reload schema';
