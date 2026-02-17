/**
 * Optimizer Engine — evidence-based formulas that compute concrete
 * session recommendations from user preferences, training history,
 * and periodization context.
 *
 * Output feeds directly into the AI prompt as OptimizerRecommendations.
 *
 * Key references:
 *   - Schoenfeld et al. (2017) — dose-response relationship for hypertrophy volume
 *   - Israetel MRV/MEV/MAV volume landmarks
 *   - Helms et al. (2018) — RPE-based autoregulation
 *   - Prilepin's chart — intensity ↔ volume relationship for strength
 *   - NSCA CSCS guidelines for rest, intensity, and rep ranges
 */

import {
  OptimizerConfig,
  OptimizerRecommendations,
  MuscleGroup,
  FormData,
  SavedWorkout,
  TrainingGoalFocus,
  ReadinessLevel,
  SESSION_STRUCTURE_PRESETS,
} from '../types';
import { taperedFrederickTotals, clusterTaperFrederickTotals } from './accruedFatigueModel';

// Re-use the same TrainingContext shape from gemini service
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

// ─── CONSTANTS ───────────────────────────────────────────────

/** Prilepin-inspired volume zones mapped to %1RM bands */
const PRILEPIN: Record<string, { optimalReps: string; setsRange: [number, number]; restRange: [number, number] }> = {
  heavy:   { optimalReps: '1-3',   setsRange: [4, 7],  restRange: [180, 300] },
  medium:  { optimalReps: '3-6',   setsRange: [3, 6],  restRange: [120, 240] },
  light:   { optimalReps: '6-12',  setsRange: [3, 5],  restRange: [60, 150] },
  endure:  { optimalReps: '12-20', setsRange: [2, 4],  restRange: [30, 90] },
};

/** Goal → intensity / volume / rep scheme defaults */
const GOAL_PROFILES: Record<TrainingGoalFocus, {
  intensityRange: [number, number];  // %1RM
  repScheme: string;
  setsPerExercise: [number, number];
  restRange: [number, number];       // seconds
  volumeMultiplier: number;          // relative to baseline
}> = {
  strength: {
    intensityRange: [80, 92],
    repScheme: '4-6 sets × 3-5 reps',
    setsPerExercise: [4, 6],
    restRange: [180, 300],
    volumeMultiplier: 0.85,          // fewer total sets, higher intensity
  },
  hypertrophy: {
    intensityRange: [60, 75],
    repScheme: '3-4 sets × 8-12 reps',
    setsPerExercise: [3, 4],
    restRange: [60, 120],
    volumeMultiplier: 1.15,          // higher volume
  },
  power: {
    intensityRange: [70, 85],
    repScheme: '5-6 sets × 2-3 reps (max intent)',
    setsPerExercise: [4, 6],
    restRange: [120, 240],
    volumeMultiplier: 0.75,          // low volume, high quality
  },
  endurance: {
    intensityRange: [40, 60],
    repScheme: '2-3 sets × 15-20 reps',
    setsPerExercise: [2, 3],
    restRange: [30, 75],
    volumeMultiplier: 1.0,
  },
  general: {
    intensityRange: [65, 80],
    repScheme: '3-4 sets × 6-10 reps',
    setsPerExercise: [3, 4],
    restRange: [90, 150],
    volumeMultiplier: 1.0,
  },
};

// Rep-range user override → preferred scheme
const REP_PREF_MAP: Record<string, { scheme: string; intensityShift: [number, number] }> = {
  low:      { scheme: '4-6 sets × 3-5 reps',   intensityShift: [78, 92] },
  moderate: { scheme: '3-4 sets × 8-12 reps',  intensityShift: [60, 75] },
  high:     { scheme: '2-3 sets × 15-20+ reps', intensityShift: [40, 60] },
};

// ─── HELPERS ─────────────────────────────────────────────────

// ── Epley-based RPE ↔ Intensity helpers ──────────────────────
//   Epley: 1RM = weight × (1 + reps/30)
//   Rearranged: maxReps at %1RM = 30 × (100/pct - 1)
//   RPE = 10 - RIR, where RIR = maxReps - actualReps

/** Derive %1RM needed to achieve a target RPE at a given rep count (Epley inverse). */
export const intensityForRPE = (reps: number, targetRPE: number): number => {
  const rir = Math.max(0, 10 - targetRPE);
  const effectiveMaxReps = reps + rir;
  return Math.round(100 / (1 + effectiveMaxReps / 30));
};

/** Derive the Epley-consistent RPE for a given rep count at a given %1RM. */
export const rpeAtIntensity = (reps: number, intensityPct: number): number => {
  if (intensityPct >= 100) return 10;
  const maxReps = 30 * (100 / intensityPct - 1);
  const rir = Math.max(0, maxReps - reps);
  const rpe = 10 - rir;
  return Math.min(10, Math.max(1, Math.round(rpe * 10) / 10));
};

// ── Frederick Metabolic Stress Formula ───────────────────────
//   Load_set = Intensity × Σ(i=1→reps) e^(-0.215 × (RIR + reps - i))
//   Where: Intensity = %1RM, RIR = 10 - RPE
//
//   The exponential decay models the increasing metabolic cost of
//   each successive rep as the muscle approaches failure. Reps
//   closer to failure (low RIR) produce dramatically more metabolic
//   stress than early reps, which drives the hypertrophic signal.

/** Metabolic load for a single set — the core Frederick formula */
export const calculateSetMetabolicLoad = (
  intensityPct: number,  // %1RM (0-100)
  reps: number,
  rpe: number,           // 1-10
): number => {
  const rir = Math.max(0, 10 - rpe);
  let load = 0;
  for (let i = 1; i <= reps; i++) {
    load += Math.exp(-0.215 * (rir + reps - i));
  }
  return intensityPct * load;
};

/** Sum metabolic load across all sets in a session */
export const calculateSessionMetabolicLoad = (
  sets: Array<{ intensityPct: number; reps: number; rpe: number }>
): number => {
  return sets.reduce((sum, s) => sum + calculateSetMetabolicLoad(s.intensityPct, s.reps, s.rpe), 0);
};

/** Map a total session load to a named zone */
export const getMetabolicZone = (
  load: number
): { zone: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme'; label: string } => {
  if (load < 500)  return { zone: 'light',         label: 'Light' };
  if (load < 650)  return { zone: 'moderate',       label: 'Moderate' };
  if (load < 800)  return { zone: 'moderate-high',  label: 'Moderate-High' };
  if (load < 1100) return { zone: 'high',           label: 'High' };
  return              { zone: 'extreme',        label: 'Extreme' };
};

/** Zone thresholds — also exported for the UI component */
export const METABOLIC_ZONES = [
  { zone: 'light'         as const, label: 'Light',         min: 0,    max: 499  },
  { zone: 'moderate'      as const, label: 'Moderate',      min: 500,  max: 649  },
  { zone: 'moderate-high' as const, label: 'Mod. High',     min: 650,  max: 799  },
  { zone: 'high'          as const, label: 'High',          min: 800,  max: 1099 },
  { zone: 'extreme'       as const, label: 'Tread Carefully', min: 1100, max: 9999 },
] as const;

/**
 * For hypertrophy, the productive zone is Moderate → Moderate-High (500-800).
 * This function computes how many working sets at a given intensity/reps/RPE
 * are needed to land in that zone, and returns a prescriptive set count.
 */
