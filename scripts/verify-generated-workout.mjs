#!/usr/bin/env node
/**
 * Run the numbers for a generated workout: tonnage, Frederick (no fatigue + heuristic), zone.
 * Usage: node scripts/verify-generated-workout.mjs
 *
 * Workout from screenshot: Deadlift 8×10 @ 285 lbs 60% RPE 7.5, Front Squat 7×11 @ 185 lbs 60% RPE 8.
 */

// Same Frederick formula as optimizerEngine.ts
function calculateSetMetabolicLoad(intensityPct, reps, rpe) {
  const rir = Math.max(0, 10 - rpe);
  let load = 0;
  for (let i = 1; i <= reps; i++) {
    load += Math.exp(-0.215 * (rir + reps - i));
  }
  return intensityPct * load;
}

// Heuristic: effective RPE = prescribed + 0.35 * setIndex (0-based)
function effectiveRPE(setIndex, prescribedRPE) {
  return Math.min(10, Math.max(1, prescribedRPE + 0.35 * setIndex));
}

function zone(load) {
  if (load < 500) return 'light';
  if (load < 650) return 'moderate';
  if (load < 800) return 'moderate-high';
  if (load < 1100) return 'high';
  return 'extreme';
}

// --- Workout from image ---
const deadlift = { sets: 8, reps: 10, weight: 285, intensityPct: 60, rpe: 7.5 };
const frontSquat = { sets: 7, reps: 11, weight: 185, intensityPct: 60, rpe: 8 };

console.log('=== Generated workout verification ===\n');

// 1) Tonnage
const tonnageDL = deadlift.sets * deadlift.reps * deadlift.weight;
const tonnageFS = frontSquat.sets * frontSquat.reps * frontSquat.weight;
const totalTonnage = tonnageDL + tonnageFS;
console.log('1) Tonnage');
console.log('   Deadlift:  8 × 10 × 285 =', tonnageDL, 'lbs');
console.log('   Front Squat: 7 × 11 × 185 =', tonnageFS, 'lbs');
console.log('   Total:', totalTonnage, 'lbs', totalTonnage === 37045 ? '✓' : '(stated 37,045)');
console.log('');

// 2) Frederick per exercise — NO FATIGUE (prescribed RPE every set)
const dlNoFatiguePerSet = calculateSetMetabolicLoad(deadlift.intensityPct, deadlift.reps, deadlift.rpe);
const dlNoFatigueTotal = dlNoFatiguePerSet * deadlift.sets;
const fsNoFatiguePerSet = calculateSetMetabolicLoad(frontSquat.intensityPct, frontSquat.reps, frontSquat.rpe);
const fsNoFatigueTotal = fsNoFatiguePerSet * frontSquat.sets;
console.log('2) Frederick metabolic load — NO FATIGUE (prescribed RPE each set)');
console.log('   Deadlift:   per set', dlNoFatiguePerSet.toFixed(2), '× 8 =', dlNoFatigueTotal.toFixed(2), '→', zone(dlNoFatigueTotal));
console.log('   Front Squat: per set', fsNoFatiguePerSet.toFixed(2), '× 7 =', fsNoFatigueTotal.toFixed(2), '→', zone(fsNoFatigueTotal));
console.log('   Target zone per exercise: 618–989 (moderate–high)');
console.log('');

// 3) Frederick per exercise — HEURISTIC (effective RPE = prescribed + 0.35 × set index)
let dlHeuristicTotal = 0;
let fsHeuristicTotal = 0;
for (let i = 0; i < deadlift.sets; i++) {
  const effRPE = effectiveRPE(i, deadlift.rpe);
  dlHeuristicTotal += calculateSetMetabolicLoad(deadlift.intensityPct, deadlift.reps, effRPE);
}
for (let i = 0; i < frontSquat.sets; i++) {
  const effRPE = effectiveRPE(i, frontSquat.rpe);
  fsHeuristicTotal += calculateSetMetabolicLoad(frontSquat.intensityPct, frontSquat.reps, effRPE);
}
console.log('3) Frederick metabolic load — HEURISTIC (effective RPE = prescribed + 0.35 × set index)');
console.log('   Deadlift:   total', dlHeuristicTotal.toFixed(2), '→', zone(dlHeuristicTotal));
console.log('   Front Squat: total', fsHeuristicTotal.toFixed(2), '→', zone(fsHeuristicTotal));
console.log('   Cap used in solver: heuristic total ≤ 989 per exercise');
console.log('');

// 4) Verdict
console.log('4) Verdict');
const cap = 989;
const overCapDL = dlHeuristicTotal > cap;
const overCapFS = fsHeuristicTotal > cap;
if (overCapDL || overCapFS) {
  console.log('   ⚠ Both exercises EXCEED the 989 heuristic cap:');
  if (overCapDL) console.log('     Deadlift heuristic:', dlHeuristicTotal.toFixed(0), '> 989');
  if (overCapFS) console.log('     Front Squat heuristic:', fsHeuristicTotal.toFixed(0), '> 989');
  console.log('   This workout has UNIFORM sets (8×10, 7×11), not a tapered prescription.');
  console.log('   So either: (a) no tapered scheme was returned for this block, or (b) the generator');
  console.log('   produced uniform sets instead of the prescribed taper. Either way, the heuristic');
  console.log('   totals are above the intended zone.');
} else {
  console.log('   Heuristic totals within cap (≤989) for both exercises.');
}
console.log('');
console.log('5) Hanley reps');
console.log('   Deadlift:  8 × 10 = 80 reps (target ~83)');
console.log('   Front Squat: 7 × 11 = 77 reps (target ~83)');
console.log('   Both close to ~83 reps per exercise ✓');
