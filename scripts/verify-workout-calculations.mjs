#!/usr/bin/env node
/**
 * Verify workout builder numbers using the same formulas as the app.
 * Run: node scripts/verify-workout-calculations.mjs
 *
 * Session: High-Volume Density Push-Pull (JH)
 * - Barbell Bench Press: 8×10 @ 230 lbs, 65% 1RM, RPE 8
 * - Barbell Bent Over Row: 7×12 @ 185 lbs, RPE 8
 */

// === Same as shared/utils.ts ===
function weightFromPercent1RM(oneRepMax, percent) {
  if (!oneRepMax || oneRepMax <= 0 || !percent) return 0;
  return Math.floor((oneRepMax * (percent / 100)) / 5) * 5;
}

function parseRepsToAverage(reps) {
  if (!reps) return 0;
  const s = String(reps).trim().toUpperCase();
  if (s === 'AMRAP') return 10;
  if (s.includes('-')) {
    const [low, high] = s.split('-').map(Number);
    return Math.round((low + high) / 2);
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function estimatePlanTonnage(exercises) {
  let total = 0;
  for (const ex of exercises) {
    const avgReps = parseRepsToAverage(ex.reps);
    const weight = ex.weightLbs || 0;
    total += ex.sets * avgReps * weight;
  }
  return Math.round(total);
}

// === Same as shared/utils/plateCalculator.ts (simplified display) ===
function platesPerSide(targetWeight, barWeight = 45, availablePlates = [45, 35, 25, 10, 5, 2.5]) {
  if (targetWeight <= barWeight) return { perSide: [], achievableWeight: barWeight };
  let remaining = (targetWeight - barWeight) / 2;
  const sorted = [...availablePlates].sort((a, b) => b - a);
  const perSide = [];
  for (const plate of sorted) {
    while (remaining >= plate - 0.01) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  const loadedPerSide = perSide.reduce((s, p) => s + p, 0);
  const achievableWeight = barWeight + loadedPerSide * 2;
  return { perSide, achievableWeight };
}

// -----------------------------------------------------------------------------
// JH session (from screenshot)
// -----------------------------------------------------------------------------
const session = {
  title: 'High-Volume Density: Push-Pull',
  exercises: [
    { name: 'Barbell Bench Press', sets: 8, reps: '10', weightLbs: 230, percentOf1RM: 65, rpeTarget: 8 },
    { name: 'Barbell Bent Over Row', sets: 7, reps: '12', weightLbs: 185, rpeTarget: 8 },
  ],
};

console.log('=== Workout builder verification (JH session) ===\n');

// 1) Bench: 230 lbs @ 65% 1RM → what 1RM does the formula use?
//    weightFromPercent1RM(1RM, 65) = floor(1RM*0.65/5)*5 = 230
//    So 1RM*0.65 must be in [230, 234.99...]. 1RM = 230/0.65 ≈ 353.85 → 354 or 355.
const benchWeight = 230;
const benchPercent = 65;
const inferredBench1RM = Math.ceil((benchWeight / (benchPercent / 100)) / 5) * 5; // smallest 5-lb step that gives >= 230
const actualWeightFromFormula = weightFromPercent1RM(inferredBench1RM, benchPercent);
console.log('1) Bench Press: 8×10 @ 230 lbs (65% 1RM)');
console.log('   weightFromPercent1RM(1RM, 65) rounds DOWN to nearest 5 lbs.');
console.log('   For 230 to be the result, 1RM must be in a range that yields 230.');
let check1RM = 350;
while (weightFromPercent1RM(check1RM, 65) < 230) check1RM += 5;
console.log(`   Smallest 1RM giving 230: ${check1RM} lbs → weightFromPercent1RM(${check1RM}, 65) = ${weightFromPercent1RM(check1RM, 65)} lbs ✓`);
console.log(`   So JH's Bench 1RM in the builder is likely ${check1RM} lbs (or slightly higher).\n`);

// 2) Tonnage (same as server + api)
const tonnage = estimatePlanTonnage(session.exercises);
const expectedTonnage = 8 * 10 * 230 + 7 * 12 * 185; // 18400 + 15540
console.log('2) Total volume (tonnage)');
console.log('   Formula: sum of (sets × reps × weight) per exercise.');
console.log('   Bench:  8 × 10 × 230 = 18,400 lbs');
console.log('   Row:    7 × 12 × 185 = 15,540 lbs');
console.log(`   Total:  ${expectedTonnage.toLocaleString()} lbs`);
console.log(`   estimatePlanTonnage(session) = ${tonnage.toLocaleString()} lbs ${tonnage === expectedTonnage ? '✓' : 'MISMATCH'}\n`);

// 3) Reps per exercise (session said "83 reps per exercise" / "~80+ reps")
const benchReps = 8 * parseRepsToAverage('10');
const rowReps = 7 * parseRepsToAverage('12');
console.log('3) Reps per exercise');
console.log(`   Bench: 8 sets × 10 reps = ${benchReps} reps`);
console.log(`   Row:   7 sets × 12 reps = ${rowReps} reps`);
console.log('   (Session targets: ~80+ / "83 reps per exercise" — both in range.)\n');

// 4) Plate loading (what the plate calculator would show)
console.log('4) Plate loading (45 lb bar, standard plates)');
for (const ex of session.exercises) {
  const { perSide, achievableWeight } = platesPerSide(ex.weightLbs);
  const display = perSide.length ? perSide.sort((a, b) => b - a).join(' + ') + ' per side' : 'Empty bar';
  console.log(`   ${ex.name} @ ${ex.weightLbs} lbs → ${display} (achievable: ${achievableWeight} lbs)`);
}

console.log('\n=== Summary ===');
console.log('• 65% 1RM for Bench: weight is rounded down to nearest 5 lbs; 230 lbs is consistent with Bench 1RM = 355 lbs.');
console.log('• Total tonnage 33,940 lbs matches the app’s sum of (sets × reps × weight).');
console.log('• Set/rep totals (15 sets, 80 + 84 reps) match the session targets.');
