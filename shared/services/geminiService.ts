import { FormData, StrengthWorkoutPlan, SavedWorkout, OptimizerRecommendations, ExercisePreferences } from "../types";

export interface TrainingContext {
  phaseName: string;
  intensityFocus: string;
  volumeFocus: string;
  primaryArchetypes: string[];
  weekInPhase: number;
  totalWeeksInPhase: number;
  blockName: string;
  goalEvent?: string;
  /** 1-based week index within the block */
  weekInBlock?: number;
  /** Total weeks in the block (from phases or lengthWeeks) */
  totalBlockWeeks?: number;
  /** True when in the final 2 weeks of the block (peak-force emphasis) */
  isEndOfBlock?: boolean;
}

export interface SwapAndRebuildRequest {
  replaceExerciseId: string;
  withExerciseId: string;
  withExerciseName: string;
}

export const generateWorkout = async (
  data: FormData,
  history: SavedWorkout[] = [],
  trainingContext?: TrainingContext | null,
  optimizerRecommendations?: OptimizerRecommendations | null,
  exercisePreferences?: ExercisePreferences | null,
  goalBias?: number | null,
  volumeTolerance?: number | null,
  swapAndRebuild?: SwapAndRebuildRequest | null
): Promise<StrengthWorkoutPlan> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  let response: Response;
  try {
    response = await fetch('/api/generate-workout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, history, trainingContext, optimizerRecommendations, exercisePreferences, goalBias, volumeTolerance, swapAndRebuild }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const msg = err?.message || '';
    if (err?.name === 'AbortError') {
      throw new Error(
        "Workout generation timed out after 2 minutes. The AI server may be warming up — please try again."
      );
    }
    if (msg === 'Failed to fetch' || msg.includes('fetch')) {
      throw new Error(
        "Could not reach the workout server. Make sure you're running the app with `npm run dev` and that GEMINI_API_KEY is set in your .env file."
      );
    }
    throw err;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let message = `Workout generation failed (HTTP ${response.status}).`;
    try {
      const text = await response.text();
      try {
        const errJson = JSON.parse(text);
        if (errJson?.error) message = String(errJson.error);
      } catch {
        // Response wasn't JSON — include the raw text for debugging
        if (text && text.length < 500) message += ' ' + text;
      }
    } catch {
      // Could not read response body at all
    }
    throw new Error(message);
  }

  const json = await response.json();

  // Validate essential response shape
  if (!json || typeof json !== 'object') {
    throw new Error('AI returned an invalid response. Please try again.');
  }
  if (!json.title || !json.focus || !Array.isArray(json.exercises)) {
    throw new Error('AI response is missing required fields (title, focus, or exercises). Please try again.');
  }
  if (json.exercises.length === 0) {
    throw new Error('AI returned an empty workout. Please try again.');
  }
  for (const ex of json.exercises) {
    if (!ex.exerciseName || !ex.sets || !ex.reps) {
      throw new Error(`AI returned a malformed exercise ("${ex.exerciseName || 'unknown'}"). Please try again.`);
    }
  }

  return json as StrengthWorkoutPlan;
};
