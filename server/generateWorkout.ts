import { GoogleGenAI, Type } from '@google/genai';
import type { FormData, SavedWorkout, StrengthWorkoutPlan, OptimizerRecommendations } from '../types';
import { STRENGTH_ARCHETYPES } from '../services/strengthArchetypes';
import { getExerciseListForPrompt } from '../services/exerciseLibrary';
import { parseRepsToAverage } from '../utils';

// ===== TRAINING INTELLIGENCE =====

const computeSessionIntensitySignals = (workout: SavedWorkout) => {
  const exercises = workout.exercises || [];
  const avgPercent = exercises.reduce((sum, e) => sum + (e.percentOf1RM || 0), 0) / (exercises.length || 1);
  const avgRPE = exercises.reduce((sum, e) => sum + (e.rpeTarget || 0), 0) / (exercises.length || 1);
  const totalSets = exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  const estimatedTonnage = exercises.reduce((sum, e) => {
    const reps = parseRepsToAverage(e.reps);
    return sum + (e.sets * reps * (e.weightLbs || 0));
  }, 0);

  return { avgPercent, avgRPE, totalSets, estimatedTonnage };
};

const computeRecentLoadExposure = (history: SavedWorkout[]) => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7 = history.filter(w => w.timestamp >= sevenDaysAgo);

  let totalTonnage = 0;
  let totalSets = 0;
  let hardSessions = 0;

  for (const w of last7) {
    const signals = computeSessionIntensitySignals(w);
    totalTonnage += w.actualTonnage || signals.estimatedTonnage;
    totalSets += signals.totalSets;
    const isHard = signals.avgPercent >= 85 || signals.avgRPE >= 8.5 || (w.sessionRPE || 0) >= 8;
    if (isHard) hardSessions++;
  }

  return { last7Count: last7.length, totalTonnage, totalSets, hardSessions };
};

const getExperienceBucket = (exp: string): 'beginner' | 'intermediate' | 'advanced' | 'elite' => {
  const e = String(exp).toLowerCase();
  if (e.includes('elite')) return 'elite';
  if (e.includes('advanced')) return 'advanced';
  if (e.includes('intermediate')) return 'intermediate';
  return 'beginner';
};

const computeGuardrails = (experience: string) => {
  const bucket = getExperienceBucket(experience);
  if (bucket === 'beginner') {
    return { maxSetsPerSession: 18, maxExercises: 5, maxPercentOf1RM: 85, maxHardSessionsPer7d: 2, forceCompounds: true };
  }
  if (bucket === 'intermediate') {
    return { maxSetsPerSession: 24, maxExercises: 7, maxPercentOf1RM: 92, maxHardSessionsPer7d: 3, forceCompounds: false };
  }
  if (bucket === 'advanced') {
    return { maxSetsPerSession: 30, maxExercises: 8, maxPercentOf1RM: 97, maxHardSessionsPer7d: 3, forceCompounds: false };
  }
  return { maxSetsPerSession: 35, maxExercises: 10, maxPercentOf1RM: 100, maxHardSessionsPer7d: 4, forceCompounds: false };
};

const computeDisallowedArchetypes = (data: FormData) => {
  const readiness = String(data.readiness).toLowerCase();
  const bucket = getExperienceBucket(data.trainingExperience);
  const disallowed = new Set<string>();

  // Beginners cannot do advanced techniques
  if (bucket === 'beginner') {
    for (const id of ['5', '7', '8', '18', '20', '26', '27', '28', '39', '40', '41']) {
      disallowed.add(id);
    }
  }

  // Low readiness: no high-intensity or high-volume protocols
  if (readiness.includes('low')) {
    for (const id of ['4', '5', '8', '13', '14', '18', '20', '26', '28', '39', '40']) {
      disallowed.add(id);
    }
  }

  // Intermediate: limit some advanced protocols
  if (bucket === 'intermediate') {
    for (const id of ['8', '39', '40']) {
      disallowed.add(id);
    }
  }

  return Array.from(disallowed);
};