const prescribeHypertrophySets = (
  intensityPct: number,
  reps: number,
  rpe: number,
  targetLoadMin: number,
  targetLoadMax: number,
): { minSets: number; maxSets: number; perSetLoad: number } => {
  const perSetLoad = calculateSetMetabolicLoad(intensityPct, reps, rpe);
  if (perSetLoad <= 0) return { minSets: 3, maxSets: 4, perSetLoad: 0 };
  const minSets = Math.max(1, Math.ceil(targetLoadMin / perSetLoad));
  const maxSets = Math.max(minSets, Math.floor(targetLoadMax / perSetLoad));
  return { minSets, maxSets, perSetLoad };
};

/**
 * Tapered-set prescription for hypertrophy (Epley-consistent RPEs):
 *   1. Lead sets: RPE 7.5-9 target → Epley derives the correct intensity.
 *   2. Taper sets: SAME intensity, fewer reps → Epley derives the actual RPE.
 *   3. All RPEs are physiologically real, not hardcoded.
 *   4. Hits Hanley total reps, stays within Frederick gate (1600).
 */
function prescribeTaperedSets(
  targetReps: number,
  _intensityPctHint: number,  // ignored — we derive intensity from Epley
  _frederickCap: number,      // ignored — we use taperedFrederickGate
): {
  leadSets: number;
  leadReps: number;
  leadRPE: number;
  leadIntensityPct: number;
  taperSets: number;
  taperReps: number;
  taperRPE: number;
  totalReps: number;
  totalFrederickLoad: number;
  description: string;
} | null {
  const taperedFrederickGate = 1600;

  // Lead options: RPE targets 8, 8.5, 7.5 (prefer 8); rep counts 10, 9, 8
  const leadRPEOptions = [8, 8.5, 7.5];
  const leadRepsOptions = [10, 9, 8];
  const leadSetsOptions = [2, 3];
  // Taper: fewer reps at same intensity — RPE naturally drops via Epley
  const taperRepsOptions = [8, 7, 6, 5];

  for (const leadRPE of leadRPEOptions) {
    for (const leadReps of leadRepsOptions) {
      // Derive intensity from lead RPE + reps (Epley)
      const leadIntensity = intensityForRPE(leadReps, leadRPE);
      if (leadIntensity < 55 || leadIntensity > 85) continue; // sanity check

      const loadPerLeadSet = calculateSetMetabolicLoad(leadIntensity, leadReps, leadRPE);

      for (const leadSets of leadSetsOptions) {
        const leadLoad = leadSets * loadPerLeadSet;
        const leadRepsTotal = leadSets * leadReps;
        const remainingReps = targetReps - leadRepsTotal;
        if (remainingReps < 4) continue;

        for (const taperReps of taperRepsOptions) {
          if (taperReps >= leadReps) continue; // taper must use fewer reps
          const taperSets = Math.max(1, Math.round(remainingReps / taperReps));
          const actualTaperReps = taperSets * taperReps;
          const totalReps = leadRepsTotal + actualTaperReps;
          if (Math.abs(totalReps - targetReps) > 10) continue;

          // Derive taper RPE from Epley at same intensity but fewer reps
          const taperRPE = rpeAtIntensity(taperReps, leadIntensity);
          if (taperRPE < 1) continue;

          const loadPerTaperSet = calculateSetMetabolicLoad(leadIntensity, taperReps, taperRPE);
          const taperLoad = taperSets * loadPerTaperSet;
          const totalFrederickLoad = leadLoad + taperLoad;

          if (totalFrederickLoad <= taperedFrederickGate) {
            return {
              leadSets,
              leadReps,
              leadRPE,
              leadIntensityPct: leadIntensity,
              taperSets,
              taperReps,
              taperRPE,
              totalReps,
              totalFrederickLoad: Math.round(totalFrederickLoad * 100) / 100,
              description: `${leadSets}×${leadReps} @ RPE ${leadRPE} (${leadIntensity}%), then ${taperSets}×${taperReps} @ RPE ${taperRPE} (same weight)`,
            };
          }
        }
      }
    }
  }
  return null;
}

// ── Cluster-Taper Hybrid Solver ──────────────────────────────
//   For bias ≥ 50 (upper-general zone): combines peak-force quality
//   with metabolic volume. Same weight for both blocks.
//
//   Force block:  reps capped at peak-force drop-off → every rep is
//                 a quality rep at ≥ 95% peak force.  2-3 sets,
//                 moderate rest (2.5 min).
//   Metabolic block: reps go PAST the force drop-off → provides the
//                 metabolic stimulus (like a controlled pump).  Rest
//                 ~90 s.  RPE ≥ 6 via Epley.
//
//   Viable intensity range: ~68-78 % 1RM.  Below 68, peak-force-
//   capped sets are so submaximal that Frederick can't be met.
//   Above 78, you're effectively in pure-strength territory.

function prescribeClusterTaperSets(
  targetReps: number,
  intMin: number,
  intMax: number,
): {
  forceBlock: { sets: number; reps: number; rpe: number };
  metabolicBlock: { sets: number; reps: number; rpe: number };
  intensityPct: number;
  forceRestSeconds: number;
  metabolicRestSeconds: number;
  totalReps: number;
  totalFrederickLoad: number;
  description: string;
} | null {
  const gate = 1600; // same Frederick ceiling as tapered sets

  // Viable hybrid range — clamp to the goal profile's intensity band
  const lo = Math.max(68, intMin);
  const hi = Math.min(78, intMax);
  if (lo > hi) return null; // profile doesn't overlap the hybrid zone

  // Build candidate intensities, preferring the centre of the viable band
  const intensities: number[] = [];
  for (let i = lo; i <= hi; i++) intensities.push(i);
  const mid = (lo + hi) / 2;
  intensities.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));

  const forceSetOptions = [3, 2];
  const metabRepsOptions = [10, 9, 8];

  for (const intensity of intensities) {
    const forceReps = estimatePeakForceDropRep(intensity);

    for (const forceSets of forceSetOptions) {
      const forceTotal = forceSets * forceReps;
      const remaining = targetReps - forceTotal;
      if (remaining < 4) continue;

      for (const metabReps of metabRepsOptions) {
        // Metabolic block must use MORE reps per set (past force drop)
        if (metabReps <= forceReps) continue;

        const metabSets = Math.max(1, Math.round(remaining / metabReps));
        const totalReps = forceTotal + metabSets * metabReps;
        if (Math.abs(totalReps - targetReps) > 10) continue;

        // Epley-derived RPEs at the chosen intensity
        const forceRPE = rpeAtIntensity(forceReps, intensity);
        const metabRPE = rpeAtIntensity(metabReps, intensity);
        if (metabRPE < 6) continue; // metabolic block needs real effort

        // Frederick loads
        const forceFredPerSet = calculateSetMetabolicLoad(intensity, forceReps, forceRPE);
        const metabFredPerSet = calculateSetMetabolicLoad(intensity, metabReps, metabRPE);
        const totalFrederick = forceSets * forceFredPerSet + metabSets * metabFredPerSet;

        if (totalFrederick <= gate) {
          // Rest: force block gets moderate neural recovery; metabolic block gets hypertrophy rest
          const forceRest = intensity >= 74 ? 180 : 150;
          const metabRest = 90;

          return {
            forceBlock: {
              sets: forceSets,
              reps: forceReps,
              rpe: Math.round(forceRPE * 10) / 10,
            },
            metabolicBlock: {
              sets: metabSets,
              reps: metabReps,
              rpe: Math.round(metabRPE * 10) / 10,
            },
            intensityPct: intensity,
            forceRestSeconds: forceRest,
            metabolicRestSeconds: metabRest,
            totalReps,
            totalFrederickLoad: Math.round(totalFrederick * 100) / 100,
            description: `Force: ${forceSets}×${forceReps} @ RPE ${Math.round(forceRPE * 10) / 10}, Metabolic: ${metabSets}×${metabReps} @ RPE ${Math.round(metabRPE * 10) / 10} (all @ ${intensity}% 1RM, same weight)`,
          };
        }
      }
    }
  }
  return null;
}

