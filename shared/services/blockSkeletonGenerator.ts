import {
  TrainingBlock,
  ScheduledWorkout,
  SkeletonExercise,
  SplitPattern,
  ExerciseSlot,
  ExerciseSlotCategory,
} from '../types';
import { getExerciseById } from './exerciseLibrary';

const SPLIT_FOCUS_ROTATION: Record<SplitPattern, string[]> = {
  'full-body':            ['Full Body'],
  'upper-lower':          ['Upper', 'Lower'],
  'push-pull-legs':       ['Push', 'Pull', 'Legs'],
  'squat-bench-deadlift': ['Squat Day', 'Bench Day', 'Deadlift Day'],
  'custom':               ['Session'],
};

type SlotKey = { category: ExerciseSlotCategory; tier: string };

const SESSION_EXERCISE_MAP: Record<string, SlotKey[]> = {
  'Upper': [
    { category: 'bench', tier: 'primary' },
    { category: 'bench', tier: 'secondary' },
    { category: 'ohp', tier: 'primary' },
    { category: 'accessory', tier: 'slot-1' },
  ],
  'Lower': [
    { category: 'squat', tier: 'primary' },
    { category: 'squat', tier: 'secondary' },
    { category: 'deadlift', tier: 'primary' },
    { category: 'core', tier: 'anti-flexion' },
  ],
  'Push': [
    { category: 'bench', tier: 'primary' },
    { category: 'bench', tier: 'secondary' },
    { category: 'ohp', tier: 'primary' },
    { category: 'ohp', tier: 'secondary' },
  ],
  'Pull': [
    { category: 'deadlift', tier: 'primary' },
    { category: 'deadlift', tier: 'secondary' },
    { category: 'accessory', tier: 'slot-1' },
    { category: 'core', tier: 'anti-extension' },
  ],
  'Legs': [
    { category: 'squat', tier: 'primary' },
    { category: 'squat', tier: 'secondary' },
    { category: 'deadlift', tier: 'secondary' },
    { category: 'core', tier: 'anti-flexion' },
  ],
  'Squat Day': [
    { category: 'squat', tier: 'primary' },
    { category: 'squat', tier: 'secondary' },
    { category: 'squat', tier: 'tertiary' },
    { category: 'core', tier: 'anti-flexion' },
  ],
  'Bench Day': [
    { category: 'bench', tier: 'primary' },
    { category: 'bench', tier: 'secondary' },
    { category: 'bench', tier: 'tertiary' },
    { category: 'ohp', tier: 'primary' },
  ],
  'Deadlift Day': [
    { category: 'deadlift', tier: 'primary' },
    { category: 'deadlift', tier: 'secondary' },
    { category: 'deadlift', tier: 'tertiary' },
    { category: 'core', tier: 'anti-extension' },
  ],
  'Full Body': [
    { category: 'squat', tier: 'primary' },
    { category: 'bench', tier: 'primary' },
    { category: 'deadlift', tier: 'primary' },
    { category: 'ohp', tier: 'primary' },
  ],
  'Session': [
    { category: 'squat', tier: 'primary' },
    { category: 'bench', tier: 'primary' },
    { category: 'deadlift', tier: 'primary' },
  ],
};

const INTENSITY_TARGETS: Record<string, { intensity: string; repRange: string }> = {
  'minimal':   { intensity: '40-50% 1RM', repRange: '12-15' },
  'low':       { intensity: '50-60% 1RM', repRange: '10-15' },
  'moderate':  { intensity: '60-75% 1RM', repRange: '8-12' },
  'high':      { intensity: '78-88% 1RM', repRange: '3-6' },
  'very-high': { intensity: '85-95% 1RM', repRange: '1-3' },
};

const VOLUME_TARGETS: Record<string, { volume: string; setsPerExercise: string }> = {
  'minimal':   { volume: 'Minimal',   setsPerExercise: '1-2' },
  'low':       { volume: 'Low',       setsPerExercise: '2-3' },
  'moderate':  { volume: 'Moderate',  setsPerExercise: '3-4' },
  'high':      { volume: 'High',      setsPerExercise: '3-5' },
  'very-high': { volume: 'Very High', setsPerExercise: '4-5' },
};

