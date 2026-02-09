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
}

export const generateWorkout = async (
  data: FormData,
  history: SavedWorkout[] = [],
  trainingContext?: TrainingContext | null,
  optimizerRecommendations?: OptimizerRecommendations | null,
  exercisePreferences?: ExercisePreferences | null,
  goalBias?: number | null,
  volumeTolerance?: number | null
): Promise<StrengthWorkoutPlan> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000); // 45s timeout

  let response: Response;
  try {
    response = await fetch('/api/generate-workout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, history, trainingContext, optimizerRecommendations, exercisePreferences, goalBias, volumeTolerance }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const msg = err?.message || '';
    if (err?.name === 'AbortError') {
      throw new Error(
        "Workout generation timed out after 45 seconds. The AI server may be warming up — please try again."
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
    let message = 'Something went wrong generating the workout. Please try again.';
    try {
      const errJson = await response.json();
      if (errJson?.error) message = String(errJson.error);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as StrengthWorkoutPlan;
};
