-- Mid-story kid questions (answered by parent/elder)
-- Run in Supabase SQL Editor after stories_schema.sql

CREATE TABLE IF NOT EXISTS kid_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  sentence_id UUID REFERENCES story_sentences(id) ON DELETE SET NULL,
  sentence_order INTEGER,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kid_questions_household_unanswered_idx
  ON kid_questions (household_id, created_at DESC)
  WHERE answer_text IS NULL;

NOTIFY pgrst, 'reload schema';