// ── Hanley Fatigue Metric ────────────────────────────────────
//   Score = Reps × (100 / (100 - Intensity))²
//   Where: Intensity = %1RM (0-100)
//
//   The quadratic penalty for approaching 100% 1RM models the
//   exponential neuromuscular fatigue cost of high-intensity lifting.
//   At 90% 1RM each rep costs 100 "fatigue points"; at 70% only ~11.
//
//   Used PRESCRIPTIVELY in reverse: given a target volume zone and
//   intensity, compute the total reps per exercise needed to reach
//   that zone. Set/rep division is then handled by Frederick
//   (hypertrophy) or future logic (strength/power).

/** Fatigue score for a single set — the core Hanley formula */
export const calculateSetFatigueScore = (
  reps: number,
  intensityPct: number, // %1RM (0-100)
): number => {
  if (intensityPct >= 100) return Infinity;
  const multiplier = Math.pow(100 / (100 - intensityPct), 2);
  return reps * multiplier;
};

/** Sum fatigue scores across all sets in a session (per exercise) */
export const calculateSessionFatigueScore = (
  sets: Array<{ reps: number; intensityPct: number }>
): number => {
  return sets.reduce((sum, s) => sum + calculateSetFatigueScore(s.reps, s.intensityPct), 0);
};

/**
 * Reverse calculator: given a target fatigue score and intensity,
 * compute required total reps for one exercise in a session.
 *   Reps = TargetScore / (100 / (100 - Intensity))²
 */
export const reverseCalculateReps = (
  targetScore: number,
  intensityPct: number, // %1RM (0-100)
): number => {
  if (intensityPct >= 100) return 0;
  const multiplier = Math.pow(100 / (100 - intensityPct), 2);
  return targetScore / multiplier;
};

/** Map a per-exercise fatigue score to a named zone */
export const getFatigueZone = (
  score: number
): { zone: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme'; label: string } => {
  if (score < 400)  return { zone: 'light',         label: 'Light' };
  if (score < 500)  return { zone: 'moderate',       label: 'Moderate' };
  if (score < 600)  return { zone: 'moderate-high',  label: 'Moderate-High' };
  if (score < 700)  return { zone: 'high',           label: 'High' };
  return              { zone: 'extreme',        label: 'Extreme' };
};

/** Fatigue zone thresholds — exported for the UI */
export const FATIGUE_ZONES = [
  { zone: 'light'         as const, label: 'Light',          min: 0,   max: 399 },
  { zone: 'moderate'      as const, label: 'Moderate',       min: 400, max: 499 },
  { zone: 'moderate-high' as const, label: 'Mod. High',      min: 500, max: 599 },
  { zone: 'high'          as const, label: 'High',           min: 600, max: 699 },
  { zone: 'extreme'       as const, label: 'Tread Carefully', min: 700, max: 9999 },
] as const;

/** Goal-based target fatigue zones per exercise (for the reverse calculator).
 *  Baseline ~500 avg. At hypertrophy midpoint (67.5%), vol tol 4 → ~61 reps. */
const FATIGUE_TARGETS: Record<TrainingGoalFocus, { min: number; max: number }> = {
  hypertrophy: { min: 400, max: 600 },  // many reps at moderate intensity
  strength:    { min: 400, max: 600 },  // fewer reps but high multiplier
  power:       { min: 250, max: 400 },  // minimal reps, maximal quality
  endurance:   { min: 350, max: 550 },  // high reps at low intensity
  general:     { min: 400, max: 550 },  // balanced
};

// ── Peak Force Drop-Off Heuristic ────────────────────────────
//   Approximates when peak force begins to decline during a set,
//   eliminating the need for a linear displacement transducer (LDT).
//
//   Grounded in velocity-based training research (Sanchez-Medina &
//   González-Badillo 2011, Izquierdo et al. 2006) which shows that
//   peak velocity/force degrades once ~40-60% of max reps are
//   completed, with the ratio being intensity-dependent:
//     - Higher intensity → motor units saturated sooner, force drops
//       earlier (as % of max reps)
//     - Lower intensity → more reserve motor units, force maintained
//       longer before recruitment ceiling is hit
//
//   Calibrated to LDT data:  75% 1RM, ~10 max reps → force drops
//   around rep 5-6 (qualityRatio ≈ 0.49).
//
//   For intensity > 90%: always returns 1 (neural demand so high
//   that peak force declines after the very first rep).
//
//   Model:
//     maxReps       = 30 × (100 / intensity - 1)                    [Epley]
//     qualityRatio  = 0.30 + 0.30 × ((90 - intensity) / 30) ^ 0.7  [concave]
//     dropRep       = round(maxReps × qualityRatio)
//
//   The 0.7 exponent creates a concave curve: quality ratio rises
//   quickly at moderate intensities (large motor-unit reserve) and
//   compresses near 90% where force drops almost immediately.

/**
 * Estimate the last rep in a set where peak force is still ≥ 95%
 * of the first rep's peak force. Beyond this rep, force output
 * degrades — shifting the stimulus from strength/power toward
 * metabolic fatigue.
 *
 * @param intensityPct  %1RM (30-100)
 * @returns number of quality reps before force drops (≥ 1)
 */
export const estimatePeakForceDropRep = (intensityPct: number): number => {
  const intensity = Math.max(30, Math.min(intensityPct, 100));
  // Above 90%: force drops after first rep
  if (intensity > 90) return 1;

  const maxReps = 30 * (100 / intensity - 1); // Epley
  const normalised = (90 - intensity) / 30;   // 0 at 90%, 1 at 60%
  const qualityRatio = 0.30 + 0.30 * Math.pow(normalised, 0.7);
  return Math.max(1, Math.round(maxReps * qualityRatio));
};

/**
 * For strength/power training, divide the Hanley-prescribed total
 * reps into sets capped at the peak-force drop-off point.
 * Every rep in every set is a "quality rep" at max force output.
 *
 * @param totalReps       Hanley-prescribed total reps for this exercise
 * @param intensityPct    %1RM (30-100)
 * @returns { sets, repsPerSet, qualityReps } — the strength-optimised scheme
 */
