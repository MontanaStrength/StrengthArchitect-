# Periodization Phases: Research Summary & UI Recommendations

## 1. Research summary: optimal number and names

### 1.1 Core model (Verkhoshansky / block periodization)

The standard **block periodization** model uses **three phases**:

| Phase | Alternative names | Focus | Typical intensity | Volume | Duration |
|-------|-------------------|--------|-------------------|--------|----------|
| **1. Accumulation** | Base, General prep | Work capacity, muscle, general strength | 55–70% 1RM | High | 3–6 weeks |
| **2. Transmutation** | **Intensification**, Build, Conversion | Convert base into sport-specific strength | 75–90% 1RM | Moderate | 2–4 weeks |
| **3. Realization** | **Peaking**, Competition, Taper | Peak performance, reduce fatigue | Maintained heavy, lower volume | Low | 7–10 days to ~3 weeks |

- **Transmutation** = formal term (transforms general fitness into sport-specific ability).  
- **Intensification** = same idea, commonly used in strength/powerlifting coaching and is more intuitive for lifters.

So for barbell training, **3 phases** are the evidence-based minimum. A **4th phase** is often added:

| Phase 4 (optional) | Role |
|--------------------|------|
| **Deload / Restoration** | Recovery, reduced load (e.g. 50–60% 1RM), often 1 week at end or between blocks. |

### 1.2 User-facing vs scientific naming

- **Scientific / formal:** Accumulation → Transmutation → Realization (optional: Deload).  
- **User-friendly for barbell:** Hypertrophy / Base → Strength / Build → Peaking / Peak (optional: Deload).

Many programs use the simpler set: **Hypertrophy → Strength → Peaking** (with optional Deload). Your app already supports both vocabularies:

- **Formal:** `Accumulation`, `Intensification` (≈ Transmutation), `Realization`, `Deload`
- **User-friendly:** `Hypertrophy`, `Strength`, `Peaking`, `Deload`

Recommendation: keep both; use **user-friendly names in the UI** (Hypertrophy, Strength, Peaking, Deload) and map them to the same underlying phase types and presets.

### 1.3 Typical phase lengths (mesocycles)

- **Per phase:** Usually **2–6 weeks**; realization/peaking **1–3 weeks**.
- **Total block:** **8–16 weeks** common (e.g. 8-week linear, 12-week meet prep).
- **Realization:** Short taper 7–10 days; longer taper up to ~3 weeks if fatigue is high.

So for an **8-week block** with three focuses (e.g. hypertrophy, strength, peaking), a typical split is something like **3–4 weeks / 3–4 weeks / 1–2 weeks** (with optional 1-week deload replacing part of the last segment or added at the end).

---

## 2. Optimal number of phases for the app

- **Minimum:** **3 phases** (accumulation/base → intensification/strength → realization/peak).  
- **Common:** **3 or 4** (add Deload at end or between blocks).  
- **Flexible:** Allow **3–5 phases** so users can add a second strength block or an extra deload.

So the app should support at least **3 phases**, with optional **4th (and optionally 5th)** for deload or extra blocks. Your current `TrainingPhase` enum and `TrainingBlockPhase` already support an arbitrary list of phases; the constraint is only in the UI (single-focus slider vs multi-phase).

---

## 3. Phase names to use in the UI

Recommended **display names** for a phase selector or multi-point slider:

| Value | Display name | Short (for slider labels) |
|-------|--------------|---------------------------|
| Hypertrophy | Hypertrophy | Size / Hyp |
| Accumulation | Accumulation (or "Volume block") | Vol |
| Strength | Strength | Str |
| Intensification | Intensification (or "Build") | Build |
| Realization | Realization (or "Peak block") | Peak |
| Peaking | Peaking | Peak |
| Deload | Deload | Deload |

For a **simple multi-focus block** (e.g. 8 weeks), a minimal set is enough:

