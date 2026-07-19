-- Fix: interaction_logs.actor_id pointed at empty public.users,
-- so kid start/finish events could never save (FK 23503).
-- Point actor_id at user_profiles (same ids the app uses for learners).
-- Run in Supabase SQL Editor, then retry finishing a story.

ALTER TABLE interaction_logs
  DROP CONSTRAINT IF EXISTS interaction_logs_actor_id_fkey;

ALTER TABLE interaction_logs
  ADD CONSTRAINT interaction_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Ensure new rows always get an id + created_at
ALTER TABLE interaction_logs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS synced_to_cloud BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS interaction_logs_household_created_idx
  ON interaction_logs (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS interaction_logs_actor_story_event_idx
  ON interaction_logs (actor_id, story_id, event_type);

NOTIFY pgrst, 'reload schema';
