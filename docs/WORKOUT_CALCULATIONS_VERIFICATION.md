# Workout Builder Calculations Verification

The app uses shared formulas for weight-from-1RM, tonnage, and plate loading. This doc and the verification script confirm that the numbers in a built workout match those formulas.

## Formulas (same as in `shared/utils.ts` and `shared/utils/plateCalculator.ts`)

- **Weight from % 1RM:** `Math.floor((oneRepMax * (percent / 100)) / 5) * 5` — rounds *down* to nearest 5 lbs.
- **Tonnage:** For each exercise, `sets × reps × weightLbs`; reps from `parseRepsToAverage(reps)` (e.g. `"10"` → 10, `"8-12"` → 10).
- **Plate loading:** 45 lb bar; plates per side to reach target (standard set: 45, 35, 25, 10, 5, 2.5).

## Example: JH session (High-Volume Density Push-Pull)

| Exercise              | Sets × Reps | Weight | Volume      |
|----------------------|-------------|--------|-------------|
| Barbell Bench Press  | 8 × 10      | 230 lbs @ 65% 1RM | 18,400 lbs |
| Barbell Bent Over Row| 7 × 12      | 185 lbs | 15,540 lbs  |
| **Total**            | **15 sets** |        | **33,940 lbs** |

### Checks

1. **Bench 230 lbs @ 65% 1RM**  
   With the round-down-to-5 rule, 230 is the result when Bench 1RM is **355 lbs** (or in a range that still rounds to 230). So the builder is using a Bench 1RM of 355 (or equivalent) for JH.

2. **Tonnage**  
   `8×10×230 + 7×12×185 = 18,400 + 15,540 = 33,940 lbs` — matches the session total.

3. **Reps**  
   Bench 80 reps, Row 84 reps — both in the "~80+ reps per exercise" target.

