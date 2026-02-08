import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ===== SELF-CONTAINED VERCEL SERVERLESS FUNCTION =====
// This file is a standalone copy of the generation logic for Vercel deployment.
// It does NOT import from ../server/generateWorkout.ts because Vercel serverless
// functions cannot share modules with the main app bundle.

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
    const { data, history = [], trainingContext, optimizerRecommendations } = req.body;
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

    let historyContext = '';
    if (recentWorkouts.length > 0) {
      const formatted = recentWorkouts.map((w: any, i: number) => {
        const signals = computeSessionIntensitySignals(w);
        const feedback = w.feedback?.rating ? ` (Feedback: ${w.feedback.rating})` : '';
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
        ? ` METABOLIC STRESS TARGET: ${optimizerRecommendations.metabolicLoadTarget.min}-${optimizerRecommendations.metabolicLoadTarget.max} (zone: ${optimizerRecommendations.metabolicLoadZone}, per-set: ${optimizerRecommendations.metabolicLoadPerSet}). For hypertrophy, total session metabolic load MUST land in 500-800 range.`
        : '';
      optimizerContext = `OPTIMIZER: ${optimizerRecommendations.sessionVolume} working sets, ${optimizerRecommendations.repScheme}, ${optimizerRecommendations.intensityRange.min}-${optimizerRecommendations.intensityRange.max}% 1RM, rest ${optimizerRecommendations.restRange.min}-${optimizerRecommendations.restRange.max}s, ${optimizerRecommendations.exerciseCount.min}-${optimizerRecommendations.exerciseCount.max} exercises. Rationale: ${optimizerRecommendations.rationale}${metLoad}`;
    }

    const liftPRs = [
      data.squat1RM ? `Squat: ${data.squat1RM}` : null,
      data.benchPress1RM ? `Bench: ${data.benchPress1RM}` : null,
      data.deadlift1RM ? `Deadlift: ${data.deadlift1RM}` : null,
      data.overheadPress1RM ? `OHP: ${data.overheadPress1RM}` : null,
    ].filter(Boolean).join(', ');

    const prompt = `You are an expert strength coach. Design a session for: ${data.trainingExperience}, ${data.readiness} readiness, ${data.duration}min, Focus: ${data.trainingGoalFocus}, Equipment: ${data.availableEquipment.join(', ')}, Athlete: ${data.age}yo ${data.gender} ${data.weightLbs}lbs. ${liftPRs ? `1RMs: ${liftPRs}` : 'No 1RM data — use RPE-based loading.'}
${historyContext}
${blockContext}
${optimizerContext}
GUARDRAILS: Max ${guardrails.maxSetsPerSession} working sets, ${guardrails.maxExercises} exercises, ${guardrails.maxPercentOf1RM}% max 1RM. Weekly load: ${safetyExposure.last7Count} sessions, ${safetyExposure.hardSessions} hard. Disallowed archetypes: ${disallowedArchetypes.join(', ') || 'None'}. ${guardrails.forceCompounds ? 'BEGINNER: compounds only + 1-2 accessories.' : ''}
Rules: Start with main compound, follow with supplementals, finish with accessories. Mark warmup sets. Use supersetGroup letters for paired exercises. All weights in lbs, rounded to 5.`;

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
    try {
      result = await attemptGeneration(primaryModelId, isComplexContext);
    } catch {
      result = await attemptGeneration(fallbackModelId, false);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Generate workout error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