export const prescribeStrengthSets = (
  totalReps: number,
  intensityPct: number,
): { sets: number; repsPerSet: number; qualityReps: number; restSeconds: number } => {
  const dropRep = estimatePeakForceDropRep(intensityPct);
  const repsPerSet = dropRep;
  const sets = Math.max(1, Math.ceil(totalReps / repsPerSet));
  const qualityReps = sets * repsPerSet;

  // Full neural recovery between sets: higher intensity → more rest
  let restSeconds: number;
  if (intensityPct >= 85) restSeconds = 300;      // 5 min
  else if (intensityPct >= 80) restSeconds = 240;  // 4 min
  else if (intensityPct >= 75) restSeconds = 180;  // 3 min
  else restSeconds = 150;                          // 2.5 min

  return { sets, repsPerSet, qualityReps, restSeconds };
};

/** Peak force drop-off table — exported for the UI */
export const PEAK_FORCE_TABLE = [60, 65, 70, 75, 80, 85, 90].map(pct => ({
  intensity: pct,
  maxReps: Math.round(30 * (100 / pct - 1)),
  dropRep: estimatePeakForceDropRep(pct),
  qualityRatio: Math.round(estimatePeakForceDropRep(pct) / (30 * (100 / pct - 1)) * 100),
  multiplier: Math.round(Math.pow(100 / (100 - pct), 2) * 10) / 10,
}));

/** Readiness scalar: Low → 0.55, Medium → 1.0, High → 1.1 */
const readinessScalar = (readiness: string): number => {
  const r = String(readiness).toLowerCase();
  if (r.includes('low'))  return 0.55;
  if (r.includes('high')) return 1.10;
  return 1.0;
};

/** Recovery scalar from pre-workout check-in (sleep + HRV). When sleep < 6h or HRV >15% below baseline, trim volume. */
function recoveryScalarFromCheckIn(checkIn: FormData['preWorkoutCheckIn']): number {
  if (!checkIn) return 1.0;
  const { sleepHoursLastNight, hrvBaselineMs, hrvTodayMs } = checkIn;
  if (sleepHoursLastNight != null && sleepHoursLastNight < 6) return 0.85;
  if (hrvBaselineMs != null && hrvBaselineMs > 0 && hrvTodayMs != null && hrvTodayMs < hrvBaselineMs * 0.85) return 0.88;
  return 1.0;
}

/** Phase-aware volume scalar (if inside a block) */
const phaseVolumeScalar = (ctx: TrainingContext | null | undefined): number => {
  if (!ctx) return 1.0;
  const phase = ctx.phaseName.toLowerCase();
  if (phase.includes('deload') || phase.includes('taper'))         return 0.50;
  if (phase.includes('peak'))                                      return 0.65;
  if (phase.includes('intensif'))                                  return 0.85;
  if (phase.includes('accumulation') || phase.includes('volume'))  return 1.15;
  if (phase.includes('hypertrophy'))                               return 1.20;
  return 1.0;
};

/** Phase-aware intensity adjustment (±% band shift) */
const phaseIntensityShift = (ctx: TrainingContext | null | undefined): number => {
  if (!ctx) return 0;
  const phase = ctx.phaseName.toLowerCase();
  if (phase.includes('deload') || phase.includes('taper')) return -10;
  if (phase.includes('peak'))                              return +5;
  if (phase.includes('intensif'))                          return +5;
  if (phase.includes('accumulation'))                      return -5;
  if (phase.includes('hypertrophy'))                       return -3;
  return 0;
};

/** Count weekly working sets by muscle group from last 7 days of history */
const computeWeeklyVolume = (history: SavedWorkout[]): Partial<Record<MuscleGroup, number>> => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(w => w.timestamp >= cutoff);
  const vol: Partial<Record<MuscleGroup, number>> = {};

  for (const w of recent) {
    const groups = (w.muscleGroupsCovered || []) as MuscleGroup[];
    if (groups.length === 0) continue;
    const totalSets = w.exercises.reduce((s, e) => s + (e.isWarmupSet ? 0 : (e.sets || 0)), 0);
    const setsPerGroup = totalSets / groups.length;
    for (const mg of groups) {
      vol[mg] = (vol[mg] || 0) + setsPerGroup;
    }
  }
  return vol;
};

/** Summarize last session’s per-set RPE for autoregulation and prompt. History assumed most-recent first. */
function getLastSessionSetRPESummary(history: SavedWorkout[]): { summary: string; hadHighRPE: boolean } | null {
  const last = history[0];
  const sets = last?.completedSets?.filter(s => s.rpe != null && s.rpe > 0);
  if (!sets?.length) return null;

  const byExercise = new Map<string, { name: string; rpes: number[] }>();
  for (const s of sets) {
    const key = s.exerciseId || s.exerciseName;
    const name = s.exerciseName || s.exerciseId || 'Exercise';
    if (!byExercise.has(key)) byExercise.set(key, { name, rpes: [] });
    byExercise.get(key)!.rpes.push(s.rpe!);
  }

  const parts: string[] = [];
  let hadHighRPE = false;
  for (const [, { name, rpes }] of byExercise) {
    const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
    const highCount = rpes.filter(r => r >= 8.5).length;
    if (highCount >= 2 || highCount / rpes.length >= 0.5) hadHighRPE = true;
    const note = highCount >= rpes.length ? ' (all hard)' : highCount > 0 ? ` (${highCount} set(s) RPE 8.5+)` : '';
    parts.push(`${name}: ${rpes.length} sets, avg RPE ${avg.toFixed(1)}${note}`);
  }
  return { summary: parts.join('; '), hadHighRPE };
}

/** Recent fatigue load (last 7d) + RPE trend (last 5 sessions) */
const computeFatigueSignals = (history: SavedWorkout[]) => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(w => w.timestamp >= cutoff);
  let hardSessions = 0;
  let totalSets = 0;
  let totalTonnage = 0;

  for (const w of recent) {
    const exs = (w.exercises || []).filter(e => !e.isWarmupSet);
    const sets = exs.reduce((s, e) => s + (e.sets || 0), 0);
    const tonnage = w.actualTonnage || exs.reduce((s, e) => {
      const avgReps = e.reps?.includes('-')
        ? (Number(e.reps.split('-')[0]) + Number(e.reps.split('-')[1])) / 2
        : Number(e.reps) || 8;
      return s + e.sets * avgReps * (e.weightLbs || 0);
    }, 0);
    totalSets += sets;
    totalTonnage += tonnage;

    const avgPct = exs.reduce((s, e) => s + (e.percentOf1RM || 0), 0) / (exs.length || 1);
    const avgRPE = exs.reduce((s, e) => s + (e.rpeTarget || 0), 0) / (exs.length || 1);
    if (avgPct >= 85 || avgRPE >= 8.5 || (w.sessionRPE || 0) >= 8) hardSessions++;
  }

  // RPE trend: rolling average of session RPE over last 5 sessions (any timeframe)
  const withRPE = [...history]
    .filter(w => w.sessionRPE != null && w.sessionRPE > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  const rpeTrendAvg = withRPE.length >= 2
    ? withRPE.reduce((s, w) => s + (w.sessionRPE || 0), 0) / withRPE.length
    : null;
  // Direction: compare most recent 2 vs oldest 2 (if we have ≥4 sessions)
  let rpeTrendDirection: 'rising' | 'falling' | 'stable' | null = null;
  if (withRPE.length >= 4) {
    const recentAvg = (withRPE[0].sessionRPE! + withRPE[1].sessionRPE!) / 2;
    const olderAvg = (withRPE[withRPE.length - 2].sessionRPE! + withRPE[withRPE.length - 1].sessionRPE!) / 2;
    const diff = recentAvg - olderAvg;
    rpeTrendDirection = diff >= 0.5 ? 'rising' : diff <= -0.5 ? 'falling' : 'stable';
  }

  return {
    sessionsLast7d: recent.length,
    hardSessions,
    totalSets,
    totalTonnage,
    rpeTrendAvg,
    rpeTrendDirection,
    rpeTrendSessionCount: withRPE.length,
  };
};