4. **How the 80-rep bench count was derived (Hanley Fatigue Metric)**  
   Total reps per exercise are prescribed by the **Hanley** reverse formula, then the builder chooses a set/rep split (e.g. 8×10) to hit that target.

   **Step 1 — Hanley formula (reverse):**  
   `Reps = TargetScore / (100 / (100 − Intensity))²`  
   Intensity = %1RM (e.g. 65 for bench). The target score is the midpoint of the goal's fatigue zone.

   **Step 2 — Hypertrophy inputs (from `optimizerEngine.ts`):**  
   - Fatigue target zone (hypertrophy): **530–730**  
   - Target score (midpoint): `(530 + 730) / 2 = **630**`  
   - Intensity range (hypertrophy): **60–75%** 1RM → midpoint **67.5%** (used for the Hanley calc when the exact exercise % isn't known yet).

   **Step 3 — Multiplier at 67.5%:**  
   `(100 / (100 − 67.5))² = (100 / 32.5)² ≈ **9.467**`

   **Step 4 — Base reps (before volume-tolerance scalar):**  
   `computedReps = 630 / 9.467 ≈ **66.5**`

   **Step 5 — Volume tolerance (above average = 4):**  
   `setsPerExScalar = 1.25`  
   `targetRepsPerExercise = round(66.5 × 1.25) = round(83.1) = **83**`

   So the optimizer prescribes **~83 total reps per exercise** for this session. The builder then chooses a set/rep layout: **8×10 = 80** for bench and **7×12 = 84** for row. Both are within the prescribed range; 80 is the chosen implementation for bench (round number of sets and reps).

**Was Frederick used to optimize reps per set?**  
Frederick (metabolic stress) is used in this session to prescribe **how many sets per exercise** (so total metabolic load per exercise lands in the 618–989 zone), and to report **estimated load per set** at a reference of **10 reps** and RPE 8. It does **not** solve for an optimal "reps per set" number. The **reps-per-set** values (10 for bench, 12 for row) come from the hypertrophy **rep scheme** (e.g. "3–4 sets × 8–12 reps") and the model's choice within that range; when there are only 1–2 exercises, the Hanley fatigue-cap can also suggest a reps-per-set by dividing target reps by sets. So: **Frederick → set count and metabolic load; reps per set → rep scheme + Hanley split (and model).**

**Frederick calculation for the bench workout (8×10 @ 65% 1RM, RPE 8)**  
Single-set metabolic load formula:  
`Load_set = Intensity × Σ(i=1→reps) e^(-0.215 × (RIR + reps - i))`  
with **RIR = 10 − RPE** (reps in reserve).

- **Inputs:** Intensity = **65** (% 1RM), Reps = **10**, RPE = **8** → RIR = **2**.
- **Sum (i = 1 to 10):**  
  `e^(-0.215×11) + e^(-0.215×10) + … + e^(-0.215×2)`  
  ≈ 0.0939 + 0.1165 + 0.1444 + 0.1790 + 0.2221 + 0.2754 + 0.3414 + 0.4232 + 0.5243 + 0.6505 ≈ **2.9708**.
- **Load per set:**  
  `65 × 2.9708 ≈ **193.10**` (metabolic load units).
- **Total for 8 sets:**  
  `8 × 193.10 ≈ **1545**` (per exercise).

Hypertrophy target per exercise in the optimizer is **618–989**; 1545 falls in the **High** zone (800–1099). So for this "high-volume density" session, the builder prioritized the Hanley total-rep target (~83) and a clean 8×10 layout, and the resulting Frederick total is above the nominal moderate–high band.

**Tapered sets (implemented):** For hypertrophy, the optimizer now prescribes a **tapered** set/rep structure so that (1) Hanley total reps are hit and (2) total Frederick load stays in the 618–989 zone. A few **lead** sets (e.g. 2–3×10 @ RPE 8) deliver high metabolic stimulus; **taper** sets (e.g. 8×7 @ RPE 6) use fewer reps per set and/or lower RPE so the session total Frederick stays in zone. The prompt receives this as a BINDING prescription; the builder lists lead sets first, then taper sets, per exercise. See `optimizerEngine.ts` → `prescribeTaperedSets` and the "TAPERED SETS" block in the generator prompt.

### Frederick and accrued fatigue (heuristic only)

The base Frederick formula treats each set in isolation: **no set-to-set fatigue**. In practice, later sets at the same load/reps feel harder (RPE drift). We use a single **heuristic**: effective RPE for set index *i* (0-based) = `prescribed_RPE + 0.15 × i`. The 0.15 value assumes 2–3 min rest between sets (near-full PCr recovery). Literature: ~0.3–0.5 drift at 60–90s rest, ~0.12–0.18 at 120–180s (Helms et al.; Schoenfeld inter-set recovery).

- **Tapered cap:** The solver caps on the **no-fatigue** (prescribed) Frederick total ≤ 989. This is the "on paper" load. The heuristic total is **display-only** — it shows the coach/athlete the estimated true load once RPE drift is accounted for.
- **Display:** `taperedRepScheme.totalFrederickHeuristic` and the rationale show the effective (fatigue-aware) total alongside the prescribed total (e.g. "prescribed Frederick ~800, effective ~1200 w/ RPE drift").
- **Why not cap on heuristic?** With ~83 target reps (11+ sets), the +0.35 per set drift makes the heuristic total 50–70% higher than prescribed. Capping on heuristic would make it impossible to find any valid taper — the solver returns null and falls through to uniform sets, which is worse.
- Implementation: `shared/services/accruedFatigueModel.ts` (`effectiveRPEHeuristic`, `taperedFrederickTotals`); used in `optimizerEngine.ts` for display alongside the tapered recommendation.

5. **Plates**  
   - 230 lbs: 45 + 45 + 2.5 per side (230 lbs).  
   - 185 lbs: 45 + 25 per side (185 lbs).

## Block Focus slider: how it affects workouts

The **Block Focus** slider (0 = hypertrophy, 100 = strength) sets `goalBias` on the active training block. When generating a workout, that value is mapped to a **training goal** that drives the optimizer and prompts.

### Slider to goal mapping (`App.tsx`)

- **Bias < 30** → `trainingGoalFocus = 'hypertrophy'`
- **Bias > 64** → `trainingGoalFocus = 'strength'`
- **30 <= bias <= 64** → `trainingGoalFocus = 'general'`

The numeric bias value is also passed directly to the AI as context (e.g. "Strength-biased (75/100)") and to the optimizer to select set structure.

### Set structure across the slider (metabolic taper / cluster-taper / peak force)

The optimizer uses `effectiveGoal` plus the raw `goalBias` value to decide **what** to optimize and **how** to structure sets:

| Slider zone | effectiveGoal | Set structure | Description |
|-------------|---------------|---------------|-------------|
| **0-29** | hypertrophy | **Metabolic taper** | Frederick (618-989) + Hanley. Lead sets at high metabolic load (RPE 8), taper sets at lower RPE. Intensity from Epley (e.g. 10 @ RPE 8 = ~71%). |
| **30-49** | general | **Metabolic taper** | Same taper structure, general targets: Frederick 495-865, Hanley 400-550. Mid rep typical = 8. |
| **50-64** | general | **Cluster-Taper hybrid** | Same Hanley + Frederick targets as general, but sets split into a **force block** (peak-force capped, 2.5-3 min rest) then a **metabolic block** (past force drop, ~90 s rest). Same weight, intensity 68-78%. See details below. |
| **65-100** | strength | **Peak force** | Hanley prescribes total reps, divided by peak-force drop-off (e.g. 4x5 @ 85%, 3-5 min rest). No taper. Intensity 80-92%. |

So there are **four** set-structure modes:

- **Metabolic taper** (bias 0-49): Frederick + Hanley drive volume; lead sets at high metabolic load, taper at lower RPE.
- **Cluster-Taper hybrid** (bias 50-64): Force block (quality reps within peak-force zone) + metabolic block (pump sets past the force drop). Both at the same weight.
- **Peak force** (bias 65-100): Pure peak-force set division. No metabolic targeting.

### Cluster-Taper hybrid (bias 50-64)

When the slider is in the 50-64 range, each compound exercise gets two blocks at the **same weight**:

1. **Force block** (first): 2-3 sets at the peak-force drop rep count. Every rep is explosive, within >= 95% peak force. RPE ~4-5. Rest 2.5-3 min.
2. **Metabolic block** (second): reps go past the force drop-off. RPE ~6-7. Rest ~90 s.

The solver picks intensity in the **68-78%** band. Below 68% peak-force-capped sets are too easy (RPE ~2-3) for Frederick to be met; above 78% it's pure-strength territory.

**Example at 70% 1RM (bias 55):**

| Block | Sets x Reps | RPE | Frederick/set | Rest |
|-------|-------------|-----|---------------|------|
| Force | 3 x 7 | ~4.1 | ~80 | 2.5 min |
| Metabolic | 3 x 10 | ~7.1 | ~170 | 1.5 min |
| **Total** | **6 sets, ~51 reps** | | **~750** (general target 495-865) | |

**Example at 73% 1RM (bias 60):**

| Block | Sets x Reps | RPE | Frederick/set | Rest |
|-------|-------------|-----|---------------|------|
| Force | 3 x 6 | ~4.5 | ~85 | 3 min |
| Metabolic | 3 x 9 | ~7.0 | ~155 | 1.5 min |
| **Total** | **6 sets, ~45 reps** | | **~720** | |

This is analogous to **contrast training** ("heavy-then-pump"): the force block provides high-quality mechanical tension, the metabolic block accumulates metabolic stress. The AI outputs force and metabolic blocks as **separate exercise cards**.

Implementation: `optimizerEngine.ts` -> `prescribeClusterTaperSets()`, heuristic fatigue via `accruedFatigueModel.ts` -> `clusterTaperFrederickTotals()`.

### Intensity, rest, and volume across the slider

From `GOAL_PROFILES` in `optimizerEngine.ts`:

| Goal | Intensity (% 1RM) | Rep scheme | Rest | Volume multiplier |
|------|-------------------|------------|------|-------------------|
| hypertrophy | 60-75 | 3-4 sets x 8-12 reps | 60-120 s | 1.15 |
| general | 65-80 | 3-4 sets x 6-10 reps | 90-150 s | 1.0 |
| strength | 80-92 | 4-6 sets x 3-5 reps | 180-300 s | 0.85 |

As the slider moves from hypertrophy to strength:

- **Intensity increases**: 60-75% -> 65-80% -> 80-92%.
- **Reps per set decrease**: 8-12 -> 6-10 -> 3-5.
- **Rest increases**: ~1-2 min -> ~1.5-2.5 min -> 3-5 min.
- **Volume multiplier**: slightly higher in hypertrophy (1.15), slightly lower in strength (0.85).

The **switch points** are at bias **30** (hypertrophy -> general), **50** (metabolic taper -> cluster-taper hybrid), and **64** (general -> strength/peak force).

---

## Run the verification script

Uses the same logic as the app and prints the above checks:

```bash
node scripts/verify-workout-calculations.mjs
```

You can edit the `session` object in that script to verify another workout.
