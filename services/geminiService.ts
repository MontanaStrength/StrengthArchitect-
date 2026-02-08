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
  exercisePreferences?: ExercisePreferences | null
): Promise<StrengthWorkoutPlan> => {
  const response = await fetch('/api/generate-workout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data, history, trainingContext, optimizerRecommendations, exercisePreferences }),
  });

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