const computeProgressionDirective = (data: FormData, history: SavedWorkout[]) => {
  const recent = history.slice(0, 6);
  const recentHardCount = recent.reduce((acc, w) => {
    const signals = computeSessionIntensitySignals(w);
    const isHard = signals.avgPercent >= 85 || signals.avgRPE >= 8.5 || (w.sessionRPE || 0) >= 8;
    return acc + (isHard ? 1 : 0);
  }, 0);

  const last = history[0];
  const lastFeedback = last?.feedback?.rating;

  let directive = 'Maintain current loading. Make small technical progressions only.';
  let bias: 'deload' | 'regress' | 'maintain' | 'progress' = 'maintain';

  if (String(data.readiness).toLowerCase().includes('low')) {
    bias = 'deload';
    directive = 'DELOAD: reduce volume by 40-50% and intensity by 10-15%. Focus on movement quality. No sets above RPE 6.';
  } else if (recentHardCount >= 3) {
    bias = 'maintain';
    directive = 'CONSOLIDATE: Multiple hard sessions recently. Do NOT increase load. Maintain volume or slightly reduce. Consider a different movement variation.';
  } else if (lastFeedback === 'down') {
    bias = 'regress';
    directive = 'REGRESS SLIGHTLY: Reduce ONE variable — either drop 1 set per exercise, or reduce weight by 5-10 lbs, or use an easier exercise variation.';
  } else if (lastFeedback === 'up') {
    bias = 'progress';
    directive = 'PROGRESS: Change exactly ONE lever — add 5 lbs to main lifts, or add 1 set, or add 1-2 reps per set. Do NOT change multiple variables.';
  }

  return { recentHardCount, bias, directive };
};

// ===== MAIN GENERATION FUNCTION =====

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

