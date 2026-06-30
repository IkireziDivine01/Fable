-- Immersive 3D storytelling (run after stories_schema.sql)

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'village'
    CHECK (environment IN ('forest', 'home', 'village', 'school', 'market'));

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS characters JSONB DEFAULT '[]'::jsonb;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS is_immersive BOOLEAN DEFAULT false;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS animation_data JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS story_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  character_type TEXT NOT NULL
    CHECK (character_type IN ('boy', 'girl', 'grandma', 'grandpa', 'dog', 'teacher')),
  character_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  mouth_sync_timings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_type TEXT NOT NULL UNIQUE
    CHECK (environment_type IN ('forest', 'home', 'village', 'school', 'market')),
  background_color TEXT NOT NULL,
  objects JSONB DEFAULT '[]'::jsonb,
  lighting JSONB DEFAULT '{}'::jsonb
);

INSERT INTO story_environments (environment_type, background_color, objects, lighting)
VALUES
  ('village', '#8B6914', '[{"type":"hut","x":-3},{"type":"tree","x":2}]', '{"color":"#FFE4B5","intensity":0.9}'),
  ('forest', '#1B4332', '[{"type":"tree","x":-2},{"type":"tree","x":3}]', '{"color":"#98D8AA","intensity":0.7}'),
  ('home', '#520e33', '[{"type":"fire","x":0}]', '{"color":"#FF7956","intensity":0.85}'),
  ('school', '#2C5282', '[{"type":"board","x":0}]', '{"color":"#F7FAFC","intensity":1}'),
  ('market', '#C05621', '[{"type":"stall","x":-1},{"type":"stall","x":2}]', '{"color":"#FBD38D","intensity":0.95}')
ON CONFLICT (environment_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_story_characters_story_id ON story_characters(story_id);

NOTIFY pgrst, 'reload schema';
