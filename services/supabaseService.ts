
import { createClient } from '@supabase/supabase-js';
import {
  SavedWorkout, TrainingBlock, LiftRecord, BodyCompEntry,
  ScheduledWorkout, SleepEntry, TrainingGoal, CustomTemplate,
  StrengthTestResult, GymSetup, OptimizerConfig, RPECalibration
} from '../types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://'))
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== WORKOUTS =====

export const syncWorkoutToCloud = async (workout: SavedWorkout, userId: string) => {
  const { data, error } = await supabase
    .from('workouts')
    .upsert({
      id: workout.id,
      user_id: userId,
      timestamp: workout.timestamp,
      workout_data: {
        archetypeId: workout.archetypeId,
        title: workout.title,
        focus: workout.focus,
        totalDurationMin: workout.totalDurationMin,
        difficulty: workout.difficulty,
        exercises: workout.exercises,
        summary: workout.summary,
        whyThisWorkout: workout.whyThisWorkout,
        physiologicalBenefits: workout.physiologicalBenefits,
        coachingTips: workout.coachingTips,
        estimatedTonnage: workout.estimatedTonnage,
        movementPatternsCovered: workout.movementPatternsCovered,
        muscleGroupsCovered: workout.muscleGroupsCovered,
      },
      actual_tonnage: workout.actualTonnage,
      session_rpe: workout.sessionRPE,
      completed_sets: workout.completedSets,
      feedback: workout.feedback,
    });

  if (error) {
    console.error('Supabase sync error:', error);
    throw error;
  }
  return data;
};

export const fetchWorkoutsFromCloud = async (userId: string): Promise<SavedWorkout[]> => {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    throw error;
  }

  return (data || []).map(row => ({
    ...row.workout_data,
    id: row.id,
    timestamp: row.timestamp,
    actualTonnage: row.actual_tonnage,
    sessionRPE: row.session_rpe,
    completedSets: row.completed_sets,
    feedback: row.feedback,
  }));
};

export const deleteWorkoutFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase delete error:', error);
    throw error;
  }
};

// ===== TRAINING BLOCKS =====

export const syncTrainingBlockToCloud = async (block: TrainingBlock, userId: string) => {
  const { data, error } = await supabase
    .from('training_blocks')
    .upsert({
      id: block.id,
      user_id: userId,
      name: block.name,
      start_date: block.startDate,
      goal_event: block.goalEvent,
      goal_date: block.goalDate,
      is_active: block.isActive,
      phases: block.phases,
    });

  if (error) {
    console.error('Supabase training block sync error:', error);
    throw error;
  }
  return data;
};

export const fetchTrainingBlocksFromCloud = async (userId: string): Promise<TrainingBlock[]> => {
  const { data, error } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    goalEvent: row.goal_event,
    goalDate: row.goal_date,
    isActive: row.is_active,
    phases: row.phases,
  }));
};

export const deleteTrainingBlockFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('training_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
};

// ===== LIFT RECORDS =====

export const syncLiftRecordToCloud = async (record: LiftRecord, userId: string) => {
  const { data, error } = await supabase
    .from('lift_records')
    .upsert({
      id: record.id,
      user_id: userId,
      exercise_id: record.exerciseId,
      exercise_name: record.exerciseName,
      weight: record.weight,
      reps: record.reps,
      estimated_1rm: record.estimated1RM,
      date: record.date,
      rpe: record.rpe,
      notes: record.notes,
    });
  if (error) throw error;
  return data;
};

export const fetchLiftRecordsFromCloud = async (userId: string): Promise<LiftRecord[]> => {
  const { data, error } = await supabase
    .from('lift_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    estimated1RM: row.estimated_1rm,
    date: row.date,
    rpe: row.rpe,
    notes: row.notes,
  }));
};

export const deleteLiftRecordFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('lift_records')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
};

// ===== BODY COMP =====

export const syncBodyCompToCloud = async (entry: BodyCompEntry, userId: string) => {
  const { error } = await supabase
    .from('body_comp')
    .upsert({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      weight_lbs: entry.weightLbs,
      body_fat_pct: entry.bodyFatPct,
      muscle_mass_lbs: entry.muscleMassLbs,
      waist_inches: entry.waistInches,
      notes: entry.notes,
    });
  if (error) throw error;
};

export const fetchBodyCompFromCloud = async (userId: string): Promise<BodyCompEntry[]> => {
  const { data, error } = await supabase
    .from('body_comp')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    weightLbs: row.weight_lbs,
    bodyFatPct: row.body_fat_pct,
    muscleMassLbs: row.muscle_mass_lbs,
    waistInches: row.waist_inches,
    notes: row.notes,
  }));
};

export const deleteBodyCompFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('body_comp').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== SCHEDULED WORKOUTS (Calendar) =====

