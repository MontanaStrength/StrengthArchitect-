import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ===== SELF-CONTAINED VERCEL SERVERLESS FUNCTION =====
// This file is a standalone copy of the generation logic for Vercel deployment.
// It does NOT import from ../server/generateWorkout.ts because Vercel serverless
// functions cannot share modules with the main app bundle.
// Exercise selection engine is loaded dynamically to avoid crashing the function
// if the import chain (exerciseLibrary, types) fails in the serverless environment.

async function getExerciseSelectionContext(data: any, recentWorkouts: any[], optimizerRecommendations: any, exercisePreferences: any): Promise<string> {
  try {
    const { computeExerciseSelectionContext, formatExerciseSelectionContextForPrompt } = await import('../shared/services/exerciseSelectionEngine');
    return formatExerciseSelectionContextForPrompt(
      computeExerciseSelectionContext({
        history: recentWorkouts,
        sessionStructure: data.sessionStructure,
        equipment: data.availableEquipment || [],
        optimizerRecommendations: optimizerRecommendations ?? undefined,
        exercisePreferences: exercisePreferences ?? undefined,
        trainingExperience: data.trainingExperience,
      })
    );
  } catch (err) {
    console.warn('Exercise selection engine failed (non-fatal):', err);
    return '';
  }
}

const parseRepsToAverage = (reps: string): number => {
  if (!reps) return 0;
  if (reps.toUpperCase() === 'AMRAP') return 10;
  if (reps.includes('-')) {
    const [lo, hi] = reps.split('-').map(Number);
    return (lo + hi) / 2;
  }
  if (reps.includes('/')) {
    const parts = reps.split('/').map(Number);
    return parts.reduce((a, b) => a + b, 0) / parts.length;
  }
  return Number(reps) || 0;
};

// Training intelligence helpers

const computeSessionIntensitySignals = (workout: any) => {
  const exercises = workout.exercises || [];
  const avgPercent = exercises.reduce((sum: number, e: any) => sum + (e.percentOf1RM || 0), 0) / (exercises.length || 1);
  const avgRPE = exercises.reduce((sum: number, e: any) => sum + (e.rpeTarget || 0), 0) / (exercises.length || 1);
  const totalSets = exercises.reduce((sum: number, e: any) => sum + (e.sets || 0), 0);
  const estimatedTonnage = exercises.reduce((sum: number, e: any) => {
    const reps = parseRepsToAverage(e.reps);
    return sum + (e.sets * reps * (e.weightLbs || 0));
  }, 0);
  return { avgPercent, avgRPE, totalSets, estimatedTonnage };
};

const computeRecentLoadExposure = (history: any[]) => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7 = history.filter((w: any) => w.timestamp >= sevenDaysAgo);
  let totalTonnage = 0, totalSets = 0, hardSessions = 0;
  for (const w of last7) {
    const signals = computeSessionIntensitySignals(w);
    totalTonnage += w.actualTonnage || signals.estimatedTonnage;
    totalSets += signals.totalSets;
    if (signals.avgPercent >= 85 || signals.avgRPE >= 8.5 || (w.sessionRPE || 0) >= 8) hardSessions++;
  }
  return { last7Count: last7.length, totalTonnage, totalSets, hardSessions };
};

const getExperienceBucket = (exp: string) => {
  const e = String(exp).toLowerCase();
  if (e.includes('elite')) return 'elite';
  if (e.includes('advanced')) return 'advanced';
  if (e.includes('intermediate')) return 'intermediate';
  return 'beginner';
};

const computeGuardrails = (experience: string) => {
  const bucket = getExperienceBucket(experience);
  if (bucket === 'beginner') return { maxSetsPerSession: 18, maxExercises: 5, maxPercentOf1RM: 85, maxHardSessionsPer7d: 2, forceCompounds: true };
  if (bucket === 'intermediate') return { maxSetsPerSession: 24, maxExercises: 7, maxPercentOf1RM: 92, maxHardSessionsPer7d: 3, forceCompounds: false };
  if (bucket === 'advanced') return { maxSetsPerSession: 30, maxExercises: 8, maxPercentOf1RM: 97, maxHardSessionsPer7d: 3, forceCompounds: false };
  return { maxSetsPerSession: 35, maxExercises: 10, maxPercentOf1RM: 100, maxHardSessionsPer7d: 4, forceCompounds: false };
};

