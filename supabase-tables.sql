-- Strength Architect: Supabase Tables
-- Run this in the Supabase SQL editor to create all required tables.

-- 1. WORKOUTS
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  workout_data JSONB NOT NULL DEFAULT '{}',
  actual_tonnage INTEGER,
  session_rpe NUMERIC,
  completed_sets JSONB DEFAULT '[]',
  feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);

-- 2. TRAINING BLOCKS (Periodization)
CREATE TABLE IF NOT EXISTS training_blocks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date BIGINT NOT NULL,
  goal_event TEXT,
  goal_date BIGINT,
  is_active BOOLEAN DEFAULT FALSE,
  phases JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own training blocks" ON training_blocks FOR ALL USING (auth.uid() = user_id);

-- 3. LIFT RECORDS (PR tracking)
CREATE TABLE IF NOT EXISTS lift_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  estimated_1rm NUMERIC NOT NULL,
  date BIGINT NOT NULL,
  rpe NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lift_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own lift records" ON lift_records FOR ALL USING (auth.uid() = user_id);

-- 4. BODY COMPOSITION
CREATE TABLE IF NOT EXISTS body_comp (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date BIGINT NOT NULL,
  weight_lbs NUMERIC NOT NULL,
  body_fat_pct NUMERIC,
  muscle_mass_lbs NUMERIC,
  waist_inches NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE body_comp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own body comp" ON body_comp FOR ALL USING (auth.uid() = user_id);

-- 5. SCHEDULED WORKOUTS (Calendar)
CREATE TABLE IF NOT EXISTS scheduled_workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  label TEXT NOT NULL,
  phase TEXT,
  suggested_duration INTEGER,
  suggested_readiness TEXT,
  suggested_intensity TEXT,
  suggested_focus TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  completed_workout_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scheduled_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scheduled workouts" ON scheduled_workouts FOR ALL USING (auth.uid() = user_id);

-- 6. SLEEP JOURNAL
CREATE TABLE IF NOT EXISTS sleep_journal (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours_slept NUMERIC NOT NULL,
  quality TEXT NOT NULL,
  notes TEXT,
  hrv NUMERIC,
  resting_hr NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sleep_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sleep entries" ON sleep_journal FOR ALL USING (auth.uid() = user_id);

-- 7. TRAINING GOALS
CREATE TABLE IF NOT EXISTS training_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  start_date BIGINT NOT NULL,
  target_date BIGINT,
  completed_date BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE training_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals" ON training_goals FOR ALL USING (auth.uid() = user_id);

-- 8. STRENGTH TESTS
CREATE TABLE IF NOT EXISTS strength_tests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  date BIGINT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  estimated_1rm NUMERIC NOT NULL,
  rpe NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE strength_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own strength tests" ON strength_tests FOR ALL USING (auth.uid() = user_id);

-- 9. CUSTOM TEMPLATES
CREATE TABLE IF NOT EXISTS custom_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  default_duration_min INTEGER,
  focus_area TEXT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own custom templates" ON custom_templates FOR ALL USING (auth.uid() = user_id);

-- 10. USER PREFERENCES (gym setup, optimizer config, audio, dismissed alerts)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  dismissed_alerts JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
