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
  ADD COLUMN IF NOT EXISTS speaker TEXT;

-- Optional: public bucket for sentence audio (service role uploads; learners stream)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio', 'story-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  gateway_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';