// Session structure presets (standalone copy for Vercel)
const SESSION_STRUCTURE_PROMPT: Record<string, { maxExercises: number; guidance: string }> = {
  'one-lift': {
    maxExercises: 4,
    guidance: `SESSION STRUCTURE: "One Lift a Day" (OLAD) — This athlete trains with HIGH FREQUENCY (5-7 days/week). Each session is built around ONE primary barbell lift with optional low-fatigue accessory work.
    PHILOSOPHY: OLAD means one HARD lift is the centerpiece — not that you literally do only one exercise. Think of it like 5/3/1 or Dan John's "one main lift" approach: the barbell movement gets all the focused intensity, and a handful of easy accessories round out the session without adding meaningful systemic fatigue.
    PRIMARY LIFT SELECTION:
    - The primary lift MUST be one of: Back Squat, Bench Press, Deadlift (conventional or sumo), or Overhead Press.
    - Rotate the primary lift across sessions so each gets hit 1-2x/week at high frequency.
    - The primary lift receives ALL heavy working sets (use the optimizer's prescribed set count). Include 2-3 progressive warmup sets (isWarmupSet: true) before working sets.
    ACCESSORY RULES:
    - After the primary lift, add 2-3 LOW-FATIGUE accessories (2-3 sets each, RPE 6-7 max, NO grinding).
    - Accessories must be isolation or machine movements that do NOT generate significant systemic fatigue. Good examples:
      • Upper-body days: curls, tricep pushdowns, face pulls, band pull-aparts, lateral raises, pushups
      • Lower-body days: leg curls, back raises, ab wheel, hanging leg raises, calf raises, hip adductor/abductor
    - Accessories should target weak points, prehab, or "beach muscles" — they are NOT secondary compounds.
    - NEVER pair two heavy compounds together (e.g., no Squat + Deadlift, no Bench + OHP in the same OLAD session).
    - Curls, face pulls, and ab work are always acceptable regardless of primary lift because their systemic fatigue cost is negligible.
    EXERCISE COUNT: Output 1 primary barbell lift + 2-3 accessories = 3-4 total exercises in the array.
    EXAMPLE SESSIONS:
    • Squat OLAD: Back Squat 5x3 @85% → Leg Curls 3x12 → Ab Wheel 3x10 → Face Pulls 3x15
    • Bench OLAD: Bench Press 6x4 @80% → Curls 3x12 → Tricep Pushdowns 3x15 → Band Pull-Aparts 3x20
    • Deadlift OLAD: Deadlift 5x2 @88% → Back Raises 3x12 → Hanging Leg Raises 3x10 → Curls 3x12
    STIMULUS VARIATION: Vary the PRIMARY LIFT stimulus across sessions (heavy day vs volume day), NOT within a single session. Accessories stay light and consistent.`,
  },
  'main-plus-accessory': {
    maxExercises: 2,
    guidance: `SESSION STRUCTURE: "Main + Accessory" — This athlete prefers focused 2-exercise sessions with TWO demanding movements.
    KEY DISTINCTION FROM OLAD: Unlike OLAD (which pairs one hard lift with light isolation accessories), this format allows BOTH exercises to be systemically fatiguing. The secondary movement is a COMPOUND or challenging accessory, not just isolation work.
    RULES:
    - Prescribe EXACTLY 2 working exercises: 1 main compound lift + 1 secondary compound or demanding accessory.
    - The main lift gets the majority of volume (4-6+ working sets at higher intensity).
    - The secondary exercise should be COMPLEMENTARY and can be a demanding compound movement (3-5 sets).
    - Include warmup sets for the main compound lift.
    PAIRING EXAMPLES (Main → Secondary):
    • Back Squat → Snatch Grip Deadlift, Romanian Deadlift, Front Squat, Bulgarian Split Squat
    • Bench Press → Barbell Row, Weighted Dips, Incline Bench, Close-Grip Bench
    • Deadlift → Front Squat, Good Mornings, Deficit Deadlift, Pause Squat
    • Overhead Press → Weighted Chin-ups, Push Press, Barbell Row, Dips
    GUIDELINES:
    - Avoid pairing Squat + Conventional Deadlift or Bench + OHP at max intensity (too much overlap in the same session).
    - Secondary movement should address a complementary pattern (push/pull balance, hinge/squat pairing, etc.).
    - Both lifts can be heavy and challenging — this is NOT a "light accessory" format like OLAD.`,
  },
  'standard': { maxExercises: 0, guidance: '' }, // 0 = use default guardrails
  'high-variety': {
    maxExercises: 10,
    guidance: `SESSION STRUCTURE: "High Variety" — This athlete prefers sessions with more exercises and distributed volume.
    RULES:
    - Prescribe 6-10 exercises to cover multiple movement patterns and muscle groups.
    - Distribute volume across exercises (2-4 sets each) rather than concentrating on fewer lifts.
    - Include a mix of compounds and isolation work.
    - Supersets are encouraged to manage session duration.
    - Ensure broad coverage of movement patterns (push, pull, hinge, squat, core).`,
  },
};

