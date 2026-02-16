/**
 * Exercise Selection Engine — improves exercise selection, rotation, and frequency
 * by analyzing training history and session structure to produce explicit guidance
 * for the AI (or future direct selection).
 *
 * Output is injected into the generate-workout prompt so the model gets:
 * - Preferred primary lift for OLAD / main-plus-accessory
 * - Movement pattern balance and rotation (avoid repeating same exercise too soon)
 * - Frequency awareness (e.g. "squat trained 2 days ago — use variation or lighter load")
 */

import type { SavedWorkout, SessionStructure, OptimizerRecommendations, ExercisePreferences, AvailableEquipment, Exercise } from '../types';
import { MovementPattern, MuscleGroup } from '../types';
import { getExerciseById, filterByEquipment, filterByMovementPattern, getComplementaryPatterns } from './exerciseLibrary';

// ─── OLAD / Main primary lift rotation ───────────────────────────────────────

const OLAD_PRIMARY_ORDER: { exerciseId: string; movementPattern: MovementPattern }[] = [
  { exerciseId: 'back_squat', movementPattern: MovementPattern.SQUAT },
  { exerciseId: 'bench_press', movementPattern: MovementPattern.HORIZONTAL_PUSH },
  { exerciseId: 'conventional_deadlift', movementPattern: MovementPattern.HINGE },
  { exerciseId: 'overhead_press', movementPattern: MovementPattern.VERTICAL_PUSH },
];

/** Resolve first "main" compound from a workout (first exercise, or first by movement pattern). */
function getPrimaryLiftFromWorkout(w: SavedWorkout): { exerciseId: string; movementPattern: MovementPattern } | null {
  if (!w.exercises?.length) return null;
  const first = w.exercises[0];
  const def = getExerciseById(first.exerciseId);
  if (def?.isCompound) return { exerciseId: first.exerciseId, movementPattern: def.movementPattern };
  const compound = w.exercises.find(e => getExerciseById(e.exerciseId)?.isCompound);
  if (compound) {
    const d = getExerciseById(compound.exerciseId);
    if (d) return { exerciseId: compound.exerciseId, movementPattern: d.movementPattern };
  }
  return null;
}

/** Find next primary for OLAD rotation: next in SBD/OHP cycle after last session's primary. */
function getNextOladPrimary(recentWorkouts: SavedWorkout[], equipment: AvailableEquipment[]): {
  exerciseId: string;
  name: string;
  movementPattern: MovementPattern;
} | null {
  const lastPrimary = recentWorkouts.length > 0 ? getPrimaryLiftFromWorkout(recentWorkouts[0]) : null;
  const orderedIds = OLAD_PRIMARY_ORDER.map(o => o.exerciseId);
  const allowed = new Set(
    OLAD_PRIMARY_ORDER.filter(o => equipmentIncludes(equipment, getExerciseById(o.exerciseId))).map(o => o.exerciseId)
  );
  if (allowed.size === 0) return null;

  let nextIndex = 0;
  if (lastPrimary && orderedIds.includes(lastPrimary.exerciseId)) {
    nextIndex = (orderedIds.indexOf(lastPrimary.exerciseId) + 1) % OLAD_PRIMARY_ORDER.length;
  }
  for (let i = 0; i < OLAD_PRIMARY_ORDER.length; i++) {
    const candidate = OLAD_PRIMARY_ORDER[(nextIndex + i) % OLAD_PRIMARY_ORDER.length];
    if (allowed.has(candidate.exerciseId)) {
      const ex = getExerciseById(candidate.exerciseId);
      if (ex) return { exerciseId: ex.id, name: ex.name, movementPattern: ex.movementPattern };
    }
  }
  return null;
}

function equipmentIncludes(available: AvailableEquipment[], ex: Exercise | undefined): boolean {
  if (!ex) return false;
  return ex.equipment.some(eq => available.includes(eq));
}

// ─── Muscle group → movement pattern (for optimizer priorities) ───────────────