export const generateWorkoutServer = async (
  data: FormData,
  history: SavedWorkout[] = [],
  trainingContext?: TrainingContext | null,
  optimizerRecommendations?: OptimizerRecommendations | null
): Promise<StrengthWorkoutPlan> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Model routing: Pro for complex contexts, Flash for simple
  const isComplexContext =
    history.length >= 4 ||
    data.trainingExperience.includes('Advanced') ||
    data.trainingExperience.includes('Elite');
  const primaryModelId = isComplexContext ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  const fallbackModelId = 'gemini-2.5-flash';

  const recentWorkouts = history.slice(0, 12);
  const recentArchetypeIds = recentWorkouts.map(w => w.archetypeId).filter((id): id is string => Boolean(id));
  const forbiddenArchetypeIds = Array.from(new Set(recentArchetypeIds.slice(0, 5)));

  const progression = computeProgressionDirective(data, history);
  const safetyExposure = computeRecentLoadExposure(history);
  const guardrails = computeGuardrails(data.trainingExperience);
  const disallowedArchetypes = computeDisallowedArchetypes(data);

  // Build history context
  let historyContext = '';
  if (recentWorkouts.length > 0) {
    const formattedHistory = recentWorkouts
      .map((w, i) => {
        const signals = computeSessionIntensitySignals(w);
        const feedback = w.feedback?.rating ? ` (Feedback: ${w.feedback.rating})` : '';
        const tonnage = w.actualTonnage || signals.estimatedTonnage;
        const intensityTag = signals.avgPercent >= 85 || signals.avgRPE >= 8.5 ? 'Hard' : 'Moderate/Easy';
        return `${i + 1}. [${new Date(w.timestamp).toLocaleDateString()}] "${w.title}" (Focus: ${w.focus})${w.archetypeId ? ` (Archetype: ${w.archetypeId})` : ''} (${intensityTag}) — ${signals.totalSets} sets, ~${Math.round(tonnage)} lbs tonnage${w.sessionRPE ? `, Session RPE: ${w.sessionRPE}` : ''}${feedback}`;
      })
      .join('\n');

    historyContext = `
    TRAINING LOG (Last ${recentWorkouts.length} Sessions):
    ${formattedHistory}

    PROGRESSION ENGINE:
    - Recent hard-session count (last 6): ${progression.recentHardCount}
    - Today's progression bias: ${progression.bias.toUpperCase()}
    - Directive: ${progression.directive}

    PROGRAMMING STRATEGY:
    1. FATIGUE MANAGEMENT: If the last 2 sessions were "Hard", prefer a moderate-intensity or different muscle focus today.
    2. VARIETY: Do not repeat any archetypeId used in the last 5 sessions: ${forbiddenArchetypeIds.length ? forbiddenArchetypeIds.join(', ') : 'N/A'}
    3. MOVEMENT BALANCE: Ensure all movement patterns are hit across the training week (squat, hinge, push, pull, carry, core).
    `;
  }

  // Build training block context
  let blockContext = '';
  if (trainingContext) {
    blockContext = `
    ACTIVE TRAINING BLOCK: "${trainingContext.blockName}"
    - Current Phase: ${trainingContext.phaseName} (Week ${trainingContext.weekInPhase} of ${trainingContext.totalWeeksInPhase})
    - Intensity Focus: ${trainingContext.intensityFocus}
    - Volume Focus: ${trainingContext.volumeFocus}
    - Preferred Archetypes: ${trainingContext.primaryArchetypes.join(', ')}
    ${trainingContext.goalEvent ? `- Goal Event: ${trainingContext.goalEvent}` : ''}
    IMPORTANT: Respect the training block's phase. Choose archetypes that align with the phase focus.
    `;
  }

  // ===== OPTIMIZER INTEGRATION =====
  let optimizerContext = '';
  if (optimizerRecommendations) {
    optimizerContext = `
    ### SESSION OPTIMIZER RECOMMENDATIONS (RESPECT THESE)
    The user has an active session optimizer providing evidence-based recommendations:
    - Recommended total working sets this session: ${optimizerRecommendations.sessionVolume}
    - Recommended rep scheme: ${optimizerRecommendations.repScheme}
    - Recommended intensity range: ${optimizerRecommendations.intensityRange.min}-${optimizerRecommendations.intensityRange.max}% 1RM
    - Recommended rest between sets: ${optimizerRecommendations.restRange.min}-${optimizerRecommendations.restRange.max} seconds
    - Recommended exercise count: ${optimizerRecommendations.exerciseCount.min}-${optimizerRecommendations.exerciseCount.max} exercises
    - Optimizer rationale: ${optimizerRecommendations.rationale}
    ${optimizerRecommendations.muscleGroupPriorities ? `- Muscle group priorities: ${Object.entries(optimizerRecommendations.muscleGroupPriorities).map(([mg, p]) => `${mg}: ${p}`).join(', ')}` : ''}
    ${optimizerRecommendations.suggestedFocus ? `- Suggested session focus: ${optimizerRecommendations.suggestedFocus}` : ''}

    IMPORTANT: The optimizer recommendations should be treated as STRONG guidance. Adjust the selected archetype's volume and rep scheme to match the optimizer's output. The optimizer has analyzed the athlete's weekly volume, fatigue, and recovery to produce these numbers.
    `;
  }

  // Build 1RM context
  const liftPRs = [
    data.squat1RM ? `Squat 1RM: ${data.squat1RM} lbs` : null,
    data.benchPress1RM ? `Bench Press 1RM: ${data.benchPress1RM} lbs` : null,
    data.deadlift1RM ? `Deadlift 1RM: ${data.deadlift1RM} lbs` : null,
    data.overheadPress1RM ? `OHP 1RM: ${data.overheadPress1RM} lbs` : null,
  ].filter(Boolean).join(', ');

  const prompt = `
    You are an expert strength and conditioning coach designing a barbell/strength training session.
    Create a highly specific, scientifically-backed workout plan for:
    - Training Experience: ${data.trainingExperience}
    - Readiness: ${data.readiness}
    - Available Equipment: ${data.availableEquipment.join(', ')}
    - Session Duration Target: ${data.duration} minutes
    - Training Goal Focus: ${data.trainingGoalFocus}
    - Athlete: ${data.age}yo ${data.gender}, ${data.weightLbs} lbs
    ${liftPRs ? `- Known 1RMs: ${liftPRs}` : '- No 1RM data provided — use RPE-based loading'}

    ${historyContext}
    ${blockContext}
    ${optimizerContext}

    ### EXERCISE LIBRARY (Select exercises ONLY from this list, use the exact exerciseId)
    ${getExerciseListForPrompt()}

    ### STRENGTH TRAINING ARCHETYPES (Select ONE)
    ${STRENGTH_ARCHETYPES}

    ### LOADING RULES
    - If 1RM data is provided, calculate weights as percentages of 1RM. Round to nearest 5 lbs.
    - If no 1RM data, use RPE targets only (e.g., RPE 7, RPE 8).
    - Include warmup sets for main compound lifts (e.g., empty bar, 50%, 70% before working weight).
    - All weights must be in lbs and achievable with standard plates.
    - For the "reps" field, use a string: "5" for fixed, "8-12" for range, "AMRAP" for max reps, "5/3/1" for Wendler sets.

    ### REP & SET GUIDELINES
    - Strength focus: 3-6 sets of 1-5 reps @ 80-100% 1RM, 3-5 min rest
    - Hypertrophy focus: 3-4 sets of 8-12 reps @ 60-75% 1RM, 60-120 sec rest
    - Power focus: 4-6 sets of 1-3 reps @ 70-85% 1RM, 2-3 min rest, MAX speed
    - Endurance focus: 2-3 sets of 15-25 reps @ 40-55% 1RM, 30-60 sec rest
    - General: Mix of the above based on movement pattern

    ### EXERCISE SELECTION RULES
    1. Every session MUST start with a main compound lift (squat, deadlift, bench, or OHP).
    2. Follow with 1-2 supplemental compound lifts.
    3. Finish with 2-3 isolation/accessory movements.
    4. Balance push and pull volume within the session or across the week.
    5. Use exerciseId values from the exercise library above.
    6. Mark warmup sets with isWarmupSet: true.

    ### SUPERSET FORMATTING
    - If using supersets, assign the same supersetGroup letter (e.g., "A") to paired exercises.
    - Supersets should pair non-competing muscle groups.

    ### SAFETY GUARDRAILS (NON-NEGOTIABLE)
    - Max sets this session: ${guardrails.maxSetsPerSession} (working sets only, not counting warmups)
    - Max exercises: ${guardrails.maxExercises}
    - Max % of 1RM: ${guardrails.maxPercentOf1RM}%
    - Weekly exposure (last 7 days): ${safetyExposure.last7Count} sessions, ${safetyExposure.hardSessions} hard, ~${Math.round(safetyExposure.totalTonnage)} lbs total tonnage
    - Max hard sessions/week: ${guardrails.maxHardSessionsPer7d}
    - Disallowed archetypes today: ${disallowedArchetypes.length ? disallowedArchetypes.join(', ') : 'None'}
    ${guardrails.forceCompounds ? '- BEGINNER: Use only compound lifts + 1-2 simple accessories. Prioritize squat, bench/OHP, deadlift/row.' : ''}
    - If readiness is LOW, reduce volume 40-50%, no sets above RPE 7, and consider a deload archetype.
    - If weekly hard session cap is exceeded, MUST choose a deload/recovery or moderate archetype.

    ### PROGRESSION RULES
    If repeating an archetype from history, apply the progression directive above:
    - Progress/regress by changing exactly ONE lever (weight OR reps OR sets).
    - Never change multiple levers simultaneously.
    - If the chosen archetype is in the forbidden list, choose a different one.

    ${isComplexContext ? 'Research current strength training science to ensure the programming is evidence-based and elite-level.' : ''}
  `;

  // Structured output schema
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      archetypeId: { type: Type.STRING },
      title: { type: Type.STRING },
      focus: { type: Type.STRING },
      totalDurationMin: { type: Type.INTEGER },
      difficulty: { type: Type.STRING },
      summary: { type: Type.STRING },
      whyThisWorkout: { type: Type.STRING },
      physiologicalBenefits: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      coachingTips: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['title', 'explanation'] as const
        }
      },
      estimatedTonnage: { type: Type.INTEGER },
      movementPatternsCovered: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      muscleGroupsCovered: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      exercises: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            exerciseId: { type: Type.STRING },
            exerciseName: { type: Type.STRING },
            sets: { type: Type.INTEGER },
            reps: { type: Type.STRING },
            weightLbs: { type: Type.INTEGER },
            percentOf1RM: { type: Type.INTEGER },
            rpeTarget: { type: Type.NUMBER },
            rirTarget: { type: Type.INTEGER },
            restSeconds: { type: Type.INTEGER },
            tempo: { type: Type.STRING },
            supersetGroup: { type: Type.STRING },
            notes: { type: Type.STRING },
            coachingCue: { type: Type.STRING },
            isWarmupSet: { type: Type.BOOLEAN },
          },
          required: ['exerciseId', 'exerciseName', 'sets', 'reps', 'restSeconds'] as const
        }
      }
    },
    required: ['archetypeId', 'title', 'exercises', 'totalDurationMin', 'focus', 'summary', 'whyThisWorkout'] as const
  };

  const attemptGeneration = async (modelId: string, useSearch: boolean): Promise<StrengthWorkoutPlan> => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error('AI returned empty response.');

    let jsonString = text.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
    }
    return JSON.parse(jsonString) as StrengthWorkoutPlan;
  };

  try {
    return await attemptGeneration(primaryModelId, isComplexContext);
  } catch (primaryErr) {
    console.warn(
      `Primary model (${primaryModelId}) failed, retrying with fallback (${fallbackModelId}):`,
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );
    try {
      return await attemptGeneration(fallbackModelId, false);
    } catch (fallbackErr) {
      console.error('Fallback model also failed:', fallbackErr);
      throw new Error('AI response format was invalid after retry. Please try again.');
    }
  }
};
