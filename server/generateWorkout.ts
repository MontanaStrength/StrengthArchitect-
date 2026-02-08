import { GoogleGenAI, Type } from '@google/genai';
import type { FormData, SavedWorkout, StrengthWorkoutPlan, OptimizerRecommendations, ExercisePreferences } from '../types';
import { STRENGTH_ARCHETYPES } from '../services/strengthArchetypes';
import { getExerciseListForPrompt, getExerciseById } from '../services/exerciseLibrary';
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
  optimizerRecommendations?: OptimizerRecommendations | null,
  exercisePreferences?: ExercisePreferences | null,
  goalBias?: number | null
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
    ${optimizerRecommendations.metabolicLoadTarget ? `
    ### METABOLIC STRESS PRESCRIPTION (Frederick Formula) — PER EXERCISE
    - Target metabolic load PER EXERCISE: ${optimizerRecommendations.metabolicLoadTarget.min}–${optimizerRecommendations.metabolicLoadTarget.max}
    - Current projected zone: ${optimizerRecommendations.metabolicLoadZone || 'unknown'}
    - Estimated load per working set: ${optimizerRecommendations.metabolicLoadPerSet || 'N/A'}
    ${optimizerRecommendations.metabolicSetsPerExercise ? `- Recommended sets per exercise: ${optimizerRecommendations.metabolicSetsPerExercise.min}–${optimizerRecommendations.metabolicSetsPerExercise.max}` : ''}
    - Formula: Load_set = Intensity × Σ(i=1→reps) e^(-0.215 × (RIR + reps - i))
    CRITICAL FOR HYPERTROPHY: EACH EXERCISE's total metabolic load (sum of that exercise's working sets) should land within ${optimizerRecommendations.metabolicLoadTarget.min}–${optimizerRecommendations.metabolicLoadTarget.max}. This is PER EXERCISE, not the whole session. The moderate zone (500-800) per exercise is the productive hypertrophy zone.` : ''}
    ${optimizerRecommendations.fatigueScoreTarget ? `
    ### VOLUME STRESS PRESCRIPTION (Hanley Fatigue Metric)
    - Formula: Score = Reps × (100 / (100 - Intensity))²
    - Target per-exercise fatigue zone: ${optimizerRecommendations.fatigueScoreTarget.min}–${optimizerRecommendations.fatigueScoreTarget.max} (${optimizerRecommendations.fatigueScoreZone || 'moderate'})
    - Prescribed total reps per exercise: ${optimizerRecommendations.targetRepsPerExercise || 'N/A'}
    CRITICAL: EACH INDIVIDUAL EXERCISE should aim for approximately ${optimizerRecommendations.targetRepsPerExercise} total working reps at the recommended intensity. This target is PER EXERCISE, not total across the session. Structure sets × reps per exercise to hit this total while respecting the metabolic stress targets above (for hypertrophy) or using appropriate set/rep schemes for the goal.` : ''}
    ${optimizerRecommendations.strengthSetDivision ? `
    ### PEAK FORCE SET DIVISION (Strength/Power)
    - Peak force drops after rep ${optimizerRecommendations.peakForceDropRep} at the recommended intensity
    - Prescribed set structure: ${optimizerRecommendations.strengthSetDivision.sets} sets × ${optimizerRecommendations.strengthSetDivision.repsPerSet} reps
    - Rest between sets: ${Math.round(optimizerRecommendations.strengthSetDivision.restSeconds / 60)}+ minutes (full neural recovery)
    CRITICAL FOR STRENGTH/POWER: Cap working sets at ${optimizerRecommendations.peakForceDropRep} reps maximum. Every rep must be a quality force rep — no grinding past the force drop-off point. Use the prescribed rest periods to ensure full neural recovery between sets.` : ''}

    IMPORTANT: The optimizer recommendations should be treated as STRONG guidance. Adjust the selected archetype's volume and rep scheme to match the optimizer's output. The optimizer has analyzed the athlete's weekly volume, fatigue, and recovery to produce these numbers.
    `;
  }

  // ===== EXERCISE PREFERENCES INTEGRATION =====
  let exercisePrefsContext = '';
  if (exercisePreferences?.slots) {
    const filled = exercisePreferences.slots.filter(s => s.exerciseId);
    if (filled.length > 0) {
      const lines = filled.map(s => {
        const ex = getExerciseById(s.exerciseId!);
        return `- ${s.category.toUpperCase()} (${s.tier}): ${ex?.name || s.exerciseId} (${s.exerciseId})`;
      });
      exercisePrefsContext = `
    ### ATHLETE'S EXERCISE PREFERENCES
    The athlete has selected specific exercises for their training block. PRIORITIZE these exercises:
    ${lines.join('\n    ')}

    RULES:
    - Use the athlete's PRIMARY selections as the main compound lifts for the session.
    - Use SECONDARY/TERTIARY selections as supplemental/variation work.
    - Respect the core selections (anti-flexion, anti-extension, anti-rotation) for core work.
    - Accessory slot selections should be included when they fit the session's focus.
    - Slots marked "AI chooses" (not listed above) are yours to fill based on the session's needs.
    `;
    }
  }

  // ===== GOAL BIAS INTEGRATION =====
  let goalBiasContext = '';
  if (goalBias !== undefined && goalBias !== null) {
    const biasLabel =
      goalBias < 20 ? 'Pure Hypertrophy — maximize muscle growth, moderate loads, higher volume' :
      goalBias < 40 ? 'Hypertrophy-biased — prioritize size with some strength work on main lifts' :
      goalBias < 60 ? 'Balanced — equal emphasis on strength and hypertrophy' :
      goalBias < 80 ? 'Strength-biased — prioritize heavy compounds with hypertrophy assistance' :
      'Pure Strength — maximize force production, heavy loads, lower volume, full recovery';
    goalBiasContext = `
    ### BLOCK GOAL BIAS (${goalBias}/100)
    The athlete has set their training block bias to: ${biasLabel}
    - Bias value: ${goalBias}/100 (0 = pure hypertrophy, 50 = balanced, 100 = pure strength)
    - ${goalBias < 50 ? 'Lean toward higher rep ranges (8-12), moderate intensity (60-75% 1RM), shorter rest (60-120s), and more total volume.' : ''}
    - ${goalBias > 50 ? 'Lean toward lower rep ranges (3-5), higher intensity (80-92% 1RM), longer rest (3-5 min), and fewer but heavier sets.' : ''}
    - ${goalBias >= 40 && goalBias <= 60 ? 'Mix heavy compound work (5-6 reps) with moderate hypertrophy assistance (8-10 reps). A 50/50 session structure.' : ''}
    IMPORTANT: This bias should influence exercise selection, set/rep schemes, intensity, and rest periods for the ENTIRE session.
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
    ${exercisePrefsContext}
    ${goalBiasContext}

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

    ### EVIDENCE-BASED SESSION DESIGN (NSCA CSCS, ACSM, Schoenfeld et al.)
    Apply these peer-reviewed best practices as DEFAULTS. When the SESSION OPTIMIZER
    above provides specific targets (Frederick metabolic load, Hanley fatigue reps,
    Peak Force set caps), those OVERRIDE the generic ranges below. The NSCA guidelines
    govern everything the optimizer does NOT specify (exercise order, movement balance,
    warmup protocol, rest periods for accessories, etc.).

    EXERCISE ORDER (NSCA Essentials of Strength Training & Conditioning, 4th Ed.):
    1. Power/Olympic lifts first (if applicable) — highest neural demand, fatigue-sensitive.
    2. Multi-joint compound exercises before single-joint isolation (e.g., squat before leg extension).
    3. Large muscle groups before small (e.g., back rows before bicep curls).
    4. Alternating push/pull or upper/lower when supersetting to minimize interference.
    5. Core/stabilization work at the END — never pre-fatigue stabilizers before heavy compounds.

    EXERCISES PER SESSION (NSCA / ACSM Guidelines for Resistance Training):
    - Beginner: 4–6 exercises (compounds dominate, 1–2 accessories max)
    - Intermediate: 5–7 exercises
    - Advanced/Elite: 6–8 exercises (may include variations & targeted weak-point work)
    - Never exceed 8 working exercises regardless of level — diminishing returns & injury risk.

    VOLUME PER EXERCISE (Schoenfeld et al. 2017 dose-response; Israetel MRV/MEV):
    - Strength: 4–6 sets × 1–5 reps per exercise (Prilepin-validated for %1RM bands)
    - Hypertrophy: 3–4 sets × 8–12 reps per exercise (10–20 sets/muscle group/WEEK across sessions)
    - Power: 3–5 sets × 1–3 reps per exercise (≤ 30 total reps/session for explosive work)
    - Endurance: 2–3 sets × 15–25 reps per exercise
    - Total working sets per SESSION: 15–25 (NSCA), adjust by readiness & training age.

    INTENSITY (NSCA / Helms et al. 2018 RPE autoregulation):
    - Strength: 80–92% 1RM (RPE 8–9.5), rest 3–5 min
    - Hypertrophy: 60–75% 1RM (RPE 7–9), rest 60–120 sec
    - Power: 70–85% 1RM (RPE 7–8, MAX bar speed intent), rest 2–4 min
    - Endurance: 40–60% 1RM (RPE 6–8), rest 30–60 sec
    - When no 1RM data: prescribe by RPE only. RPE 8 ≈ 2 reps in reserve.

    REST PERIODS (NSCA Position Statement; de Salles et al. 2009):
    - Strength/Power: 3–5 minutes between sets of main compounds
    - Hypertrophy: 60–120 seconds (metabolic stress is productive)
    - Accessory/isolation: 60–90 seconds
    - Supersets: minimal rest between paired exercises, full rest after the pair

    MOVEMENT PATTERN BALANCE (Gray Cook / NSCA functional guidelines):
    - Every session should include at least one hip-dominant and one knee-dominant pattern.
    - Weekly balance: push ≈ pull volume (within ±20%).
    - Include at least one anti-movement core exercise per session (anti-extension, anti-rotation, or anti-lateral flexion).

    WARM-UP SETS (NSCA protocol):
    - Main compound lifts: 2–3 progressive warmup sets (empty bar → 50% → 70% of working weight).
    - Supplemental lifts: 1 warmup set at ~60% working weight.
    - Accessory/isolation: no dedicated warmup sets needed (already warm from compounds).

    ### SUPERSET FORMATTING
    - If using supersets, assign the same supersetGroup letter (e.g., "A") to paired exercises.
    - Supersets should pair non-competing muscle groups (NSCA agonist-antagonist or upper-lower).
    - Compound-compound supersets only for advanced athletes.

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