function resolveSlotToExercise(
  slots: ExerciseSlot[],
  category: ExerciseSlotCategory,
  tier: string,
): SkeletonExercise | null {
  const slot = slots.find(s => s.category === category && s.tier === tier);
  if (!slot?.exerciseId) return null;
  const exercise = getExerciseById(slot.exerciseId);
  if (!exercise) return null;

  const skeletonTier: SkeletonExercise['tier'] =
    tier === 'primary' || tier === 'secondary' || tier === 'tertiary'
      ? tier
      : 'accessory';

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    tier: skeletonTier,
  };
}

function getSessionDates(
  weekStartMs: number,
  sessionsPerWeek: number,
  trainingDays?: number[],
): string[] {
  if (trainingDays && trainingDays.length > 0) {
    const weekStartDate = new Date(weekStartMs);
    const startDayOfWeek = weekStartDate.getUTCDay();
    const sortedDays = [...trainingDays].sort((a, b) => a - b);
    const daysToUse = sortedDays.slice(0, sessionsPerWeek);

    return daysToUse.map(dayOfWeek => {
      let offset = dayOfWeek - startDayOfWeek;
      if (offset < 0) offset += 7;
      const dateMs = weekStartMs + offset * 24 * 60 * 60 * 1000;
      return new Date(dateMs).toISOString().split('T')[0];
    });
  }

  const dates: string[] = [];
  const daySpacing = Math.floor(7 / sessionsPerWeek);
  for (let s = 0; s < sessionsPerWeek; s++) {
    const dateMs = weekStartMs + s * daySpacing * 24 * 60 * 60 * 1000;
    dates.push(new Date(dateMs).toISOString().split('T')[0]);
  }
  return dates;
}

export function generateBlockSkeleton(block: TrainingBlock): ScheduledWorkout[] {
  if (!block.phases || block.phases.length === 0) return [];

  const workouts: ScheduledWorkout[] = [];
  const slots = block.exercisePreferences?.slots || [];
  let weekOffset = 0;
  let globalSessionIndex = 0;

  for (let phaseIdx = 0; phaseIdx < block.phases.length; phaseIdx++) {
    const phase = block.phases[phaseIdx];
    const focusRotation = SPLIT_FOCUS_ROTATION[phase.splitPattern] || ['Session'];
    const iTarget = INTENSITY_TARGETS[phase.intensityFocus] || INTENSITY_TARGETS['moderate'];
    const vTarget = VOLUME_TARGETS[phase.volumeFocus] || VOLUME_TARGETS['moderate'];

    const intensityMap: Record<string, 'low' | 'moderate' | 'high' | 'rest'> = {
      minimal: 'rest', low: 'low', moderate: 'moderate', high: 'high', 'very-high': 'high',
    };

    for (let week = 0; week < phase.weekCount; week++) {
      const weekStartMs = block.startDate + (weekOffset + week) * 7 * 24 * 60 * 60 * 1000;
      const sessionDates = getSessionDates(weekStartMs, phase.sessionsPerWeek, block.trainingDays);

      for (let session = 0; session < sessionDates.length; session++) {
        const sessionFocus = focusRotation[globalSessionIndex % focusRotation.length];
        const slotKeys = SESSION_EXERCISE_MAP[sessionFocus] || [];

        const skeletonExercises: SkeletonExercise[] = [];
        for (const key of slotKeys) {
          const ex = resolveSlotToExercise(slots, key.category, key.tier);
          if (ex) skeletonExercises.push(ex);
        }

        workouts.push({
          id: crypto.randomUUID(),
          date: sessionDates[session],
          label: `${phase.phase} - Wk${week + 1} ${sessionFocus}`,
          phase: phase.phase,
          suggestedIntensity: intensityMap[phase.intensityFocus] || 'moderate',
          suggestedDuration: 60,
          status: 'planned',
          trainingBlockId: block.id,
          phaseIndex: phaseIdx,
          weekIndex: week,
          dayIndex: session,
          sessionFocus,
          skeletonExercises: skeletonExercises.length > 0 ? skeletonExercises : undefined,
          targetIntensity: iTarget.intensity,
          targetVolume: vTarget.volume,
          targetSetsPerExercise: vTarget.setsPerExercise,
          targetRepRange: iTarget.repRange,
        });

        globalSessionIndex++;
      }
    }
    weekOffset += phase.weekCount;
  }

  return workouts;
}