const computeDisallowedArchetypes = (data: any) => {
  const readiness = String(data.readiness).toLowerCase();
  const bucket = getExperienceBucket(data.trainingExperience);
  const disallowed = new Set<string>();
  if (bucket === 'beginner') ['5','7','8','18','20','26','27','28','39','40','41'].forEach(id => disallowed.add(id));
  if (readiness.includes('low')) ['4','5','8','13','14','18','20','26','28','39','40'].forEach(id => disallowed.add(id));
  if (bucket === 'intermediate') ['8','39','40'].forEach(id => disallowed.add(id));
  return Array.from(disallowed);
};

const computeProgressionDirective = (data: any, history: any[]) => {
  const recent = history.slice(0, 6);
  const recentHardCount = recent.reduce((acc: number, w: any) => {
    const signals = computeSessionIntensitySignals(w);
    return acc + (signals.avgPercent >= 85 || signals.avgRPE >= 8.5 || (w.sessionRPE || 0) >= 8 ? 1 : 0);
  }, 0);
  const last = history[0];
  const lastFeedback = last?.feedback?.rating;
  let directive = 'Maintain current loading. Make small technical progressions only.';
  let bias = 'maintain';
  if (String(data.readiness).toLowerCase().includes('low')) { bias = 'deload'; directive = 'DELOAD: reduce volume by 40-50% and intensity by 10-15%. Focus on movement quality. No sets above RPE 6.'; }
  else if (recentHardCount >= 3) { bias = 'maintain'; directive = 'CONSOLIDATE: Multiple hard sessions recently. Do NOT increase load.'; }
  else if (lastFeedback === 'down') { bias = 'regress'; directive = 'REGRESS SLIGHTLY: Reduce ONE variable.'; }
  else if (lastFeedback === 'up') { bias = 'progress'; directive = 'PROGRESS: Change exactly ONE lever — add 5 lbs, or add 1 set, or add 1-2 reps.'; }
  return { recentHardCount, bias, directive };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data, history = [], trainingContext, optimizerRecommendations, exercisePreferences, goalBias, volumeTolerance, swapAndRebuild } = req.body;
    if (!data) return res.status(400).json({ error: 'Missing form data' });

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable.' });

    const ai = new GoogleGenAI({ apiKey });
    const isComplexContext = history.length >= 4 || String(data.trainingExperience).includes('Advanced') || String(data.trainingExperience).includes('Elite');
    const primaryModelId = isComplexContext ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    const fallbackModelId = 'gemini-2.5-flash';

    const recentWorkouts = history.slice(0, 12);
    const recentArchetypeIds = recentWorkouts.map((w: any) => w.archetypeId).filter(Boolean);
    const forbiddenArchetypeIds = Array.from(new Set(recentArchetypeIds.slice(0, 5)));
    const progression = computeProgressionDirective(data, history);
    const safetyExposure = computeRecentLoadExposure(history);
    const guardrails = computeGuardrails(data.trainingExperience);
    const disallowedArchetypes = computeDisallowedArchetypes(data);

    // Session structure override
    const ssPreset = data.sessionStructure ? SESSION_STRUCTURE_PROMPT[data.sessionStructure] : null;
    if (ssPreset && ssPreset.maxExercises > 0) {
      guardrails.maxExercises = ssPreset.maxExercises;
    }

    let historyContext = '';
    if (recentWorkouts.length > 0) {
      const formatted = recentWorkouts.map((w: any, i: number) => {
        const signals = computeSessionIntensitySignals(w);
        const feedbackParts: string[] = [];
        if (w.feedback?.rating) feedbackParts.push(w.feedback.rating);
        if (w.feedback?.comment) feedbackParts.push(`"${w.feedback.comment}"`);
        const feedback = feedbackParts.length > 0 ? ` (Athlete feedback: ${feedbackParts.join(' — ')})` : '';
        const tonnage = w.actualTonnage || signals.estimatedTonnage;
        const tag = signals.avgPercent >= 85 || signals.avgRPE >= 8.5 ? 'Hard' : 'Moderate/Easy';
        return `${i + 1}. [${new Date(w.timestamp).toLocaleDateString()}] "${w.title}" (${tag}) — ${signals.totalSets} sets, ~${Math.round(tonnage)} lbs${w.sessionRPE ? `, RPE: ${w.sessionRPE}` : ''}${feedback}`;
      }).join('\n');
      historyContext = `TRAINING LOG:\n${formatted}\n\nPROGRESSION: ${progression.bias.toUpperCase()} — ${progression.directive}\nDo not repeat archetypes: ${forbiddenArchetypeIds.join(', ') || 'N/A'}`;
    }

    let blockContext = '';
    if (trainingContext) {
      blockContext = `ACTIVE BLOCK: "${trainingContext.blockName}" — ${trainingContext.phaseName} (Week ${trainingContext.weekInPhase}/${trainingContext.totalWeeksInPhase}), Intensity: ${trainingContext.intensityFocus}, Volume: ${trainingContext.volumeFocus}`;
    }

    let optimizerContext = '';
    if (optimizerRecommendations) {
      const metLoad = optimizerRecommendations.metabolicLoadTarget
        ? ` METABOLIC STRESS PER EXERCISE (BINDING): ${optimizerRecommendations.metabolicLoadTarget.min}-${optimizerRecommendations.metabolicLoadTarget.max} (zone: ${optimizerRecommendations.metabolicLoadZone}, per-set: ${optimizerRecommendations.metabolicLoadPerSet}${optimizerRecommendations.metabolicSetsPerExercise ? `, REQUIRED ${optimizerRecommendations.metabolicSetsPerExercise.min}-${optimizerRecommendations.metabolicSetsPerExercise.max} sets/exercise` : ''}). EACH EXERCISE's metabolic load must land in this range (not session total).`
        : '';
      const fatigueLoad = optimizerRecommendations.fatigueScoreTarget
        ? ` VOLUME STRESS (Hanley, BINDING) PER EXERCISE: ~${optimizerRecommendations.targetRepsPerExercise} total reps PER EXERCISE at recommended intensity. Structure sets×reps to hit this number.`
        : '';
      const peakForceRx = optimizerRecommendations.strengthSetDivision
        ? ` PEAK FORCE (BINDING): force drops after rep ${optimizerRecommendations.peakForceDropRep}. REQUIRED: ${optimizerRecommendations.strengthSetDivision.sets}×${optimizerRecommendations.strengthSetDivision.repsPerSet}. Cap ALL sets at ${optimizerRecommendations.peakForceDropRep} reps max.`
        : '';
      const clusterTaperRx = optimizerRecommendations.clusterTaperScheme
        ? ` CLUSTER-TAPER HYBRID (BINDING): FORCE BLOCK ${optimizerRecommendations.clusterTaperScheme.forceBlock.sets}×${optimizerRecommendations.clusterTaperScheme.forceBlock.reps} @ RPE ${optimizerRecommendations.clusterTaperScheme.forceBlock.rpe} at ${optimizerRecommendations.clusterTaperScheme.intensityPct}% 1RM (peak-force capped, ${Math.round(optimizerRecommendations.clusterTaperScheme.forceRestSeconds / 60)}-${Math.round(optimizerRecommendations.clusterTaperScheme.forceRestSeconds / 60) + 1} min rest), then METABOLIC BLOCK ${optimizerRecommendations.clusterTaperScheme.metabolicBlock.sets}×${optimizerRecommendations.clusterTaperScheme.metabolicBlock.reps} @ RPE ${optimizerRecommendations.clusterTaperScheme.metabolicBlock.rpe} at SAME weight (${Math.round(optimizerRecommendations.clusterTaperScheme.metabolicRestSeconds / 60)}-${Math.round(optimizerRecommendations.clusterTaperScheme.metabolicRestSeconds / 60) + 1} min rest). Total ~${optimizerRecommendations.clusterTaperScheme.totalReps} reps. Output force and metabolic blocks as SEPARATE exercise entries (separate cards). MUST include weightLbs AND percentOf1RM. Both blocks use SAME weight. Round to 5 lbs.`
        : '';
      const taperedRx = optimizerRecommendations.taperedRepScheme
        ? ` TAPERED SETS (Epley-consistent, BINDING): LEAD ${optimizerRecommendations.taperedRepScheme.leadSets}×${optimizerRecommendations.taperedRepScheme.leadReps} @ RPE ${optimizerRecommendations.taperedRepScheme.leadRPE} at ${optimizerRecommendations.taperedRepScheme.leadIntensityPct || optimizerRecommendations.intensityRange.max}% 1RM, then TAPER ${optimizerRecommendations.taperedRepScheme.taperSets}×${optimizerRecommendations.taperedRepScheme.taperReps} @ RPE ${optimizerRecommendations.taperedRepScheme.taperRPE} at SAME weight. Fewer reps = lower RPE naturally. Total ~${optimizerRecommendations.taperedRepScheme.totalReps} reps. Output lead and taper as SEPARATE exercise entries (separate cards), not combined. MUST include weightLbs AND percentOf1RM. Lead and taper use SAME weight. Round to 5 lbs.`
        : '';
      optimizerContext = `⚡ OPTIMIZER (BINDING — DO NOT OVERRIDE WITH GENERIC DEFAULTS): ${optimizerRecommendations.sessionVolume} working sets, ${optimizerRecommendations.repScheme}, ${optimizerRecommendations.intensityRange.min}-${optimizerRecommendations.intensityRange.max}% 1RM, ${optimizerRecommendations.exerciseCount.min}-${optimizerRecommendations.exerciseCount.max} exercises. Rationale: ${optimizerRecommendations.rationale}${metLoad}${fatigueLoad}${clusterTaperRx}${taperedRx}${peakForceRx} COMPLIANCE: Every exercise must match the optimizer's sets/reps/intensity. Do NOT default to 3×10 @ 70%.`;
    }

    let volumeToleranceContext = '';
    if (volumeTolerance !== undefined && volumeTolerance !== null) {
      const volLabel = volumeTolerance <= 1 ? 'Conservative' : volumeTolerance <= 2 ? 'Below average' : volumeTolerance <= 3 ? 'Moderate' : volumeTolerance <= 4 ? 'Above average' : 'High capacity';
      volumeToleranceContext = `VOLUME TOLERANCE: ${volLabel} (${volumeTolerance}/5). Optimizer has already scaled sets to match. ${volumeTolerance >= 4 ? 'This athlete handles high volume — trust the prescribed set counts.' : ''}`;
    }

    const liftPRs = [
      data.squat1RM ? `Squat: ${data.squat1RM}` : null,
      data.benchPress1RM ? `Bench: ${data.benchPress1RM}` : null,
      data.deadlift1RM ? `Deadlift: ${data.deadlift1RM}` : null,
      data.overheadPress1RM ? `OHP: ${data.overheadPress1RM}` : null,
    ].filter(Boolean).join(', ');

    let goalBiasContext = '';
    if (goalBias !== undefined && goalBias !== null) {
      const biasLabel = goalBias < 20 ? 'Pure Hypertrophy' : goalBias < 40 ? 'Hypertrophy-biased' : goalBias < 60 ? 'Balanced' : goalBias < 80 ? 'Strength-biased' : 'Pure Strength';
      goalBiasContext = `BLOCK BIAS: ${biasLabel} (${goalBias}/100). ${goalBias < 50 ? 'Lean toward 8-12 reps, 60-75% 1RM, 60-120s rest, more volume.' : goalBias > 50 ? 'Lean toward 3-5 reps, 80-92% 1RM, 3-5 min rest, fewer heavier sets.' : 'Mix heavy compounds (5-6 reps) with hypertrophy assistance (8-10 reps).'}`;
    }

    let sessionStructureContext = '';
    if (ssPreset && ssPreset.guidance) {
      sessionStructureContext = `\n### ${ssPreset.guidance}\nBINDING: The session structure OVERRIDES the exercise count from both the optimizer and the NSCA defaults.`;
    }

    const exerciseSelectionContext = await getExerciseSelectionContext(data, recentWorkouts, optimizerRecommendations, exercisePreferences);

    let checkInContext = '';
    if (data.preWorkoutCheckIn) {
      const { mood, soreness, nutrition } = data.preWorkoutCheckIn;
      const parts: string[] = [];
      if (mood) parts.push(`Mood: ${mood}`);
      if (soreness) parts.push(`Soreness: ${soreness}`);
      if (nutrition) parts.push(`Nutrition: ${nutrition}`);
      if (parts.length > 0) {
        const adj: string[] = [];
        if (soreness === 'severe') adj.push('Avoid heavy loading on sore muscles. Reduce volume 30-40%.');
        else if (soreness === 'moderate') adj.push('Reduce intensity on sore areas by 5-10%.');
        if (mood === 'poor') adj.push('Keep session simple. Compounds only.');
        if (nutrition === 'poor') adj.push('Reduce volume 15-20%. Avoid high-rep sets above RPE 8.');
        checkInContext = `\nCHECK-IN: ${parts.join(' · ')}. ${adj.length > 0 ? adj.join(' ') : 'Good condition — proceed as prescribed.'}`;
      }
    }

    let swapAndRebuildContext = '';
    if (swapAndRebuild?.withExerciseId && swapAndRebuild?.withExerciseName) {
      swapAndRebuildContext = `
ATHLETE SWAP (BINDING): The athlete has chosen to replace one exercise with "${swapAndRebuild.withExerciseName}" (exerciseId: ${swapAndRebuild.withExerciseId}). You MUST include this exercise in the session with appropriate sets, reps, intensity, and rest. Build the rest of the session around it; keep the same session structure and total volume. Do not include the exercise that was replaced (id: ${swapAndRebuild.replaceExerciseId}).`;
    }

    const prompt = `You are an expert strength coach. Design a session for: ${data.trainingExperience}, ${data.readiness} readiness, ${data.duration}min, Focus: ${data.trainingGoalFocus}, Equipment: ${data.availableEquipment.join(', ')}, Athlete: ${data.age}yo ${data.gender} ${data.weightLbs}lbs. ${liftPRs ? `1RMs: ${liftPRs}. ALWAYS include BOTH weightLbs AND percentOf1RM for every exercise.` : 'No 1RM data — use RPE-based loading.'}
${historyContext}
${blockContext}
${optimizerContext}
${goalBiasContext}
${volumeToleranceContext}
${sessionStructureContext}
${exerciseSelectionContext}
${checkInContext}
${swapAndRebuildContext}
GUARDRAILS: Max ${guardrails.maxSetsPerSession} working sets, ${guardrails.maxExercises} exercises, ${guardrails.maxPercentOf1RM}% max 1RM. Weekly load: ${safetyExposure.last7Count} sessions, ${safetyExposure.hardSessions} hard. Disallowed archetypes: ${disallowedArchetypes.join(', ') || 'None'}. ${guardrails.forceCompounds ? 'BEGINNER: compounds only + 1-2 accessories.' : ''}
FALLBACK DEFAULTS (NSCA/ACSM) — use ONLY where the OPTIMIZER does not specify. Optimizer's sets/reps/intensity are BINDING and always override these:
- Exercise order: power → multi-joint compounds → single-joint isolation → core last.
- Exercises per session: Beginner 4-6, Intermediate 5-7, Advanced 6-8. Never exceed 8.
- Volume per exercise: Strength 4-6×1-5, Hypertrophy 3-4×8-12, Power 3-5×1-3. 15-25 total working sets/session.
- Intensity: Strength 80-92% (RPE 8-9.5, 3-5min rest), Hypertrophy 60-75% (RPE 7-9, 60-120s rest), Power 70-85% (max speed, 2-4min rest).
- Warmups: 2-3 progressive sets for main compound (bar→50%→70%), 1 set for supplementals, none for accessories.
- Movement balance: hip-dominant + knee-dominant each session. Push ≈ pull weekly. Include anti-movement core.
- Supersets: non-competing muscle groups only, use supersetGroup letters. All weights in lbs, rounded to 5.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        archetypeId: { type: Type.STRING }, title: { type: Type.STRING }, focus: { type: Type.STRING },
        totalDurationMin: { type: Type.INTEGER }, difficulty: { type: Type.STRING }, summary: { type: Type.STRING },
        whyThisWorkout: { type: Type.STRING },
        physiologicalBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
        coachingTips: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ['title', 'explanation'] as const } },
        estimatedTonnage: { type: Type.INTEGER },
        movementPatternsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
        muscleGroupsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
        exercises: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
          exerciseId: { type: Type.STRING }, exerciseName: { type: Type.STRING }, sets: { type: Type.INTEGER },
          reps: { type: Type.STRING }, weightLbs: { type: Type.INTEGER }, percentOf1RM: { type: Type.INTEGER },
          rpeTarget: { type: Type.NUMBER }, rirTarget: { type: Type.INTEGER }, restSeconds: { type: Type.INTEGER },
          tempo: { type: Type.STRING }, supersetGroup: { type: Type.STRING }, notes: { type: Type.STRING },
          coachingCue: { type: Type.STRING }, isWarmupSet: { type: Type.BOOLEAN },
        }, required: ['exerciseId', 'exerciseName', 'sets', 'reps', 'restSeconds'] as const } }
      },
      required: ['archetypeId', 'title', 'exercises', 'totalDurationMin', 'focus', 'summary', 'whyThisWorkout'] as const
    };

    const attemptGeneration = async (modelId: string, useSearch: boolean) => {
      const response = await ai.models.generateContent({
        model: modelId, contents: prompt,
        config: { ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}), responseMimeType: 'application/json', responseSchema }
      });
      const text = response.text;
      if (!text) throw new Error('Empty response');
      let json = text.trim();
      if (json.startsWith('```')) json = json.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
      return JSON.parse(json);
    };

    let result;
    let primaryError: string | undefined;
    try {
      result = await attemptGeneration(primaryModelId, isComplexContext);
    } catch (err: any) {
      primaryError = err?.message || String(err);
      console.warn(`Primary model (${primaryModelId}) failed: ${primaryError}`);
      try {
        result = await attemptGeneration(fallbackModelId, false);
      } catch (fallbackErr: any) {
        const fallbackMsg = fallbackErr?.message || String(fallbackErr);
        console.error(`Fallback model (${fallbackModelId}) also failed: ${fallbackMsg}`);
        return res.status(500).json({
          error: `AI generation failed. Primary (${primaryModelId}): ${primaryError}. Fallback (${fallbackModelId}): ${fallbackMsg}`,
        });
      }
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Generate workout error:', error);
    const msg = error?.message || 'Server error';
    return res.status(500).json({ error: msg });
  }
}