- **Hypertrophy** (or Accumulation)
- **Strength** (or Intensification)
- **Peaking** (or Realization)
- **Deload** (optional)

So the **optimal names** for a phase slider with 3–4 segments are: **Hypertrophy → Strength → Peaking**, and optionally **Deload**. Under the hood these can map to your existing `TrainingPhase` and `PHASE_PRESETS`.

---

## 4. UI options: phase slider vs multi-point slider

### Option A: Single “phase sequence” preset (simplest)

- User picks **block length** (e.g. 8 weeks) and **one preset**: e.g. “Hypertrophy → Strength → Peak”.
- App fills `phases` with fixed week splits (e.g. 3 / 3 / 2 or 4 / 3 / 1).
- **Pros:** One click, no slider. **Cons:** No custom week splits.

### Option B: Multi-point “phase breakpoints” slider (recommended)

- One slider **per block length** (e.g. 8 weeks). The slider has **2 or 3 draggable breakpoints** that divide the block into 3 or 4 segments.
- Example (8 weeks, 3 phases):
  - Breakpoint 1 at **week 3** (weeks 1–3 = Hypertrophy).
  - Breakpoint 2 at **week 6** (weeks 4–6 = Strength).
  - Weeks 7–8 = Peaking.
- Each **segment** gets a **phase label** (Hypertrophy / Strength / Peaking / Deload). Labels can be fixed for the preset (e.g. “Hypertrophy → Strength → Peak”) or chosen per segment.
- **Pros:** User controls exact week splits; one control for the whole block. **Cons:** Slightly more complex than a single preset.

### Option C: Phase list builder

- User adds **phases in order** (e.g. Phase 1: Hypertrophy, 3 weeks; Phase 2: Strength, 3 weeks; Phase 3: Peaking, 2 weeks). Total weeks must match block length.
- **Pros:** Maximum flexibility. **Cons:** More UI and validation (sum of weeks = length).

### Recommendation

- Start with **Option B (multi-point slider)** for an 8-week (or 4–12 week) block:
  - **2 breakpoints** → 3 phases (e.g. Hypertrophy | Strength | Peaking).
  - Optional **3rd breakpoint** → 4 phases (e.g. add Deload at the end).
- Use **optimal names** in the UI: **Hypertrophy, Strength, Peaking**, and optionally **Deload**.
- Store result as `block.phases` (array of `TrainingBlockPhase` with `phase` + `weekCount`). Your existing training-context logic (current phase by week) already consumes this.

---

## 5. Mapping UI to existing code

- **Phase names:** Keep using `TrainingPhase` enum; in the slider UI show: Hypertrophy, Strength, Peaking, (Deload). For “Accumulation” and “Intensification,” either expose as alternatives or map: e.g. “Volume block” → `Accumulation`, “Build” → `Intensification`.
- **Presets:** When user picks “Hypertrophy → Strength → Peak” with breakpoints at 3 and 6 for 8 weeks, build:
  - `{ phase: HYPERTROPHY, weekCount: 3, ... }`
  - `{ phase: STRENGTH, weekCount: 3, ... }`
  - `{ phase: PEAKING, weekCount: 2, ... }`
- Use `PHASE_PRESETS` and existing `TrainingBlockPhase` fields (`sessionsPerWeek`, `splitPattern`, etc.) for defaults so the optimizer and prompt get the right `phaseName`, `intensityFocus`, `volumeFocus`, `primaryArchetypes` per week.

---

## 6. References (conceptual)

- Block periodization: Accumulation, Transmutation, Realization (Verkhoshansky; e.g. Sportlyzer Academy, Hevy Coach).
- Phase lengths and residuals: 2–6 weeks per block, realization 7–10 days to ~3 weeks (Hevy Coach, TrainingPeaks, NSCA-style programming).
- “Intensification” as common strength-coaching term for the middle block (Transmutation).
- Hypertrophy / Strength / Peaking as user-facing names in many barbell and powerlifting programs.