const MUSCLE_GROUP_TO_PATTERNS: Partial<Record<MuscleGroup, MovementPattern[]>> = {
  [MuscleGroup.QUADS]: [MovementPattern.SQUAT],
  [MuscleGroup.GLUTES]: [MovementPattern.SQUAT, MovementPattern.HINGE],
  [MuscleGroup.HAMSTRINGS]: [MovementPattern.HINGE],
  [MuscleGroup.CHEST]: [MovementPattern.HORIZONTAL_PUSH],
  [MuscleGroup.BACK]: [MovementPattern.HORIZONTAL_PULL, MovementPattern.VERTICAL_PULL],
  [MuscleGroup.SHOULDERS]: [MovementPattern.VERTICAL_PUSH, MovementPattern.HORIZONTAL_PUSH],
  [MuscleGroup.TRICEPS]: [MovementPattern.HORIZONTAL_PUSH, MovementPattern.VERTICAL_PUSH],
  [MuscleGroup.BICEPS]: [MovementPattern.HORIZONTAL_PULL, MovementPattern.VERTICAL_PULL],
  [MuscleGroup.CORE]: [MovementPattern.CORE],
  [MuscleGroup.CALVES]: [MovementPattern.SQUAT, MovementPattern.ISOLATION],
  [MuscleGroup.TRAPS]: [MovementPattern.VERTICAL_PULL, MovementPattern.HORIZONTAL_PULL],
};

// ─── Recent usage & frequency ───────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Collect exercise IDs and movement patterns from the last N sessions with timestamps. */
function getRecentUsage(
  history: SavedWorkout[],
  sessionsLookback: number = 5
): {
  exerciseIdLastUsed: Map<string, number>;
  patternLastUsed: Map<MovementPattern, number>;
  patternCountLast7Days: Map<MovementPattern, number>;
} {
  const exerciseIdLastUsed = new Map<string, number>();
  const patternLastUsed = new Map<MovementPattern, number>();
  const patternCountLast7Days = new Map<MovementPattern, number>();
  const now = Date.now();
  const recent = history.slice(0, sessionsLookback);

  for (const w of recent) {
    const t = w.timestamp ?? 0;
    const daysAgo = (now - t) / MS_PER_DAY;
    if (w.exercises) {
      for (const block of w.exercises) {
        exerciseIdLastUsed.set(block.exerciseId, t);
        const def = getExerciseById(block.exerciseId);
        if (def) {
          patternLastUsed.set(def.movementPattern, t);
          if (daysAgo <= 7) {
            patternCountLast7Days.set(
              def.movementPattern,
              (patternCountLast7Days.get(def.movementPattern) ?? 0) + 1
            );
          }
        }
      }
    }
  }

  return { exerciseIdLastUsed, patternLastUsed, patternCountLast7Days };
}

/** Build "avoid" list: same exercise used in the last 1 session, or same pattern as primary in last session. */
function getAvoidExerciseIds(
  history: SavedWorkout[],
  preferPrimaryMovement?: MovementPattern
): string[] {
  if (history.length === 0) return [];
  const last = history[0];
  const avoid: string[] = [];
  if (last.exercises) {
    for (const block of last.exercises) {
      avoid.push(block.exerciseId);
    }
  }
  return [...new Set(avoid)];
}