// ===== COMPLIANCE LOGGING =====
function logComplianceCheck(plan: any, optimizerRecs: any, modelId: string): void {
  if (!optimizerRecs) return;

  const workingSets = plan.exercises?.filter((e: any) => !e.isWarmupSet) || [];
  const totalSets = workingSets.reduce((sum: number, e: any) => sum + (e.sets || 0), 0);
  const exerciseCount = new Set(workingSets.map((e: any) => e.exerciseId)).size;

  const targetSets = optimizerRecs.sessionVolume;
  const setDiff = Math.abs(totalSets - targetSets);
  const setComplianceOk = setDiff <= 3;

  const targetExMin = optimizerRecs.exerciseCount?.min || 0;
  const targetExMax = optimizerRecs.exerciseCount?.max || 99;
  const exCountOk = exerciseCount >= targetExMin && exerciseCount <= targetExMax;

  const intensities = workingSets.filter((e: any) => e.percentOf1RM).map((e: any) => e.percentOf1RM);
  const avgIntensity = intensities.length > 0 ? intensities.reduce((a: number, b: number) => a + b, 0) / intensities.length : 0;
  const targetIntMin = optimizerRecs.intensityRange?.min || 0;
  const targetIntMax = optimizerRecs.intensityRange?.max || 100;
  const intensityOk = intensities.length === 0 || (avgIntensity >= targetIntMin - 5 && avgIntensity <= targetIntMax + 5);

  const repSchemeTarget = optimizerRecs.repScheme || '';
  const repSchemeMatch = repSchemeTarget.match(/(\d+)×(\d+(?:-\d+)?)/);
  let repSchemeOk = true;
  if (repSchemeMatch) {
    const [, targetSetsPerEx, targetReps] = repSchemeMatch;
    const mainExercises = workingSets.slice(0, Math.min(3, workingSets.length));
    for (const ex of mainExercises) {
      const actualReps = ex.reps || '';
      const actualSets = ex.sets || 0;
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
