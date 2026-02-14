import { GoogleGenAI, Type } from '@google/genai';
import type { FormData, SavedWorkout, StrengthWorkoutPlan, OptimizerRecommendations, ExercisePreferences, SessionStructure } from '../types';
import { SESSION_STRUCTURE_PRESETS } from '../types';
import { STRENGTH_ARCHETYPES } from '../services/strengthArchetypes';
import { getExerciseListForPrompt, getExerciseById } from '../services/exerciseLibrary';
import { computeExerciseSelectionContext, formatExerciseSelectionContextForPrompt } from '../services/exerciseSelectionEngine';
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

export interface SwapAndRebuildRequest {
  replaceExerciseId: string;
  withExerciseId: string;
  withExerciseName: string;
}

export const generateWorkoutServer = async (
  data: FormData,
  history: SavedWorkout[] = [],
  trainingContext?: TrainingContext | null,
  optimizerRecommendations?: OptimizerRecommendations | null,
  exercisePreferences?: ExercisePreferences | null,
  goalBias?: number | null,
  volumeTolerance?: number | null,
  swapAndRebuild?: SwapAndRebuildRequest | null
): Promise<StrengthWorkoutPlan> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Model routing: Pro for complex contexts, Flash for simple
  // Pin to stable model versions to avoid behavior drift from preview releases
  const isComplexContext =
    history.length >= 4 ||
    data.trainingExperience.includes('Advanced') ||
    data.trainingExperience.includes('Elite');
  const primaryModelId = isComplexContext ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const fallbackModelId = 'gemini-2.5-flash';

  const recentWorkouts = history.slice(0, 12);
  const recentArchetypeIds = recentWorkouts.map(w => w.archetypeId).filter((id): id is string => Boolean(id));
  const forbiddenArchetypeIds = Array.from(new Set(recentArchetypeIds.slice(0, 5)));

  const progression = computeProgressionDirective(data, history);
  const safetyExposure = computeRecentLoadExposure(history);
  const guardrails = computeGuardrails(data.trainingExperience);
  const disallowedArchetypes = computeDisallowedArchetypes(data);

  // Override guardrail maxExercises if session structure is set
  const structurePreset = data.sessionStructure
    ? SESSION_STRUCTURE_PRESETS.find(p => p.id === data.sessionStructure)
    : null;
  if (structurePreset) {
    guardrails.maxExercises = structurePreset.exerciseRange.max;
  }

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
    ### ⚡ SESSION OPTIMIZER — BINDING PRESCRIPTIONS (DO NOT OVERRIDE)
    The optimizer has computed these numbers from the athlete's training history,
    fatigue signals, and periodization context. These are NOT suggestions — they
    are the prescription. DO NOT average them with the NSCA defaults below.
    DO NOT fall back to generic 3×10 @ 70%. Use EXACTLY these parameters:
    - TOTAL WORKING SETS this session: ${optimizerRecommendations.sessionVolume}
    - SET × REP SCHEME per exercise: ${optimizerRecommendations.repScheme}
    - INTENSITY RANGE: ${optimizerRecommendations.intensityRange.min}–${optimizerRecommendations.intensityRange.max}% 1RM
    - EXERCISE COUNT: ${optimizerRecommendations.exerciseCount.min}–${optimizerRecommendations.exerciseCount.max} exercises
    - Optimizer rationale: ${optimizerRecommendations.rationale}
    ${optimizerRecommendations.muscleGroupPriorities ? `- Muscle group priorities: ${Object.entries(optimizerRecommendations.muscleGroupPriorities).map(([mg, p]) => `${mg}: ${p}`).join(', ')}` : ''}
    ${optimizerRecommendations.suggestedFocus ? `- Suggested session focus: ${optimizerRecommendations.suggestedFocus}` : ''}
    ${optimizerRecommendations.metabolicLoadTarget ? `
    ### METABOLIC STRESS PRESCRIPTION (Frederick Formula) — PER EXERCISE
    - Target metabolic load PER EXERCISE: ${optimizerRecommendations.metabolicLoadTarget.min}–${optimizerRecommendations.metabolicLoadTarget.max}
    - Current projected zone: ${optimizerRecommendations.metabolicLoadZone || 'unknown'}
    - Estimated load per working set: ${optimizerRecommendations.metabolicLoadPerSet || 'N/A'}
    ${optimizerRecommendations.metabolicSetsPerExercise ? `- REQUIRED sets per exercise: ${optimizerRecommendations.metabolicSetsPerExercise.min}–${optimizerRecommendations.metabolicSetsPerExercise.max} (this is the NUMBER OF SETS each exercise must have)` : ''}
    BINDING: EACH EXERCISE's total metabolic load must land within ${optimizerRecommendations.metabolicLoadTarget.min}–${optimizerRecommendations.metabolicLoadTarget.max}. PER EXERCISE, not session total.` : ''}
    ${optimizerRecommendations.fatigueScoreTarget ? `
    ### VOLUME STRESS PRESCRIPTION (Hanley Fatigue Metric) — PER EXERCISE
    - Prescribed total reps per exercise: ${optimizerRecommendations.targetRepsPerExercise || 'N/A'}
    BINDING: EACH EXERCISE should have approximately ${optimizerRecommendations.targetRepsPerExercise} total working reps. Structure sets × reps to hit this number.` : ''}
    ${optimizerRecommendations.strengthSetDivision ? `
    ### PEAK FORCE SET DIVISION (Strength/Power) — BINDING
    - Peak force drops after rep ${optimizerRecommendations.peakForceDropRep}
    - REQUIRED set structure: ${optimizerRecommendations.strengthSetDivision.sets} sets × ${optimizerRecommendations.strengthSetDivision.repsPerSet} reps
    - Cap ALL working sets at ${optimizerRecommendations.peakForceDropRep} reps maximum. No grinding past force drop-off.` : ''}

    COMPLIANCE CHECK: Before finalizing, verify that EVERY exercise in the output
    matches the optimizer's prescribed sets/reps/intensity. If the optimizer says
    "${optimizerRecommendations.repScheme}" at ${optimizerRecommendations.intensityRange.min}–${optimizerRecommendations.intensityRange.max}%, then the exercises
    must reflect that — not a generic 3×10 @ 70%.
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

  // ===== VOLUME TOLERANCE INTEGRATION =====
  let volumeToleranceContext = '';
  if (volumeTolerance !== undefined && volumeTolerance !== null) {
    const volLabel =
      volumeTolerance <= 1 ? 'Conservative (low recovery capacity — fewer sets per exercise, e.g. 2-3 sets)' :
      volumeTolerance <= 2 ? 'Below average (moderate-low recovery — stick to standard set counts)' :
      volumeTolerance <= 3 ? 'Moderate (standard recovery — use the optimizer\'s prescribed sets directly)' :
      volumeTolerance <= 4 ? 'Above average (good recovery — can handle more sets per exercise, e.g. 4-5 sets of compounds)' :
      'High capacity (experienced lifter with excellent recovery — can handle high volume, e.g. 5-6 sets per compound exercise)';
    volumeToleranceContext = `
    ### VOLUME TOLERANCE (${volumeTolerance}/5)
    The athlete has self-assessed their volume tolerance as: ${volLabel}
    The optimizer has ALREADY scaled its set prescriptions to match this tolerance level.
    DO NOT reduce the optimizer's prescribed sets — they already account for this athlete's capacity.
    ${volumeTolerance >= 4 ? 'This athlete can handle substantial volume. If the optimizer prescribes 4-5+ sets per exercise, TRUST THAT. Do not default to 3 sets.' : ''}
    ${volumeTolerance <= 2 ? 'This athlete needs conservative volume. Keep to the optimizer\'s reduced set counts.' : ''}
    `;
  }

  // ===== SESSION STRUCTURE INTEGRATION =====
  let sessionStructureContext = '';
  if (structurePreset && structurePreset.promptGuidance) {
    sessionStructureContext = `
    ### ${structurePreset.promptGuidance}
    BINDING: The session structure OVERRIDES the exercise count from both the optimizer and the NSCA defaults.
    `;
  }

  // ===== EXERCISE SELECTION ENGINE (rotation & frequency) =====
  const exerciseSelectionContext = formatExerciseSelectionContextForPrompt(
    computeExerciseSelectionContext({
      history: recentWorkouts,
      sessionStructure: data.sessionStructure,
      equipment: data.availableEquipment,
      optimizerRecommendations: optimizerRecommendations ?? undefined,
      exercisePreferences: exercisePreferences ?? undefined,
      trainingExperience: data.trainingExperience,
    })
  );

  // ===== PRE-WORKOUT CHECK-IN INTEGRATION =====
  let checkInContext = '';
  if (data.preWorkoutCheckIn) {
    const { mood, soreness, nutrition } = data.preWorkoutCheckIn;
    const parts: string[] = [];
    if (mood) parts.push(`Mood: ${mood}`);
    if (soreness) parts.push(`Soreness: ${soreness}`);
    if (nutrition) parts.push(`Nutrition: ${nutrition}`);
    if (parts.length > 0) {
      const adjustments: string[] = [];
      if (soreness === 'severe') adjustments.push('Avoid heavy loading on sore muscle groups. Reduce volume 30-40%. Consider movement quality focus.');
      else if (soreness === 'moderate') adjustments.push('Reduce intensity on sore areas by 5-10%. Prioritize non-sore movement patterns.');
      if (mood === 'poor') adjustments.push('Keep session simple and achievable. Avoid complex techniques. Focus on compounds only.');
      if (nutrition === 'poor') adjustments.push('Reduce session volume 15-20%. Glycogen may be depleted — avoid high-rep sets above RPE 8.');

      checkInContext = `
    ### PRE-WORKOUT CHECK-IN
    ${parts.join(' · ')}
    ${adjustments.length > 0 ? `ADJUSTMENTS: ${adjustments.join(' ')}` : 'Athlete is in good condition — proceed as prescribed.'}
    `;
    }
  }

  // ===== SWAP AND REBUILD (athlete chose a specific exercise replacement) =====
  let swapAndRebuildContext = '';
  if (swapAndRebuild?.withExerciseId && swapAndRebuild?.withExerciseName) {
    swapAndRebuildContext = `
    ### ATHLETE SWAP (BINDING)
    The athlete has chosen to replace one exercise with "${swapAndRebuild.withExerciseName}" (exerciseId: ${swapAndRebuild.withExerciseId}).
    You MUST include this exercise in the session with appropriate sets, reps, intensity, and rest.
    Build the rest of the session around it; keep the same session structure and total volume.
    Do not include the exercise that was replaced (id: ${swapAndRebuild.replaceExerciseId}).
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
    Design a highly specific, scientifically-backed workout session for:
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
    ${volumeToleranceContext}
    ${sessionStructureContext}
    ${exerciseSelectionContext}
    ${checkInContext}
    ${swapAndRebuildContext}

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

    ### EVIDENCE-BASED FALLBACK DEFAULTS (NSCA CSCS, ACSM, Schoenfeld et al.)
    USE THESE ONLY when the SESSION OPTIMIZER above does NOT specify a value.
    The optimizer's numbers for sets, reps, intensity, and exercise count are BINDING
    and ALWAYS override these generic ranges. These defaults govern ONLY what the
    optimizer does not address (exercise order, warmup protocol, movement balance, etc.).

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

  `;

  // System instruction: persona + immutable rules (cheaper — cached more aggressively by the API)
  const systemInstruction = `You are an elite strength and conditioning coach with deep expertise in barbell training, periodization, and exercise science (NSCA CSCS, ACSM certified). Your role is to design precise, evidence-based workout sessions.

CORE RULES (always apply):
- Select exercises ONLY from the provided EXERCISE LIBRARY using exact exerciseId values.
- Select exactly ONE archetype from the STRENGTH TRAINING ARCHETYPES list.
- The SESSION OPTIMIZER prescriptions are BINDING — never override them with generic defaults.
- Output valid JSON matching the provided schema. No commentary outside the JSON.
- All weights in lbs, rounded to the nearest 5.

FEW-SHOT EXAMPLES (study these for perfect compliance):

Example 1: Optimizer says "18 working sets, 5×5, 80-87% 1RM, 3-4 exercises"
→ CORRECT: 4 exercises (Squat 5×5 @ 82%, Bench 4×5 @ 85%, Row 4×5 @ 80%, RDL 3×5 @ 82%) = 16 working sets + warmups. Close to 18 sets, matches 5×5, intensity in range.
→ WRONG: 5 exercises at 3×10 @ 70% = ignores optimizer, uses generic defaults.

Example 2: OLAD session, optimizer says "12 working sets, 6×2, 88-92% 1RM, 1-4 exercises"
→ CORRECT: Back Squat 6×2 @ 90% (primary) + Leg Curls 3×12 + Face Pulls 3×15 = 12 working sets, primary gets all heavy volume, accessories stay light.
→ WRONG: Squat 4×5 @ 85% + Deadlift 4×3 @ 90% = two heavy compounds in OLAD (violates structure), wrong rep scheme.

Example 3: Optimizer says "22 working sets, 4×8-10, 65-75% 1RM, 5-7 exercises" (hypertrophy)
→ CORRECT: 6 exercises at 3-4 sets each of 8-10 reps @ 70% = 21-24 sets, intensity matches, hypertrophy rep range.
→ WRONG: 4 exercises at 5×5 @ 85% = strength scheme when optimizer prescribed hypertrophy volume.

KEY TAKEAWAY: The optimizer's sets/reps/intensity are NOT suggestions — they are the prescription. Do not average them with NSCA defaults. If optimizer says 5×5 @ 85%, every working set of the main lift must be 5 reps at ~85%.`;

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

  const attemptGeneration = async (modelId: string): Promise<StrengthWorkoutPlan> => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5,
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
    const plan = await attemptGeneration(primaryModelId);
    logComplianceCheck(plan, optimizerRecommendations, primaryModelId);
    return plan;
  } catch (primaryErr) {
    console.warn(
      `Primary model (${primaryModelId}) failed, retrying with fallback (${fallbackModelId}):`,
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );
    try {
      const plan = await attemptGeneration(fallbackModelId);
      logComplianceCheck(plan, optimizerRecommendations, fallbackModelId);
      return plan;
    } catch (fallbackErr) {
      console.error('Fallback model also failed:', fallbackErr);
      throw new Error('AI response format was invalid after retry. Please try again.');
    }
  }
};

