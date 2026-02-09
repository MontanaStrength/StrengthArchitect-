import type { StrengthWorkoutPlan, ExerciseBlock } from '../types';

const escapeCsv = (val: string | number): string => {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/**
 * Build CSV rows for a single workout, suitable for import into Google Sheets.
 * Columns: Exercise, Sets, Reps, Weight (lbs), %1RM, RPE, Rest (sec), Notes
 */
export function workoutToCsv(plan: StrengthWorkoutPlan): string {
  const header = ['Exercise', 'Sets', 'Reps', 'Weight (lbs)', '%1RM', 'RPE', 'Rest (sec)', 'Notes'];
  const rows: string[][] = [header.map(escapeCsv)];

  const working = plan.exercises.filter(e => !e.isWarmupSet);
  for (const e of working) {
    rows.push([
      escapeCsv(e.exerciseName),
      escapeCsv(e.sets),
      escapeCsv(e.reps),
      e.weightLbs != null ? escapeCsv(e.weightLbs) : '',
      e.percentOf1RM != null ? escapeCsv(e.percentOf1RM) : '',
      e.rpeTarget != null ? escapeCsv(e.rpeTarget) : '',
      escapeCsv(e.restSeconds),
      (e.notes || e.coachingCue || (e.isWarmupSet ? 'Warmup' : '') || '').trim(),
    ]);
  }

  return rows.map(r => r.join(',')).join('\n');
}

/**
 * Build tab-separated table for pasting into Google Sheets (e.g. Ctrl+V in a new sheet).
 */
export function workoutToTsv(plan: StrengthWorkoutPlan): string {
  const header = ['Exercise', 'Sets', 'Reps', 'Weight (lbs)', '%1RM', 'RPE', 'Rest (sec)', 'Notes'];
  const rows: string[][] = [header];

  const working = plan.exercises.filter(e => !e.isWarmupSet);
  for (const e of working) {
    rows.push([
      e.exerciseName,
      String(e.sets),
      e.reps,
      e.weightLbs != null ? String(e.weightLbs) : '',
      e.percentOf1RM != null ? String(e.percentOf1RM) : '',
      e.rpeTarget != null ? String(e.rpeTarget) : '',
      String(e.restSeconds),
      (e.notes || e.coachingCue || '').trim(),
    ]);
  }

  return rows.map(r => r.join('\t')).join('\n');
}

/**
 * Suggested filename for CSV download (safe for client name).
 */
export function workoutExportFilename(plan: StrengthWorkoutPlan, clientName?: string): string {
  const safeTitle = plan.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').slice(0, 40);
  const date = new Date().toISOString().split('T')[0];
  const suffix = clientName
    ? `${clientName.replace(/[^a-zA-Z0-9-_]/g, '')}-${date}`
    : date;
  return `Workout-${safeTitle}-${suffix}.csv`;
}
