
import type { SavedWorkout, CompletedSet, MuscleGroup } from './types';

/**
 * Estimates 1RM using the Epley formula: weight * (1 + reps / 30).
 * Returns 0 for invalid inputs.
 */
export const estimate1RM = (weight: number, reps: number): number => {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

/**
 * Calculates weight from a target 1RM percentage.
 * Rounds down to nearest 5 lbs for practical loading.
 */
export const weightFromPercent1RM = (oneRepMax: number, percent: number): number => {
  if (!oneRepMax || oneRepMax <= 0 || !percent) return 0;
  return Math.floor((oneRepMax * (percent / 100)) / 5) * 5;
};

/**
 * Calculates plate loading per side for a given target weight.
 * Returns an array of plate weights to load on each side.
 */
export const calculatePlates = (targetWeight: number, barWeight: number = 45, availablePlates: number[] = [45, 35, 25, 10, 5, 2.5]): number[] => {
  let remaining = (targetWeight - barWeight) / 2;
  if (remaining <= 0) return [];

  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  const result: number[] = [];

  for (const plate of sortedPlates) {
    while (remaining >= plate) {
      result.push(plate);
      remaining -= plate;
    }
  }

  return result;
};

/**
 * Formats plate loading as a human-readable string.
 */
export const formatPlateLoading = (targetWeight: number, barWeight: number = 45): string => {
  if (targetWeight <= barWeight) return 'Empty bar';
  const plates = calculatePlates(targetWeight, barWeight);
  if (plates.length === 0) return 'Empty bar';

  // Group plates: "45 + 25 + 10" per side
  const counts: Record<number, number> = {};
  for (const p of plates) {
    counts[p] = (counts[p] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([plate, count]) => count > 1 ? `${count}×${plate}` : `${plate}`)
    .join(' + ') + ' per side';
};

/**
 * Calculates total tonnage (volume load) for completed sets.
 */
export const calculateTonnage = (sets: CompletedSet[]): number => {
  return sets.reduce((total, s) => total + (s.weightLbs * s.reps), 0);
};

/**
 * Calculates estimated tonnage from a workout plan.
 */
export const estimatePlanTonnage = (exercises: { sets: number; reps: string; weightLbs?: number }[]): number => {
  let total = 0;
  for (const ex of exercises) {
    const avgReps = parseRepsToAverage(ex.reps);
    const weight = ex.weightLbs || 0;
    total += ex.sets * avgReps * weight;
  }
  return Math.round(total);
};

/**
 * Parses a rep string like "8-12" or "5" or "AMRAP" into an average number.
 */
export const parseRepsToAverage = (reps: string): number => {
  if (!reps) return 0;
  const s = reps.trim().toUpperCase();
  if (s === 'AMRAP') return 10; // rough estimate
  if (s.includes('-')) {
    const [low, high] = s.split('-').map(Number);
    return Math.round((low + high) / 2);
  }
  if (s.includes('/')) {
    // e.g., "5/3/1" → average
    const nums = s.split('/').map(Number).filter(n => !isNaN(n));
    return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};

/**
 * Formats seconds into MM:SS.
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats weight nicely.
 */
export const formatWeight = (lbs: number): string => {
  if (lbs <= 0) return 'BW';
  return `${lbs} lbs`;
};

/**
 * Computes weekly volume by muscle group from the last 7 days of history.
 */
export const computeWeeklyVolume = (history: SavedWorkout[]): Partial<Record<MuscleGroup, number>> => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(w => w.timestamp >= sevenDaysAgo);

  const volumeByMuscle: Partial<Record<MuscleGroup, number>> = {};

  for (const workout of recent) {
    for (const ex of workout.exercises) {
      // Use muscle groups covered if available, otherwise skip
      if (workout.muscleGroupsCovered) {
        for (const mg of workout.muscleGroupsCovered) {
          const key = mg as MuscleGroup;
          volumeByMuscle[key] = (volumeByMuscle[key] || 0) + ex.sets;
        }
      }
    }
  }

  return volumeByMuscle;
};

/**
 * Computes session intensity rating from exercises.
 */
export const computeSessionIntensity = (workout: SavedWorkout): 'light' | 'moderate' | 'hard' | 'very-hard' => {
  const avgRPE = workout.sessionRPE || 0;
  if (avgRPE >= 9) return 'very-hard';
  if (avgRPE >= 7.5) return 'hard';
  if (avgRPE >= 6) return 'moderate';

  // Fallback: estimate from exercises
  const exercises = workout.exercises;
  const avgPercent = exercises.reduce((sum, e) => sum + (e.percentOf1RM || 0), 0) / (exercises.length || 1);
  if (avgPercent >= 90) return 'very-hard';
  if (avgPercent >= 75) return 'hard';
  if (avgPercent >= 60) return 'moderate';
  return 'light';
};
