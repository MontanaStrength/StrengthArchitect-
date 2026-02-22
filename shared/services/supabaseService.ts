
import { createClient } from '@supabase/supabase-js';
import {
  SavedWorkout, TrainingBlock, LiftRecord, BodyCompEntry,
  ScheduledWorkout, SkeletonExercise, SleepEntry, TrainingGoal, CustomTemplate,
  StrengthTestResult, GymSetup, OptimizerConfig, RPECalibration,
  CoachClient,
} from '../types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://'))
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: apply client_id filter to Supabase queries
function applyClientFilter(query: any, clientId?: string | null) {
  return clientId ? query.eq('client_id', clientId) : query.is('client_id', null);
}

// ===== WORKOUTS =====

export const syncWorkoutToCloud = async (workout: SavedWorkout, userId: string, clientId?: string | null) => {
  const { data, error } = await supabase
    .from('workouts')
    .upsert({
      id: workout.id,
      user_id: userId,
      client_id: clientId || null,
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

export const fetchWorkoutsFromCloud = async (userId: string, clientId?: string | null): Promise<SavedWorkout[]> => {
  let query = supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('timestamp', { ascending: false });

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

export const syncTrainingBlockToCloud = async (block: TrainingBlock, userId: string, clientId?: string | null) => {
  // Pack extra block fields into phases JSONB (no schema migration required)
  const phasesPayload = {
    __v: 2,
    phases: block.phases,
    exercisePreferences: block.exercisePreferences,
    goalBias: block.goalBias,
    volumeTolerance: block.volumeTolerance,
    lengthWeeks: block.lengthWeeks,
    trainingDays: block.trainingDays,
    sessionStructure: block.sessionStructure,
  };

  const { data, error } = await supabase
    .from('training_blocks')
    .upsert({
      id: block.id,
      user_id: userId,
      client_id: clientId || null,
      name: block.name,
      start_date: block.startDate,
      goal_event: block.goalEvent,
      goal_date: block.goalDate,
      is_active: block.isActive,
      phases: phasesPayload,
    });

  if (error) {
    console.error('Supabase training block sync error:', error);
    throw error;
  }
  return data;
};

export const fetchTrainingBlocksFromCloud = async (userId: string, clientId?: string | null): Promise<TrainingBlock[]> => {
  let query = supabase
    .from('training_blocks')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => {
    // Handle both old format (plain array) and new format (wrapper object)
    const rawPhases = row.phases;
    const isWrapped = rawPhases && !Array.isArray(rawPhases) && rawPhases.__v;
    const phases = isWrapped ? rawPhases.phases : rawPhases;

    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      goalEvent: row.goal_event,
      goalDate: row.goal_date,
      isActive: row.is_active,
      phases: phases || [],
      ...(isWrapped && {
        exercisePreferences: rawPhases.exercisePreferences,
        goalBias: rawPhases.goalBias,
        volumeTolerance: rawPhases.volumeTolerance,
        lengthWeeks: rawPhases.lengthWeeks,
        trainingDays: rawPhases.trainingDays,
        sessionStructure: rawPhases.sessionStructure,
      }),
    };
  });
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

export const syncLiftRecordToCloud = async (record: LiftRecord, userId: string, clientId?: string | null) => {
  const { data, error } = await supabase
    .from('lift_records')
    .upsert({
      id: record.id,
      user_id: userId,
      client_id: clientId || null,
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

export const fetchLiftRecordsFromCloud = async (userId: string, clientId?: string | null): Promise<LiftRecord[]> => {
  let query = supabase
    .from('lift_records')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('date', { ascending: false });

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

export const syncBodyCompToCloud = async (entry: BodyCompEntry, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('body_comp')
    .upsert({
      id: entry.id,
      user_id: userId,
      client_id: clientId || null,
      date: entry.date,
      weight_lbs: entry.weightLbs,
      body_fat_pct: entry.bodyFatPct,
      muscle_mass_lbs: entry.muscleMassLbs,
      waist_inches: entry.waistInches,
      notes: entry.notes,
    });
  if (error) throw error;
};

export const fetchBodyCompFromCloud = async (userId: string, clientId?: string | null): Promise<BodyCompEntry[]> => {
  let query = supabase
    .from('body_comp')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('date', { ascending: false });

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

interface SkeletonEnvelope {
  __sk: 1;
  sessionFocus?: string;
  skeletonExercises?: SkeletonExercise[];
  targetIntensity?: string;
  targetVolume?: string;
  targetSetsPerExercise?: string;
  targetRepRange?: string;
  trainingBlockId?: string;
  phaseIndex?: number;
  weekIndex?: number;
  dayIndex?: number;
  userNotes?: string;
}

function packSkeletonNotes(sw: ScheduledWorkout): string | null {
  const hasSkeleton = sw.sessionFocus || sw.skeletonExercises || sw.targetIntensity || sw.trainingBlockId;
  if (!hasSkeleton) return sw.notes || null;

  const envelope: SkeletonEnvelope = {
    __sk: 1,
    sessionFocus: sw.sessionFocus,
    skeletonExercises: sw.skeletonExercises,
    targetIntensity: sw.targetIntensity,
    targetVolume: sw.targetVolume,
    targetSetsPerExercise: sw.targetSetsPerExercise,
    targetRepRange: sw.targetRepRange,
    trainingBlockId: sw.trainingBlockId,
    phaseIndex: sw.phaseIndex,
    weekIndex: sw.weekIndex,
    dayIndex: sw.dayIndex,
    userNotes: sw.notes || undefined,
  };
  return JSON.stringify(envelope);
}

function unpackSkeletonNotes(notes: string | null): Partial<ScheduledWorkout> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.__sk === 1) {
      return {
        sessionFocus: parsed.sessionFocus,
        skeletonExercises: parsed.skeletonExercises,
        targetIntensity: parsed.targetIntensity,
        targetVolume: parsed.targetVolume,
        targetSetsPerExercise: parsed.targetSetsPerExercise,
        targetRepRange: parsed.targetRepRange,
        trainingBlockId: parsed.trainingBlockId,
        phaseIndex: parsed.phaseIndex,
        weekIndex: parsed.weekIndex,
        dayIndex: parsed.dayIndex,
        notes: parsed.userNotes || undefined,
      };
    }
  } catch { /* not JSON, treat as plain notes */ }
  return { notes };
}

export const syncScheduledWorkoutToCloud = async (sw: ScheduledWorkout, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('scheduled_workouts')
    .upsert({
      id: sw.id,
      user_id: userId,
      client_id: clientId || null,
      date: sw.date,
      label: sw.label,
      phase: sw.phase,
      suggested_duration: sw.suggestedDuration,
      suggested_readiness: sw.suggestedReadiness,
      suggested_intensity: sw.suggestedIntensity,
      suggested_focus: sw.suggestedFocus,
      notes: packSkeletonNotes(sw),
      status: sw.status,
      completed_workout_id: sw.completedWorkoutId,
      generated_plan: sw.generatedPlan ?? null,
      generated_at: sw.generatedAt ?? null,
    });
  if (error) throw error;
};

export const fetchScheduledWorkoutsFromCloud = async (userId: string, clientId?: string | null): Promise<ScheduledWorkout[]> => {
  let query = supabase
    .from('scheduled_workouts')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    const skeleton = unpackSkeletonNotes(row.notes);
    return {
      id: row.id,
      date: row.date,
      label: row.label,
      phase: row.phase,
      suggestedDuration: row.suggested_duration,
      suggestedReadiness: row.suggested_readiness,
      suggestedIntensity: row.suggested_intensity,
      suggestedFocus: row.suggested_focus,
      status: row.status,
      completedWorkoutId: row.completed_workout_id,
      generatedPlan: row.generated_plan ?? undefined,
      generatedAt: row.generated_at ?? undefined,
      ...skeleton,
    };
  });
};

export const deleteScheduledWorkoutFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('scheduled_workouts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};

// ===== SLEEP =====

export const syncSleepEntryToCloud = async (entry: SleepEntry, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('sleep_journal')
    .upsert({
      id: entry.id,
      user_id: userId,
      client_id: clientId || null,
      date: entry.date,
      hours_slept: entry.hoursSlept,
      quality: entry.quality,
      notes: entry.notes,
      hrv: entry.hrv,
      resting_hr: entry.restingHR,
    });
  if (error) throw error;
};

export const fetchSleepEntriesFromCloud = async (userId: string, clientId?: string | null): Promise<SleepEntry[]> => {
  let query = supabase
    .from('sleep_journal')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('date', { ascending: false });

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

export const syncGoalToCloud = async (goal: TrainingGoal, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('training_goals')
    .upsert({
      id: goal.id,
      user_id: userId,
      client_id: clientId || null,
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

export const fetchGoalsFromCloud = async (userId: string, clientId?: string | null): Promise<TrainingGoal[]> => {
  let query = supabase
    .from('training_goals')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('start_date', { ascending: false });

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

export const syncStrengthTestToCloud = async (result: StrengthTestResult, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('strength_tests')
    .upsert({
      id: result.id,
      user_id: userId,
      client_id: clientId || null,
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

export const fetchStrengthTestsFromCloud = async (userId: string, clientId?: string | null): Promise<StrengthTestResult[]> => {
  let query = supabase
    .from('strength_tests')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('date', { ascending: false });

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

export const syncCustomTemplateToCloud = async (template: CustomTemplate, userId: string, clientId?: string | null) => {
  const { error } = await supabase
    .from('custom_templates')
    .upsert({
      id: template.id,
      user_id: userId,
      client_id: clientId || null,
      name: template.name,
      description: template.description,
      exercises: template.exercises,
      default_duration_min: template.defaultDurationMin,
      focus_area: template.focusArea,
      created_at: template.createdAt,
    });
  if (error) throw error;
};

export const fetchCustomTemplatesFromCloud = async (userId: string, clientId?: string | null): Promise<CustomTemplate[]> => {
  let query = supabase
    .from('custom_templates')
    .select('*')
    .eq('user_id', userId);
  query = applyClientFilter(query, clientId);
  const { data, error } = await query.order('created_at', { ascending: false });

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
  appMode?: string;
  /** When true, after each set the app prompts for set RPE and can suggest weight adjustments. Default false = just complete sets without prompts. */
  intraSessionAutoregulation?: boolean;
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

// ===== COACH CLIENTS =====

export const syncCoachClientToCloud = async (client: CoachClient, userId: string) => {
  // Pack extra fields into equipment JSONB to avoid schema migration
  const hasExtras =
    client.sessionStructure != null ||
    client.squat1RM != null ||
    client.benchPress1RM != null ||
    client.deadlift1RM != null ||
    client.overheadPress1RM != null;
  const equipmentPayload = hasExtras
    ? {
        __v: 2,
        items: client.equipment,
        sessionStructure: client.sessionStructure,
        squat1RM: client.squat1RM,
        benchPress1RM: client.benchPress1RM,
        deadlift1RM: client.deadlift1RM,
        overheadPress1RM: client.overheadPress1RM,
      }
    : client.equipment;

  const { error } = await supabase
    .from('coach_clients')
    .upsert({
      id: client.id,
      user_id: userId,
      name: client.name,
      email: client.email,
      weight_lbs: client.weightLbs,
      age: client.age,
      gender: client.gender,
      experience: client.experience,
      equipment: equipmentPayload,
      notes: client.notes,
      avatar_color: client.avatarColor,
      created_at: client.createdAt,
    });
  if (error) throw error;
};

export const fetchCoachClientsFromCloud = async (userId: string): Promise<CoachClient[]> => {
  const { data, error } = await supabase
    .from('coach_clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    // Handle both old format (plain array) and new format (wrapper with sessionStructure + 1RMs)
    const rawEquip = row.equipment;
    const isObject = rawEquip && typeof rawEquip === 'object' && !Array.isArray(rawEquip);
    const hasWrappedExtras =
      isObject &&
      (rawEquip.__v != null ||
        'sessionStructure' in rawEquip ||
        'squat1RM' in rawEquip ||
        'benchPress1RM' in rawEquip ||
        'deadlift1RM' in rawEquip ||
        'overheadPress1RM' in rawEquip);
    const isWrapped = !!hasWrappedExtras;
    const equipment = isWrapped ? (rawEquip.items || []) : (Array.isArray(rawEquip) ? rawEquip : []);
    const sessionStructure = isWrapped ? rawEquip.sessionStructure : undefined;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      weightLbs: row.weight_lbs,
      age: row.age,
      gender: row.gender,
      experience: row.experience,
      equipment,
      notes: row.notes,
      avatarColor: row.avatar_color,
      createdAt: row.created_at,
      ...(sessionStructure != null && sessionStructure !== '' && { sessionStructure }),
      ...(isWrapped && rawEquip.squat1RM != null && { squat1RM: Number(rawEquip.squat1RM) }),
      ...(isWrapped && rawEquip.benchPress1RM != null && { benchPress1RM: Number(rawEquip.benchPress1RM) }),
      ...(isWrapped && rawEquip.deadlift1RM != null && { deadlift1RM: Number(rawEquip.deadlift1RM) }),
      ...(isWrapped && rawEquip.overheadPress1RM != null && { overheadPress1RM: Number(rawEquip.overheadPress1RM) }),
    };
  });
};

export const deleteCoachClientFromCloud = async (id: string, userId: string) => {
  const { error } = await supabase.from('coach_clients').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
};