export const syncScheduledWorkoutToCloud = async (sw: ScheduledWorkout, userId: string) => {
  const { error } = await supabase
    .from('scheduled_workouts')
    .upsert({
      id: sw.id,
      user_id: userId,
      date: sw.date,
      label: sw.label,
      phase: sw.phase,
      suggested_duration: sw.suggestedDuration,
      suggested_readiness: sw.suggestedReadiness,
      suggested_intensity: sw.suggestedIntensity,
      suggested_focus: sw.suggestedFocus,
      notes: sw.notes,
      status: sw.status,
      completed_workout_id: sw.completedWorkoutId,
    });
  if (error) throw error;
};

export const fetchScheduledWorkoutsFromCloud = async (userId: string): Promise<ScheduledWorkout[]> => {
  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    label: row.label,
    phase: row.phase,
    suggestedDuration: row.suggested_duration,
    suggestedReadiness: row.suggested_readiness,
    suggestedIntensity: row.suggested_intensity,
    suggestedFocus: row.suggested_focus,
    notes: row.notes,
    status: row.status,
    completedWorkoutId: row.completed_workout_id,
  }));
};

export const deleteScheduledWorkoutFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('scheduled_workouts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== SLEEP =====

export const syncSleepEntryToCloud = async (entry: SleepEntry, userId: string) => {
  const { error } = await supabase
    .from('sleep_journal')
    .upsert({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      hours_slept: entry.hoursSlept,
      quality: entry.quality,
      notes: entry.notes,
      hrv: entry.hrv,
      resting_hr: entry.restingHR,
    });
  if (error) throw error;
};

export const fetchSleepEntriesFromCloud = async (userId: string): Promise<SleepEntry[]> => {
  const { data, error } = await supabase
    .from('sleep_journal')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    hoursSlept: row.hours_slept,
    quality: row.quality,
    notes: row.notes,
    hrv: row.hrv,
    restingHR: row.resting_hr,
  }));
};

export const deleteSleepEntryFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('sleep_journal').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== TRAINING GOALS =====

export const syncGoalToCloud = async (goal: TrainingGoal, userId: string) => {
  const { error } = await supabase
    .from('training_goals')
    .upsert({
      id: goal.id,
      user_id: userId,
      category: goal.category,
      title: goal.title,
      target_value: goal.targetValue,
      current_value: goal.currentValue,
      unit: goal.unit,
      start_date: goal.startDate,
      target_date: goal.targetDate,
      completed_date: goal.completedDate,
    });
  if (error) throw error;
};

export const fetchGoalsFromCloud = async (userId: string): Promise<TrainingGoal[]> => {
  const { data, error } = await supabase
    .from('training_goals')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    category: row.category,
    title: row.title,
    targetValue: row.target_value,
    currentValue: row.current_value,
    unit: row.unit,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedDate: row.completed_date,
  }));
};

export const deleteGoalFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('training_goals').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== STRENGTH TESTS =====

export const syncStrengthTestToCloud = async (result: StrengthTestResult, userId: string) => {
  const { error } = await supabase
    .from('strength_tests')
    .upsert({
      id: result.id,
      user_id: userId,
      test_type: result.testType,
      date: result.date,
      exercise_id: result.exerciseId,
      exercise_name: result.exerciseName,
      weight: result.weight,
      reps: result.reps,
      estimated_1rm: result.estimated1RM,
      rpe: result.rpe,
      notes: result.notes,
    });
  if (error) throw error;
};

export const fetchStrengthTestsFromCloud = async (userId: string): Promise<StrengthTestResult[]> => {
  const { data, error } = await supabase
    .from('strength_tests')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    testType: row.test_type,
    date: row.date,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    estimated1RM: row.estimated_1rm,
    rpe: row.rpe,
    notes: row.notes,
  }));
};

// ===== CUSTOM TEMPLATES =====

export const syncCustomTemplateToCloud = async (template: CustomTemplate, userId: string) => {
  const { error } = await supabase
    .from('custom_templates')
    .upsert({
      id: template.id,
      user_id: userId,
      name: template.name,
      description: template.description,
      exercises: template.exercises,
      default_duration_min: template.defaultDurationMin,
      focus_area: template.focusArea,
      created_at: template.createdAt,
    });
  if (error) throw error;
};

export const fetchCustomTemplatesFromCloud = async (userId: string): Promise<CustomTemplate[]> => {
  const { data, error } = await supabase
    .from('custom_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    exercises: row.exercises,
    defaultDurationMin: row.default_duration_min,
    focusArea: row.focus_area,
    createdAt: row.created_at,
  }));
};

export const deleteCustomTemplateFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('custom_templates').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== USER PREFERENCES =====

export interface UserPreferences {
  gymSetup?: GymSetup;
  optimizerConfig?: OptimizerConfig;
  rpeCalibration?: RPECalibration;
  audioMuted?: boolean;
}

export const syncUserPreferencesToCloud = async (preferences: UserPreferences, userId: string) => {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preferences,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
};

export const fetchUserPreferencesFromCloud = async (userId: string): Promise<UserPreferences> => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.preferences || {};
};

export const syncDismissedAlertsToCloud = async (alertIds: string[], userId: string) => {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      dismissed_alerts: alertIds,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
};

export const fetchDismissedAlertsFromCloud = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('dismissed_alerts')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.dismissed_alerts || [];
};