/** Should we force a deload based on config + week counting? */
const shouldAutoDeload = (config: OptimizerConfig, history: SavedWorkout[]): boolean => {
  if (!config.autoDeload || !config.deloadFrequencyWeeks) return false;
  // Count consecutive weeks with ≥ 2 sessions
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let consecutiveTrainingWeeks = 0;
  for (let w = 0; w < 12; w++) {
    const start = Date.now() - (w + 1) * weekMs;
    const end   = Date.now() - w * weekMs;
    const count = history.filter(h => h.timestamp >= start && h.timestamp < end).length;
    if (count >= 2) consecutiveTrainingWeeks++;
    else break;
  }
  return consecutiveTrainingWeeks >= config.deloadFrequencyWeeks;
};

// ─── MAIN ENGINE ─────────────────────────────────────────────

export function computeOptimizerRecommendations(
  config: OptimizerConfig,
  formData: FormData,
  history: SavedWorkout[],
  trainingContext?: TrainingContext | null,
  volumeTolerance: number = 3,
  goalBias: number = 50,
): OptimizerRecommendations {
  const goal = formData.trainingGoalFocus as TrainingGoalFocus;
  const profile = GOAL_PROFILES[goal] || GOAL_PROFILES['general'];

  // Volume tolerance scalar: 1=0.7x, 2=0.85x, 3=1.0x, 4=1.2x, 5=1.4x
  const volTolScalar = volumeTolerance <= 1 ? 0.70
    : volumeTolerance <= 2 ? 0.85
    : volumeTolerance <= 3 ? 1.0
    : volumeTolerance <= 4 ? 1.20
    : 1.40;

  // Sets-per-exercise scalar (separate from session volume)
  // This is the key lever: at level 5, you might do 5×10 instead of 3×10
  const setsPerExScalar = volumeTolerance <= 1 ? 0.75
    : volumeTolerance <= 2 ? 0.85
    : volumeTolerance <= 3 ? 1.0
    : volumeTolerance <= 4 ? 1.15
    : 1.30;

  // ── 1. Base session volume (working sets) ──────────────
  const userMaxSets = config.maxSetsPerSession || 25;
  let sessionVolume = Math.round(
    userMaxSets
    * profile.volumeMultiplier
    * volTolScalar
    * readinessScalar(formData.readiness)
    * phaseVolumeScalar(trainingContext)
    * recoveryScalarFromCheckIn(formData.preWorkoutCheckIn)
  );

  // ── 2. Fatigue dampening ───────────────────────────────
  const fatigue = computeFatigueSignals(history);
  if (fatigue.hardSessions >= 3) {
    sessionVolume = Math.round(sessionVolume * 0.80);  // back off 20%
  } else if (fatigue.hardSessions >= 2 && fatigue.sessionsLast7d >= 4) {
    sessionVolume = Math.round(sessionVolume * 0.90);
  }

  // ── 2b. RPE trend adjustment ──────────────────────────
  //   Rolling avg of session RPE over last 5 sessions. If consistently
  //   high (≥8.5 avg) or rising, scale volume down. If low (≤6) and
  //   stable/falling, nudge volume up slightly — the athlete can handle more.
  if (fatigue.rpeTrendAvg != null && fatigue.rpeTrendSessionCount >= 2) {
    if (fatigue.rpeTrendAvg >= 9.0) {
      sessionVolume = Math.round(sessionVolume * 0.80); // overreaching — cut 20%
    } else if (fatigue.rpeTrendAvg >= 8.5) {
      sessionVolume = Math.round(sessionVolume * 0.88); // high chronic load — cut 12%
    } else if (fatigue.rpeTrendAvg >= 8.0 && fatigue.rpeTrendDirection === 'rising') {
      sessionVolume = Math.round(sessionVolume * 0.92); // trending up toward overreach — cut 8%
    } else if (fatigue.rpeTrendAvg <= 6.0 && fatigue.rpeTrendDirection !== 'rising') {
      sessionVolume = Math.round(sessionVolume * 1.05); // athlete is coasting — nudge up 5%
    }
  }

  // ── 2c. Last-session set-level RPE ──────────────────────
  //   If the most recent session had many sets at RPE 8.5+, nudge volume down
  //   so today is moderate for those movements (or overall).
  const lastSetRPE = getLastSessionSetRPESummary(history);
  if (lastSetRPE?.hadHighRPE) {
    sessionVolume = Math.round(sessionVolume * 0.92); // trim 8% when last session was very hard at set level
  }

  // ── 3. Auto-deload override ────────────────────────────
  const forceDeload = shouldAutoDeload(config, history);
  if (forceDeload) {
    sessionVolume = Math.round(userMaxSets * 0.50);
  }

  // Clamp
  sessionVolume = Math.max(6, Math.min(sessionVolume, 40));


  // ── 7. Exercise count ──────────────────────────────────
  // Scale sets-per-exercise by volume tolerance
  const scaledSetsMin = Math.max(2, Math.round(profile.setsPerExercise[0] * setsPerExScalar));
  const scaledSetsMax = Math.max(scaledSetsMin, Math.round(profile.setsPerExercise[1] * setsPerExScalar));
  const avgSetsPerExercise = (scaledSetsMin + scaledSetsMax) / 2;
  let exerciseCountMin = Math.max(3, Math.floor(sessionVolume / scaledSetsMax));
  let exerciseCountMax = Math.min(10, Math.ceil(sessionVolume / scaledSetsMin));
  if (exerciseCountMin > exerciseCountMax) exerciseCountMax = exerciseCountMin;

  // Override exercise count if session structure is set
  const structurePreset = formData.sessionStructure
    ? SESSION_STRUCTURE_PRESETS.find(p => p.id === formData.sessionStructure)
    : null;
  if (structurePreset) {
    exerciseCountMin = structurePreset.exerciseRange.min;
    exerciseCountMax = structurePreset.exerciseRange.max;
  }

  let hanleyCapApplied = false;
  const maxExercises = Math.max(exerciseCountMin, exerciseCountMax);

  // ── 4. Rep scheme (scaled by volume tolerance) ──────────
  let repScheme = `${scaledSetsMin}-${scaledSetsMax} sets × ${profile.repScheme.split('×')[1]?.trim() || profile.repScheme}`;
  if (config.repRangePreference && config.repRangePreference !== 'auto') {
    const prefScheme = REP_PREF_MAP[config.repRangePreference]?.scheme;
    if (prefScheme) {
      const repPart = prefScheme.split('×')[1]?.trim() || prefScheme;
      repScheme = `${scaledSetsMin}-${scaledSetsMax} sets × ${repPart}`;
    }
  }
  if (forceDeload) {
    repScheme = '2-3 sets × 8-12 reps (deload: technique focus)';
  }

  // ── 5. Intensity range ─────────────────────────────────
  let [intMin, intMax] = profile.intensityRange;
  // User rep pref override
  if (config.repRangePreference && config.repRangePreference !== 'auto') {
    const shift = REP_PREF_MAP[config.repRangePreference]?.intensityShift;
    if (shift) [intMin, intMax] = shift;
  }
  // Phase shift
  const iShift = phaseIntensityShift(trainingContext);
  intMin = Math.max(30, Math.min(intMin + iShift, 100));
  intMax = Math.max(intMin, Math.min(intMax + iShift, 100));
  // Readiness dampening
  if (String(formData.readiness).toLowerCase().includes('low')) {
    intMax = Math.min(intMax, 75);
  }
  if (forceDeload) {
    intMin = Math.min(intMin, 50);
    intMax = Math.min(intMax, 65);
  }

  // ── 6. Rest range ──────────────────────────────────────
  let restRange = { min: profile.restRange[0], max: profile.restRange[1] };
  if (forceDeload) restRange = { min: 60, max: 120 };
  // Also cap by time budget (rough: ~4 min per working set including rest)
  const timeCap = Math.floor(formData.duration / 4);
  if (sessionVolume > timeCap) {
    sessionVolume = timeCap;
    exerciseCountMax = Math.min(exerciseCountMax, Math.ceil(timeCap / avgSetsPerExercise));
  }

  // ── 8. Muscle group priorities ─────────────────────────
  const weeklyVol = computeWeeklyVolume(history);
  const targets = config.targetSetsPerMuscleGroup || {};
  const muscleGroupPriorities: Partial<Record<MuscleGroup, 'increase' | 'maintain' | 'decrease'>> = {};
  const weeklyVolumeStatus: Partial<Record<MuscleGroup, { current: number; target: number; status: 'under' | 'on-track' | 'over' }>> = {};

  for (const mg of Object.values(MuscleGroup)) {
    const target = targets[mg] ?? 0;
    if (target === 0) continue;           // user didn't set a target
    const current = Math.round(weeklyVol[mg] || 0);
    const ratio = current / target;

    let status: 'under' | 'on-track' | 'over';
    let priority: 'increase' | 'maintain' | 'decrease';

    if (ratio < 0.7)       { status = 'under';    priority = 'increase'; }
    else if (ratio <= 1.15) { status = 'on-track'; priority = 'maintain'; }
    else                    { status = 'over';     priority = 'decrease'; }

    muscleGroupPriorities[mg] = priority;
    weeklyVolumeStatus[mg] = { current, target, status };
  }

  // ── 9. Suggested focus override ────────────────────────
  let suggestedFocus: TrainingGoalFocus | undefined;
  if (forceDeload) {
    suggestedFocus = 'general';
  }
  // If phase dictates a focus, hint at it
  if (trainingContext) {
    const phase = trainingContext.phaseName.toLowerCase();
    if (phase.includes('strength') || phase.includes('intensif')) suggestedFocus = 'strength';
    else if (phase.includes('hypertrophy') || phase.includes('accumulation')) suggestedFocus = 'hypertrophy';
    else if (phase.includes('power') || phase.includes('peak')) suggestedFocus = 'power';
  }

  // ── 10. Frederick Metabolic Stress — prescriptive for hypertrophy ──
  //   For hypertrophy sessions we target the Moderate→Moderate-High zone
  //   (500-800 metabolic load units). The formula computes per-set load
  //   at the midpoint of the recommended intensity/reps/RPE, then adjusts
  //   session volume so total metabolic stress lands in the productive zone.
  let metabolicLoadTarget: { min: number; max: number } | undefined;
  let metabolicLoadZone: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme' | undefined;
  let metabolicLoadPerSet: number | undefined;

  const effectiveGoal = suggestedFocus || goal;
  const isHypertrophyLike = effectiveGoal === 'hypertrophy' || effectiveGoal === 'general';

  // NEW FIELD: metabolic sets per exercise
  let metabolicSetsPerExercise: { min: number; max: number } | undefined;

  if (isHypertrophyLike && !forceDeload) {
    // Target zones by goal — these are PER EXERCISE, not session total
    // Tuned +23% above original baseline (Frederick rev-2)
    const targetMin = effectiveGoal === 'hypertrophy' ? 618 : 495;
    const targetMax = effectiveGoal === 'hypertrophy' ? 989 : 865;
    metabolicLoadTarget = { min: targetMin, max: targetMax };

    // Estimate per-set load at midpoint of recommended parameters
    const midIntensity = (intMin + intMax) / 2;
    const midReps = effectiveGoal === 'hypertrophy' ? 10 : 8;
    const midRPE = 8; // typical hypertrophy RPE
    const perSet = calculateSetMetabolicLoad(midIntensity, midReps, midRPE);
    metabolicLoadPerSet = Math.round(perSet * 100) / 100;

    if (perSet > 0) {
      // Compute how many sets PER EXERCISE to hit the metabolic target
      const metMinSets = Math.max(1, Math.ceil(targetMin / perSet));
      const metMaxSets = Math.max(metMinSets, Math.floor(targetMax / perSet));
      metabolicSetsPerExercise = { min: metMinSets, max: metMaxSets };
    }

    // Project per-exercise zone (mid sets × per-set load)
    const avgSets = metabolicSetsPerExercise
      ? (metabolicSetsPerExercise.min + metabolicSetsPerExercise.max) / 2
      : avgSetsPerExercise;
    const projectedLoad = metabolicLoadPerSet * avgSets;
    metabolicLoadZone = getMetabolicZone(projectedLoad).zone;
  } else if (effectiveGoal === 'strength') {
    // Strength sessions: compute per-exercise load for context
    const midIntensity = (intMin + intMax) / 2;
    const midReps = 4;
    const midRPE = 8.5;
    metabolicLoadPerSet = Math.round(calculateSetMetabolicLoad(midIntensity, midReps, midRPE) * 100) / 100;
    const avgSets = (profile.setsPerExercise[0] + profile.setsPerExercise[1]) / 2;
    const projectedLoad = metabolicLoadPerSet * avgSets;
    metabolicLoadZone = getMetabolicZone(projectedLoad).zone;
  }

  // ── 11. Hanley Fatigue Metric — prescriptive total reps per exercise ──
  //   Score = Reps × (100 / (100 - Intensity))²
  //   Used in reverse: Reps = TargetScore / (100 / (100 - Intensity))²
  //   This prescribes how many total reps of each exercise the session should
  //   contain. Set/rep division is then handled by Frederick (hypertrophy) or
  //   future logic (strength/power).
  let fatigueScoreTarget: { min: number; max: number } | undefined;
  let fatigueScoreZone: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme' | undefined;
  let targetRepsPerExercise: number | undefined;

  if (!forceDeload) {
    const goalForFatigue = effectiveGoal || 'general';
    const fTarget = FATIGUE_TARGETS[goalForFatigue] || FATIGUE_TARGETS.general;
    fatigueScoreTarget = fTarget;

    // Reverse-calculate target total reps at midpoint intensity
    const midIntensity = (intMin + intMax) / 2;
    const targetMidScore = (fTarget.min + fTarget.max) / 2;
    const computedReps = reverseCalculateReps(targetMidScore, midIntensity);
    targetRepsPerExercise = Math.max(1, Math.round(computedReps * setsPerExScalar));

    // Readiness adjustment: low readiness → trim reps ~20%
    if (String(formData.readiness).toLowerCase().includes('low')) {
      targetRepsPerExercise = Math.max(1, Math.round(targetRepsPerExercise * 0.80));
    }

    // Determine projected zone
    const projectedScore = calculateSetFatigueScore(targetRepsPerExercise, midIntensity);
    fatigueScoreZone = getFatigueZone(projectedScore).zone;

    // ── 11b. Hanley fatigue cap for concentrated sessions ────
    //   When exercise count is low (1-2), the NSCA session volume
    //   would all concentrate on one movement, blowing past the
    //   per-exercise fatigue ceiling. Cap sessionVolume so that
    //   total sets × avg reps/set ≈ targetRepsPerExercise × exerciseCount.
    //
    //   Uses the Hanley-prescribed reps as the ceiling — the science
    //   dictates the volume, not a generic session guideline.
    if (maxExercises <= 2 && targetRepsPerExercise) {
      // Estimate reps per set from the rep scheme or intensity
      const epleyMax = Math.max(1, Math.round(30 * (100 / midIntensity - 1)));
      const repsPerSet = Math.max(1, Math.min(
        (scaledSetsMin + scaledSetsMax) > 0
          ? Math.round(targetRepsPerExercise / ((scaledSetsMin + scaledSetsMax) / 2))
          : 5,
        Math.round(epleyMax * 0.65) // don't go past ~65% of max reps
      ));

      // Max sets = Hanley target reps / reps per set, per exercise
      const maxSetsPerExercise = Math.max(4, Math.ceil(targetRepsPerExercise / Math.max(1, repsPerSet)));
      const hanleyCappedVolume = maxSetsPerExercise * maxExercises;

      if (sessionVolume > hanleyCappedVolume) {
        hanleyCapApplied = true;
        sessionVolume = hanleyCappedVolume;
        // Update rep scheme to reflect the capped volume
        repScheme = `${maxSetsPerExercise} sets × ${repsPerSet} reps (Hanley fatigue-capped)`;
      }
    }
  }

  // ── 11c-pre. Myo-Rep session detection (~25% of hypertrophy sessions) ──
  //   Myo-Reps (Borge Fagerli): activation set 12-20 reps @ RPE 8, then
  //   3-5 mini-sets of 3-5 reps with 15-20s rest. Stops when reps drop.
  //   Equivalent hypertrophy to 3 traditional sets in ~30% of the time.
  //   Applied to accessories/machines only — NOT barbell squat/bench/deadlift.
  //   Triggered when: hypertrophy-focused (bias < 50), not deload, not low readiness.
  //   Rotation: every 4th qualifying session (deterministic ~25%).
  let myoRepScheme: OptimizerRecommendations['myoRepScheme'] | undefined;
  const isLowReadiness = String(formData.readiness).toLowerCase().includes('low');
  const myoRepEligible = isHypertrophyLike && !forceDeload && goalBias < 50 && !isLowReadiness;
  const isMyoRepSession = myoRepEligible && (history.length % 4 === 0);

  if (isMyoRepSession) {
    // Myo-Rep intensity: ~55-65% 1RM (lighter than standard hypertrophy)
    const myoIntensity = Math.round((55 + 65) / 2); // 60% midpoint
    myoRepScheme = {
      activationReps: [12, 15],
      miniSetReps: [3, 5],
      maxMiniSets: 5,
      miniSetRestSeconds: 15,
      intensityPct: myoIntensity,
      description: `Myo-Rep: 12-15 activation @ RPE 8, then up to 5×3-5 with 15s rest. ~${myoIntensity}% 1RM. Accessories/machines only — compounds use straight sets.`,
    };

    // Override rep scheme and intensity for Myo-Rep session
    repScheme = `Myo-Rep: 12-15 + up to 5×3-5 (15s rest) for accessories; straight sets for compounds`;
    intMin = Math.min(intMin, 55);
    intMax = Math.min(intMax, 65);
    restRange = { min: 15, max: 20 };

    // Hanley targets don't apply to Myo-Rep exercises (fewer total reps, same stimulus)
    // but we keep Frederick — metabolic stress is very high per Myo-Rep "set"
    fatigueScoreTarget = undefined;
    fatigueScoreZone = undefined;
    targetRepsPerExercise = undefined;
  }

  // ── 11c. Set structure — metabolic taper OR cluster-taper hybrid ──
  //   Bias < 50:  metabolic taper (lead high-RPE + taper low-RPE)
  //   Bias ≥ 50:  cluster-taper hybrid (force-capped lead + metabolic follow-up)
  //   Both hit Hanley total reps and keep Frederick within gate.
  //   Skipped entirely when Myo-Rep session is active.
  let taperedRepScheme: ReturnType<typeof prescribeTaperedSets> | undefined = undefined;
  let taperedHeuristic: number | undefined;
  let clusterTaperScheme: ReturnType<typeof prescribeClusterTaperSets> | undefined = undefined;
  let clusterTaperHeuristic: number | undefined;

  if (
    isHypertrophyLike &&
    !forceDeload &&
    !isMyoRepSession &&
    targetRepsPerExercise != null &&
    metabolicLoadTarget != null
  ) {
    const midIntensity = (intMin + intMax) / 2;

    if (goalBias >= 50) {
      // ── Cluster-Taper hybrid (bias ≥ 50) ──
      clusterTaperScheme = prescribeClusterTaperSets(
        targetRepsPerExercise,
        intMin,
        intMax,
      ) ?? undefined;

      if (clusterTaperScheme) {
        const { totalHeuristic } = clusterTaperFrederickTotals(clusterTaperScheme, calculateSetMetabolicLoad);
        clusterTaperHeuristic = Math.round(totalHeuristic * 100) / 100;

        repScheme = `Cluster-Taper: ${clusterTaperScheme.description} (~${clusterTaperScheme.totalReps} reps, Frederick ~${Math.round(clusterTaperScheme.totalFrederickLoad)})`;

        // Override intensity range to the hybrid intensity
        intMin = Math.max(intMin, clusterTaperScheme.intensityPct - 3);
        intMax = clusterTaperScheme.intensityPct;
      }
    }

    // ── Metabolic taper (bias < 50, or cluster-taper fallback) ──
    if (!clusterTaperScheme) {
      taperedRepScheme = prescribeTaperedSets(
        targetRepsPerExercise,
        midIntensity,
        metabolicLoadTarget.max,
      );
      if (taperedRepScheme) {
        const epleyIntensity = taperedRepScheme.leadIntensityPct || midIntensity;
        const { totalHeuristic } = taperedFrederickTotals(taperedRepScheme, epleyIntensity, calculateSetMetabolicLoad);
        taperedHeuristic = Math.round(totalHeuristic * 100) / 100;
        repScheme = `Tapered: ${taperedRepScheme.description} (~${taperedRepScheme.totalReps} reps, Frederick ~${Math.round(taperedRepScheme.totalFrederickLoad)})`;

        // Override intensity range to the Epley-derived value (lead and taper use same weight)
        if (taperedRepScheme.leadIntensityPct) {
          intMin = Math.max(intMin, taperedRepScheme.leadIntensityPct - 3);
          intMax = taperedRepScheme.leadIntensityPct;
        }
      }
    }
  }

  // ── 12. Peak Force Drop-Off — strength/power set division ──
  //   For strength and power goals, every rep should be performed at
  //   peak force output. The heuristic estimates when force begins
  //   to decline (approximating LDT data), then divides the Hanley-
  //   prescribed total reps into sets capped at that threshold.
  //   Rest periods are set for full neural recovery (3-5 min).
  let peakForceDropRep: number | undefined;
  let strengthSetDivision: { sets: number; repsPerSet: number; restSeconds: number } | undefined;

  const isStrengthPower = effectiveGoal === 'strength' || effectiveGoal === 'power';

  if (isStrengthPower && !forceDeload && targetRepsPerExercise) {
    const midIntensity = (intMin + intMax) / 2;
    peakForceDropRep = estimatePeakForceDropRep(midIntensity);
    const division = prescribeStrengthSets(targetRepsPerExercise, midIntensity);
    strengthSetDivision = {
      sets: division.sets,
      repsPerSet: division.repsPerSet,
      restSeconds: division.restSeconds,
    };

    // Override the generic rep scheme with the strength-specific one
    repScheme = `${division.sets} sets × ${division.repsPerSet} reps (peak force, ${Math.round(division.restSeconds / 60)}+ min rest)`;
  }

  // ── 13. Build rationale ────────────────────────────────
  const parts: string[] = [];
  parts.push(`Goal profile: ${goal}.`);
  parts.push(`Base max sets: ${userMaxSets}, adjusted to ${sessionVolume} working sets.`);
  if (hanleyCapApplied) {
    parts.push(`Hanley fatigue cap applied: concentrated session (${maxExercises} exercise${maxExercises > 1 ? 's' : ''}) — volume capped to stay within per-exercise fatigue ceiling.`);
  }
  if (fatigue.hardSessions > 0) {
    parts.push(`Fatigue: ${fatigue.hardSessions} hard session(s) and ${fatigue.sessionsLast7d} total in last 7 days.`);
  }
  if (fatigue.rpeTrendAvg != null && fatigue.rpeTrendSessionCount >= 2) {
    const dir = fatigue.rpeTrendDirection ? `, ${fatigue.rpeTrendDirection}` : '';
    parts.push(`RPE trend (last ${fatigue.rpeTrendSessionCount} sessions): avg ${fatigue.rpeTrendAvg.toFixed(1)}${dir}.`);
  }
  if (lastSetRPE) {
    parts.push(`Last session set-level RPE: ${lastSetRPE.summary}.${lastSetRPE.hadHighRPE ? ' Moderating volume today.' : ''}`);
  }
  if (forceDeload) {
    parts.push(`AUTO-DELOAD triggered after ${config.deloadFrequencyWeeks} consecutive training weeks — volume halved, intensity capped.`);
  }
  if (trainingContext) {
    parts.push(`Active block "${trainingContext.blockName}", phase: ${trainingContext.phaseName} (wk ${trainingContext.weekInPhase}/${trainingContext.totalWeeksInPhase}).`);
  }
  const underMuscles = Object.entries(muscleGroupPriorities)
    .filter(([, p]) => p === 'increase')
    .map(([mg]) => mg);
  if (underMuscles.length > 0) {
    parts.push(`Under-volume muscles to prioritize: ${underMuscles.join(', ')}.`);
  }
  if (metabolicLoadTarget && metabolicLoadPerSet) {
    const avgSets = metabolicSetsPerExercise
      ? (metabolicSetsPerExercise.min + metabolicSetsPerExercise.max) / 2
      : avgSetsPerExercise;
    const projectedLoad = Math.round(metabolicLoadPerSet * avgSets);
    parts.push(`Frederick metabolic load per exercise: ~${projectedLoad} (target: ${metabolicLoadTarget.min}–${metabolicLoadTarget.max}, zone: ${metabolicLoadZone}, ${metabolicSetsPerExercise ? `${metabolicSetsPerExercise.min}-${metabolicSetsPerExercise.max} sets/exercise` : ''}).`);
  }
  if (fatigueScoreTarget && targetRepsPerExercise) {
    const midInt = Math.round((intMin + intMax) / 2);
    parts.push(`Hanley fatigue: ${targetRepsPerExercise} total reps/exercise at ~${midInt}% (target zone: ${fatigueScoreTarget.min}–${fatigueScoreTarget.max}, ${fatigueScoreZone}).`);
  }
  if (peakForceDropRep && strengthSetDivision) {
    parts.push(`Peak force drops after rep ${peakForceDropRep} at ~${Math.round((intMin + intMax) / 2)}%. Strength prescription: ${strengthSetDivision.sets}×${strengthSetDivision.repsPerSet} with ${Math.round(strengthSetDivision.restSeconds / 60)}+ min rest.`);
  }
  if (clusterTaperScheme) {
    const fb = clusterTaperScheme.forceBlock;
    const mb = clusterTaperScheme.metabolicBlock;
    parts.push(`Cluster-Taper hybrid: Force ${fb.sets}×${fb.reps} @ RPE ${fb.rpe} (peak-force capped, ${Math.round(clusterTaperScheme.forceRestSeconds / 60)}+ min rest), then Metabolic ${mb.sets}×${mb.reps} @ RPE ${mb.rpe} (${Math.round(clusterTaperScheme.metabolicRestSeconds / 60)}.5 min rest). All @ ${clusterTaperScheme.intensityPct}% 1RM (same weight). ~${clusterTaperScheme.totalReps} reps, Frederick ~${Math.round(clusterTaperScheme.totalFrederickLoad)}, effective ~${clusterTaperHeuristic != null ? Math.round(clusterTaperHeuristic) : '?'} (w/ RPE drift).`);
  }
  if (taperedRepScheme) {
    parts.push(`Tapered sets: ${taperedRepScheme.description} — ~${taperedRepScheme.totalReps} reps, prescribed Frederick ~${Math.round(taperedRepScheme.totalFrederickLoad)} (capped), effective ~${taperedHeuristic != null ? Math.round(taperedHeuristic) : '?'} (w/ RPE drift).`);
  }
  if (myoRepScheme) {
    parts.push(`MYO-REP SESSION: ${myoRepScheme.description}. Hanley fatigue targets suspended for Myo-Rep exercises (fewer total reps, equivalent stimulus). Frederick metabolic load still applies.`);
  }

  return {
    sessionVolume,
    repScheme,
    intensityRange: { min: intMin, max: intMax },
    restRange,
    exerciseCount: { min: exerciseCountMin, max: exerciseCountMax },
    rationale: parts.join(' '),
    muscleGroupPriorities: Object.keys(muscleGroupPriorities).length > 0 ? muscleGroupPriorities : undefined,
    suggestedFocus,
    weeklyVolumeStatus: Object.keys(weeklyVolumeStatus).length > 0 ? weeklyVolumeStatus : undefined,
    metabolicLoadTarget,
    metabolicLoadZone,
    metabolicLoadPerSet,
    metabolicSetsPerExercise,
    fatigueScoreTarget,
    fatigueScoreZone,
    targetRepsPerExercise,
    peakForceDropRep,
    strengthSetDivision,
    taperedRepScheme: taperedRepScheme
      ? { ...taperedRepScheme, totalFrederickHeuristic: taperedHeuristic }
      : undefined,
    clusterTaperScheme: clusterTaperScheme
      ? { ...clusterTaperScheme, totalFrederickHeuristic: clusterTaperHeuristic }
      : undefined,
    lastSessionSetRPESummary: lastSetRPE?.summary,
    myoRepScheme,
  };
}
