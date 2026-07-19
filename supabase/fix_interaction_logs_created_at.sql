-- Deprecated: use fix_interaction_logs_actor_fk.sql instead.
-- Kept so older README links still apply the needed repairs.

ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS synced_to_cloud BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interaction_logs'
      AND column_name = 'timestamp'
  ) THEN
    UPDATE interaction_logs
    SET created_at = COALESCE(created_at, "timestamp")
    WHERE created_at IS NULL;
  END IF;
END $$;

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
