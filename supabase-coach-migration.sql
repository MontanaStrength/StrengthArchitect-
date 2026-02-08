-- Strength Architect: Coach Mode Migration
-- Run this in the Supabase SQL editor to enable Coach mode.

-- 1. COACH CLIENTS TABLE
CREATE TABLE IF NOT EXISTS coach_clients (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  weight_lbs NUMERIC,
  age INTEGER,
  gender TEXT,
  experience TEXT,
  equipment JSONB DEFAULT '[]',
  notes TEXT,
  avatar_color TEXT,
  created_at BIGINT NOT NULL
);
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own clients" ON coach_clients FOR ALL USING (auth.uid() = user_id);

-- 2. ADD client_id TO ALL DATA TABLES
-- (NULL = coach's own data / lifter mode, non-NULL = client-scoped data)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE training_blocks ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE lift_records ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE body_comp ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE scheduled_workouts ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE sleep_journal ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE training_goals ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE strength_tests ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE custom_templates ADD COLUMN IF NOT EXISTS client_id TEXT;

-- 3. CREATE INDEXES FOR FASTER CLIENT-SCOPED QUERIES
CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_training_blocks_client ON training_blocks(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_lift_records_client ON lift_records(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_body_comp_client ON body_comp(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_client ON scheduled_workouts(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sleep_journal_client ON sleep_journal(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_training_goals_client ON training_goals(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_strength_tests_client ON strength_tests(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_client ON custom_templates(user_id, client_id);