// ===== COMPLIANCE LOGGING =====
function logComplianceCheck(
  plan: StrengthWorkoutPlan,
  optimizerRecs: OptimizerRecommendations | null,
  modelId: string
): void {
  if (!optimizerRecs) return;

  const workingSets = plan.exercises.filter(e => !e.isWarmupSet);
  const totalSets = workingSets.reduce((sum, e) => sum + e.sets, 0);
  const exerciseCount = new Set(workingSets.map(e => e.exerciseId)).size;

  // Check set count compliance
  const targetSets = optimizerRecs.sessionVolume;
  const setDiff = Math.abs(totalSets - targetSets);
  const setComplianceOk = setDiff <= 3; // within 3 sets is acceptable

  // Check exercise count compliance
  const targetExMin = optimizerRecs.exerciseCount.min;
  const targetExMax = optimizerRecs.exerciseCount.max;
  const exCountOk = exerciseCount >= targetExMin && exerciseCount <= targetExMax;

  // Check intensity compliance (% of 1RM)
  const intensities = workingSets.filter(e => e.percentOf1RM).map(e => e.percentOf1RM!);
  const avgIntensity = intensities.length > 0 ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0;
  const targetIntMin = optimizerRecs.intensityRange.min;
  const targetIntMax = optimizerRecs.intensityRange.max;
  const intensityOk = intensities.length === 0 || (avgIntensity >= targetIntMin - 5 && avgIntensity <= targetIntMax + 5);

  // Check rep scheme (rough — matches pattern like "5×5" or "4×8-10")
  const repSchemeTarget = optimizerRecs.repScheme; // e.g. "5×5", "4×8-10"
  const repSchemeMatch = repSchemeTarget.match(/(\d+)×(\d+(?:-\d+)?)/);
  let repSchemeOk = true;
  if (repSchemeMatch) {
    const [, targetSetsPerEx, targetReps] = repSchemeMatch;
    const mainExercises = workingSets.slice(0, Math.min(3, workingSets.length)); // check first 3 main exercises
    for (const ex of mainExercises) {
      const actualReps = ex.reps;
      const actualSets = ex.sets;
      // Rough check: if target is "5×5", actual should be close to 5 sets and "5" reps
      if (!actualReps.includes(targetReps.split('-')[0])) {
        repSchemeOk = false;
        break;
      }
      if (Math.abs(actualSets - Number(targetSetsPerEx)) > 1) {
        repSchemeOk = false;
        break;
      }
    }
  }

  const overallCompliance = setComplianceOk && exCountOk && intensityOk && repSchemeOk;

  console.log(`[COMPLIANCE CHECK] Model: ${modelId}`);
  console.log(`  Sets: ${totalSets}/${targetSets} (${setComplianceOk ? '✓' : '✗ DRIFT'})`);
  console.log(`  Exercises: ${exerciseCount} (target ${targetExMin}-${targetExMax}) (${exCountOk ? '✓' : '✗ DRIFT'})`);
  console.log(`  Intensity: ${avgIntensity.toFixed(0)}% (target ${targetIntMin}-${targetIntMax}%) (${intensityOk ? '✓' : '✗ DRIFT'})`);
  console.log(`  Rep scheme: ${repSchemeTarget} (${repSchemeOk ? '✓' : '✗ DRIFT'})`);
  console.log(`  Overall: ${overallCompliance ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}`);
  
  if (!overallCompliance) {
    console.warn(`[COMPLIANCE ISSUE] Workout "${plan.title}" (archetype: ${plan.archetypeId}) did not fully match optimizer prescriptions.`);
  }
}