/** Build frequency notes: e.g. "Squat trained 2 days ago — prefer variation or moderate load." */
function getFrequencyNotes(
  history: SavedWorkout[],
  patternLastUsed: Map<MovementPattern, number>,
  patternCountLast7Days: Map<MovementPattern, number>
): string[] {
  const now = Date.now();
  const notes: string[] = [];
  const mainPatterns: MovementPattern[] = [
    MovementPattern.SQUAT,
    MovementPattern.HINGE,
    MovementPattern.HORIZONTAL_PUSH,
    MovementPattern.VERTICAL_PUSH,
    MovementPattern.HORIZONTAL_PULL,
    MovementPattern.VERTICAL_PULL,
  ];

  for (const pattern of mainPatterns) {
    const lastT = patternLastUsed.get(pattern);
    if (lastT === undefined) continue;
    const daysAgo = (now - lastT) / MS_PER_DAY;
    const count7 = patternCountLast7Days.get(pattern) ?? 0;
    const label = pattern.replace(/_/g, ' ');

    if (daysAgo < 2 && count7 >= 1) {
      notes.push(`${label} was trained very recently (${daysAgo < 1 ? 'same day or yesterday' : '~1–2 days ago'}). Prefer a different variation or moderate intensity for that pattern today.`);
    } else if (daysAgo > 5 && count7 === 0) {
      notes.push(`${label} has not been trained in over 5 days. Consider prioritizing this pattern in this session.`);
    }
  }

  return notes;
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/** Allowed difficulties for a given experience (inclusive). */
function allowedDifficulties(experience: string | undefined): Set<DifficultyLevel> | null {
  if (!experience) return null;
  const e = String(experience).toLowerCase();
  if (e.includes('beginner')) return new Set(['beginner']);
  if (e.includes('intermediate')) return new Set(['beginner', 'intermediate']);
  if (e.includes('advanced') || e.includes('elite')) return new Set(['beginner', 'intermediate', 'advanced']);
  return null;
}

/** Suggest exercise IDs to prefer: variations of the desired pattern not used in last 2 sessions. */
function getPreferExerciseIds(
  history: SavedWorkout[],
  preferredPatterns: MovementPattern[],
  equipment: AvailableEquipment[],
  maxSuggestions: number = 8,
  trainingExperience?: string
): string[] {
  const recentIds = new Set<string>();
  for (const w of history.slice(0, 2)) {
    w.exercises?.forEach(e => recentIds.add(e.exerciseId));
  }
  const allowedIds = new Set(filterByEquipment(equipment).map(e => e.id));
  const allowedDiff = allowedDifficulties(trainingExperience);
  const prefer: string[] = [];

  for (const pattern of preferredPatterns) {
    let candidates = filterByMovementPattern(pattern).filter(
      e => allowedIds.has(e.id) && !recentIds.has(e.id)
    );
    if (allowedDiff) candidates = candidates.filter(e => allowedDiff.has(e.difficulty));
    for (const e of candidates) {
      if (prefer.length >= maxSuggestions) break;
      if (!prefer.includes(e.id)) prefer.push(e.id);
    }
  }
  return prefer;
}

/** For Main+Accessory: get exercise IDs for patterns complementary to the primary (e.g. Squat → Hinge options). */
function getSecondaryExerciseIds(
  primaryPattern: MovementPattern,
  history: SavedWorkout[],
  equipment: AvailableEquipment[],
  maxSuggestions: number = 6,
  trainingExperience?: string
): string[] {
  const recentIds = new Set<string>();
  for (const w of history.slice(0, 2)) {
    w.exercises?.forEach(e => recentIds.add(e.exerciseId));
  }
  const complementary = getComplementaryPatterns(primaryPattern);
  const allowedIds = new Set(filterByEquipment(equipment).map(e => e.id));
  const allowedDiff = allowedDifficulties(trainingExperience);
  const out: string[] = [];
  for (const pattern of complementary) {
    let candidates = filterByMovementPattern(pattern).filter(
      e => e.isCompound && allowedIds.has(e.id) && !recentIds.has(e.id)
    );
    if (allowedDiff) candidates = candidates.filter(e => allowedDiff.has(e.difficulty));
    for (const e of candidates) {
      if (out.length >= maxSuggestions) break;
      if (!out.includes(e.id)) out.push(e.id);
    }
  }
  return out;
}

/** Patterns with 0 or 1 sessions in the last 7 days (main patterns only). */
function getUnderTrainedPatternsThisWeek(patternCountLast7Days: Map<MovementPattern, number>): MovementPattern[] {
  const main: MovementPattern[] = [
    MovementPattern.SQUAT,
    MovementPattern.HINGE,
    MovementPattern.HORIZONTAL_PUSH,
    MovementPattern.VERTICAL_PUSH,
    MovementPattern.HORIZONTAL_PULL,
    MovementPattern.VERTICAL_PULL,
  ];
  return main.filter(p => (patternCountLast7Days.get(p) ?? 0) <= 1);
}

/** Build suggested pattern slots for standard/high-variety: under-trained first, then balanced. */
function getSuggestedPatternSlots(
  underTrained: MovementPattern[],
  sessionStructure: SessionStructure
): { label: string; patterns: MovementPattern[] }[] {
  const lower = [MovementPattern.SQUAT, MovementPattern.HINGE];
  const upperPush = [MovementPattern.HORIZONTAL_PUSH, MovementPattern.VERTICAL_PUSH];
  const upperPull = [MovementPattern.HORIZONTAL_PULL, MovementPattern.VERTICAL_PULL];

  const pickFirst = (options: MovementPattern[], prefer: MovementPattern[]) =>
    prefer.find(p => options.includes(p)) ?? options[0];

  const slots: { label: string; patterns: MovementPattern[] }[] = [
    { label: 'Main lower', patterns: [pickFirst(lower, underTrained)] },
    { label: 'Push', patterns: upperPush },
    { label: 'Pull', patterns: upperPull },
    { label: 'Core', patterns: [MovementPattern.CORE] },
    { label: 'Accessory / isolation', patterns: [MovementPattern.ISOLATION] },
  ];

  const maxSlots = sessionStructure === 'high-variety' ? 6 : 5;
  return slots.slice(0, maxSlots);
}

/** From optimizer muscle-group priorities, get movement patterns to prioritize and a note. */
function getMuscleGroupPriorityNote(
  muscleGroupPriorities: Partial<Record<MuscleGroup, 'increase' | 'maintain' | 'decrease'>>
): { patterns: MovementPattern[]; note: string } {
  const increase: MuscleGroup[] = [];
  for (const [mg, p] of Object.entries(muscleGroupPriorities)) {
    if (p === 'increase') increase.push(mg as MuscleGroup);
  }
  if (increase.length === 0) return { patterns: [], note: '' };
  const patternSet = new Set<MovementPattern>();
  for (const mg of increase) {
    const pats = MUSCLE_GROUP_TO_PATTERNS[mg];
    if (pats) pats.forEach(p => patternSet.add(p));
  }
  const labels = increase.map(mg => mg.replace(/_/g, ' '));
  return {
    patterns: [...patternSet].filter(p =>
      [MovementPattern.SQUAT, MovementPattern.HINGE, MovementPattern.HORIZONTAL_PUSH, MovementPattern.VERTICAL_PUSH, MovementPattern.HORIZONTAL_PULL, MovementPattern.VERTICAL_PULL].includes(p)
    ),
    note: `Prioritize exercises that target: ${labels.join(', ')}.`,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ExerciseSelectionContext {
  /** For OLAD / main-plus-accessory: the primary lift to use this session. */
  preferredPrimaryLift?: { exerciseId: string; name: string; movementPattern: MovementPattern };
  /** Movement patterns to prioritize this session (from rotation/balance). */
  preferMovementPatterns?: MovementPattern[];
  /** Exercise IDs to avoid (used in the last session). */
  avoidExerciseIds?: string[];
  /** Exercise IDs that are good candidates (variations, not recently used). */
  preferExerciseIds?: string[];
  /** For Main+Accessory: suggested secondary exercise IDs (complementary to primary). */
  suggestedSecondaryExerciseIds?: string[];
  /** For standard/high-variety: ordered pattern slots to fill this session. */
  suggestedPatternSlots?: { label: string; patterns: MovementPattern[] }[];
  /** Patterns under-trained in the last 7 days (0–1 sessions). Prioritize these. */
  underTrainedPatternsThisWeek?: MovementPattern[];
  /** Human-readable rotation note for the prompt. */
  rotationNote?: string;
  /** Human-readable frequency/recovery notes. */
  frequencyNotes?: string[];
  /** Note from optimizer muscle-group priorities (e.g. "Prioritize Back and Glutes"). */
  muscleGroupPriorityNote?: string;
}

export interface ExerciseSelectionInput {
  history: SavedWorkout[];
  sessionStructure: SessionStructure | undefined;
  equipment: AvailableEquipment[];
  optimizerRecommendations?: OptimizerRecommendations | null;
  exercisePreferences?: ExercisePreferences | null;
  /** Optional: filter suggested exercises by difficulty (beginner → beginner only, etc.). */
  trainingExperience?: string;
}

/**
 * Compute exercise selection context from history, session structure, and equipment.
 * Use the result to build a prompt section so the AI gets explicit rotation and frequency guidance.
 */
export function computeExerciseSelectionContext(input: ExerciseSelectionInput): ExerciseSelectionContext {
  const {
    history,
    sessionStructure,
    equipment,
    optimizerRecommendations,
    exercisePreferences,
    trainingExperience,
  } = input;

  const recentWorkouts = history.slice(0, 5);
  const { patternLastUsed, patternCountLast7Days } = getRecentUsage(recentWorkouts, 5);
  const ctx: ExerciseSelectionContext = {};

  const isOlad = sessionStructure === 'one-lift';
  const isMainPlusAccessory = sessionStructure === 'main-plus-accessory';
  const isStandardOrHighVariety =
    sessionStructure === 'standard' || sessionStructure === 'high-variety';

  // ── Under-trained patterns this week (for all structures) ───────────────────
  const underTrained = getUnderTrainedPatternsThisWeek(patternCountLast7Days);
  if (underTrained.length > 0) ctx.underTrainedPatternsThisWeek = underTrained;

  // ── Muscle group priorities from optimizer ─────────────────────────────────
  const mgPriorities = optimizerRecommendations?.muscleGroupPriorities;
  if (mgPriorities && Object.keys(mgPriorities).length > 0) {
    const { patterns, note } = getMuscleGroupPriorityNote(mgPriorities);
    if (note) ctx.muscleGroupPriorityNote = note;
    if (patterns.length > 0) {
      ctx.preferMovementPatterns = [...new Set([...(ctx.preferMovementPatterns ?? []), ...patterns])];
    }
  }

  // ── Preferred primary (OLAD / main-plus-accessory) ────────────────────────
  if (isOlad || isMainPlusAccessory) {
    const primary = getNextOladPrimary(recentWorkouts, equipment);
    if (primary) {
      ctx.preferredPrimaryLift = primary;
      ctx.preferMovementPatterns = [...new Set([...(ctx.preferMovementPatterns ?? []), primary.movementPattern])];
      ctx.rotationNote = isOlad
        ? `PRIMARY LIFT for this OLAD session: ${primary.name} (${primary.exerciseId}). Build the session around this lift; do not use a different primary.`
        : `Suggested main lift for this session: ${primary.name} (${primary.exerciseId}). Use as the primary compound.`;
      // Suggested secondary (complementary) for Main+Accessory
      if (isMainPlusAccessory) {
        const secondaryIds = getSecondaryExerciseIds(
          primary.movementPattern,
          recentWorkouts,
          equipment,
          6,
          trainingExperience
        );
        if (secondaryIds.length > 0) ctx.suggestedSecondaryExerciseIds = secondaryIds;
      }
    }
  }

  // ── Standard / high-variety: suggested pattern slots ─────────────────────
  if (isStandardOrHighVariety) {
    ctx.suggestedPatternSlots = getSuggestedPatternSlots(underTrained, sessionStructure);
  }

  // ── Avoid: exercises used in the last session ─────────────────────────────
  const avoid = getAvoidExerciseIds(recentWorkouts, ctx.preferMovementPatterns?.[0]);
  if (avoid.length > 0) ctx.avoidExerciseIds = avoid;

  // ── Frequency notes ───────────────────────────────────────────────────────
  const frequencyNotes = getFrequencyNotes(history, patternLastUsed, patternCountLast7Days);
  if (frequencyNotes.length > 0) ctx.frequencyNotes = frequencyNotes;

  // ── Prefer list: variations not used in last 2 sessions ───────────────────
  const patternsToPrefer = ctx.preferMovementPatterns ?? [
    MovementPattern.SQUAT,
    MovementPattern.HINGE,
    MovementPattern.HORIZONTAL_PUSH,
    MovementPattern.HORIZONTAL_PULL,
    MovementPattern.VERTICAL_PUSH,
    MovementPattern.VERTICAL_PULL,
  ].filter(p => !ctx.avoidExerciseIds?.some(id => getExerciseById(id)?.movementPattern === p));
  const preferIds = getPreferExerciseIds(
    history,
    patternsToPrefer.slice(0, 4),
    equipment,
    12,
    trainingExperience
  );
  if (preferIds.length > 0) ctx.preferExerciseIds = preferIds;

  // Athlete exercise preferences override: if they have slot selections, we don't override those with avoid
  if (exercisePreferences?.slots?.some(s => s.exerciseId)) {
    const preferredIds = exercisePreferences.slots.map(s => s.exerciseId).filter(Boolean) as string[];
    ctx.preferExerciseIds = [...new Set([...preferredIds, ...(ctx.preferExerciseIds ?? [])])];
    if (ctx.avoidExerciseIds?.length) {
      ctx.avoidExerciseIds = ctx.avoidExerciseIds.filter(id => !preferredIds.includes(id));
    }
  }

  return ctx;
}

/**
 * Format the exercise selection context as a string for the AI prompt.
 */
export function formatExerciseSelectionContextForPrompt(ctx: ExerciseSelectionContext): string {
  const parts: string[] = [];

  if (ctx.rotationNote) {
    parts.push(ctx.rotationNote);
  }
  if (ctx.preferredPrimaryLift) {
    parts.push(`Use "${ctx.preferredPrimaryLift.name}" (id: ${ctx.preferredPrimaryLift.exerciseId}) as the primary lift.`);
  }
  if (ctx.suggestedSecondaryExerciseIds && ctx.suggestedSecondaryExerciseIds.length > 0) {
    const names = ctx.suggestedSecondaryExerciseIds.slice(0, 5).map(id => getExerciseById(id)?.name || id).join(', ');
    parts.push(`For the second exercise, choose a complementary movement from: ${names}.`);
  }
  if (ctx.muscleGroupPriorityNote) {
    parts.push(ctx.muscleGroupPriorityNote);
  }
  if (ctx.underTrainedPatternsThisWeek && ctx.underTrainedPatternsThisWeek.length > 0) {
    const labels = ctx.underTrainedPatternsThisWeek.map(p => p.replace(/_/g, ' ')).join(', ');
    parts.push(`Under-trained this week (prioritize if possible): ${labels}.`);
  }
  if (ctx.suggestedPatternSlots && ctx.suggestedPatternSlots.length > 0) {
    const lines = ctx.suggestedPatternSlots.map(
      s => `- ${s.label}: ${s.patterns.map(p => p.replace(/_/g, ' ')).join(' or ')}`
    );
    parts.push('Suggested session pattern mix (fill in order):\n' + lines.join('\n'));
  }
  if (ctx.frequencyNotes && ctx.frequencyNotes.length > 0) {
    parts.push('FREQUENCY: ' + ctx.frequencyNotes.join(' '));
  }
  if (ctx.avoidExerciseIds && ctx.avoidExerciseIds.length > 0) {
    const names = ctx.avoidExerciseIds.map(id => getExerciseById(id)?.name || id).join(', ');
    parts.push(`Avoid repeating these exercises from the last session: ${names}.`);
  }
  if (ctx.preferExerciseIds && ctx.preferExerciseIds.length > 0) {
    const names = ctx.preferExerciseIds.slice(0, 8).map(id => getExerciseById(id)?.name || id).join(', ');
    parts.push(`Good exercise options (variety/rotation): ${names}.`);
  }

  if (parts.length === 0) return '';
  return `
### EXERCISE SELECTION & ROTATION (follow this guidance)
${parts.join('\n')}
`;
}
