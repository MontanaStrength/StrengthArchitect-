/**
 * Accrued fatigue model for resistance training
 *
 * The Frederick formula treats each set in isolation. In reality, later sets at
 * the same load/reps feel harder (RPE drift). We use a single heuristic: effective
 * RPE = prescribed + 0.35 × set index (0-based). Literature: ~0.3–0.5 RPE drift
 * per set (Helms et al.; work rate and session RPE). We use this for capping and
 * display so prescriptions stay in the target zone under fatigue-aware counting.
 */

/** Drift per set (RPE) — 0.15 assumes 2–3 min rest (near-full recovery). Literature: ~0.3–0.5 at 60–90s rest, ~0.12–0.18 at 120–180s. */
export const HEURISTIC_DRIFT_PER_SET = 0.15;

/**
 * Effective RPE for set index i (0-based): prescribed + drift × i.
 * Used when aggregating Frederick so later sets contribute more metabolic load.
 */
export function effectiveRPEHeuristic(
  setIndex0Based: number,
  prescribedRPE: number,
  driftPerSet: number = HEURISTIC_DRIFT_PER_SET,
): number {
  const effective = prescribedRPE + driftPerSet * setIndex0Based;
  return Math.min(10, Math.max(1, effective));
}

/**
 * Total Frederick for a sequence of sets using heuristic effective RPE per set.
 */
export function calculateSessionMetabolicLoadWithFatigue(
  sets: Array<{ intensityPct: number; reps: number; rpe: number }>,
  _restSec: number,
  mode: 'none' | 'heuristic',
  calculateSetMetabolicLoad: (intensityPct: number, reps: number, rpe: number) => number,
): { totalLoad: number; perSetLoads: number[]; effectiveRPEs: number[] } {
  const perSetLoads: number[] = [];
  const effectiveRPEs: number[] = [];

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const effectiveRPE = mode === 'none' ? s.rpe : effectiveRPEHeuristic(i, s.rpe);
    effectiveRPEs.push(effectiveRPE);
    const load = calculateSetMetabolicLoad(s.intensityPct, s.reps, effectiveRPE);
    perSetLoads.push(load);
  }

  const totalLoad = perSetLoads.reduce((a, b) => a + b, 0);
  return { totalLoad, perSetLoads, effectiveRPEs };
}

export interface TaperedPrescription {
  leadSets: number;
  leadReps: number;
  leadRPE: number;
  taperSets: number;
  taperReps: number;
  taperRPE: number;
  totalReps: number;
  totalFrederickLoad: number;
  description: string;
}

/**
 * Heuristic Frederick total for a tapered prescription (used for cap and display).
 * Builds lead + taper sets and sums Frederick using effective RPE = prescribed + 0.35 × set index.
 */
export function getTaperedHeuristicTotal(
  leadSets: number,
  leadReps: number,
  leadRPE: number,
  taperSets: number,
  taperReps: number,
  taperRPE: number,
  intensityPct: number,
  calculateSetMetabolicLoad: (intensityPct: number, reps: number, rpe: number) => number,
): number {
  const sets: Array<{ intensityPct: number; reps: number; rpe: number }> = [];
  for (let i = 0; i < leadSets; i++) {
    sets.push({ intensityPct, reps: leadReps, rpe: leadRPE });
  }
  for (let i = 0; i < taperSets; i++) {
    sets.push({ intensityPct, reps: taperReps, rpe: taperRPE });
  }
  const result = calculateSessionMetabolicLoadWithFatigue(sets, 0, 'heuristic', calculateSetMetabolicLoad);
  return result.totalLoad;
}

/**
 * Given a chosen tapered prescription, return no-fatigue and heuristic totals (for display).
 */
export function taperedFrederickTotals(
  tapered: TaperedPrescription,
  intensityPct: number,
  calculateSetMetabolicLoad: (intensityPct: number, reps: number, rpe: number) => number,
): { totalNoFatigue: number; totalHeuristic: number } {
  const heuristicTotal = getTaperedHeuristicTotal(
    tapered.leadSets,
    tapered.leadReps,
    tapered.leadRPE,
    tapered.taperSets,
    tapered.taperReps,
    tapered.taperRPE,
    intensityPct,
    calculateSetMetabolicLoad,
  );
  return { totalNoFatigue: tapered.totalFrederickLoad, totalHeuristic: heuristicTotal };
}

export interface ClusterTaperPrescription {
  forceBlock: { sets: number; reps: number; rpe: number };
  metabolicBlock: { sets: number; reps: number; rpe: number };
  intensityPct: number;
  totalFrederickLoad: number;
}

/**
 * Heuristic Frederick total for a cluster-taper prescription.
 * Force block sets come first, then metabolic block sets.
 * RPE drift applies across the entire sequence (set index 0-based).
 */
export function clusterTaperFrederickTotals(
  scheme: ClusterTaperPrescription,
  calculateSetMetabolicLoad: (intensityPct: number, reps: number, rpe: number) => number,
): { totalNoFatigue: number; totalHeuristic: number } {
  const sets: Array<{ intensityPct: number; reps: number; rpe: number }> = [];
  for (let i = 0; i < scheme.forceBlock.sets; i++) {
    sets.push({ intensityPct: scheme.intensityPct, reps: scheme.forceBlock.reps, rpe: scheme.forceBlock.rpe });
  }
  for (let i = 0; i < scheme.metabolicBlock.sets; i++) {
    sets.push({ intensityPct: scheme.intensityPct, reps: scheme.metabolicBlock.reps, rpe: scheme.metabolicBlock.rpe });
  }
  const result = calculateSessionMetabolicLoadWithFatigue(sets, 0, 'heuristic', calculateSetMetabolicLoad);
  return { totalNoFatigue: scheme.totalFrederickLoad, totalHeuristic: result.totalLoad };
}
