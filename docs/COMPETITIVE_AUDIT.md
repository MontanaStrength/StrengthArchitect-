# Competitive Audit: Strength Architect vs. Leading Strength Apps

Comparison of Strength Architect (SA) against top-tier strength training apps (Sheiko Gold, Juggernaut AI, and related products) across **user experience**, **AI integration**, and **training logic**. Gaps are framed as opportunities.

---

## 1. User Experience Gaps

### 1.1 Pre-workout check-in depth
| SA today | Leaders (Sheiko, Juggernaut) |
|----------|-------------------------------|
| Readiness: 3 levels (Low / Medium / High). Optional check-in: mood, soreness, nutrition (free text or structured). | Structured daily check-ins: sleep hours/quality, stress, nutrition, **HRV**, optional body fat %. Sheiko uses a **30-day observation period** before full personalization. |

**Gap:** SA does not use **HRV** or **sleep data** (even though sleep is tracked in Analyze) to modulate today’s prescription. Readiness is coarse (3 levels) and not tied to numeric recovery metrics.

**Opportunity:** Use last night’s sleep and, if available, HRV from Tracking to scale session volume/intensity (e.g. low HRV → readiness scalar down). Consider an optional “first 2–4 weeks = calibration” mode that collects more check-in data before aggressive prescriptions.

### 1.2 In-session experience
| SA today | Leaders |
|----------|---------|
| Rest timer (fixed duration). Log sets: reps, weight, optional per-set RPE. Session RPE at end. Swap exercise → full rebuild. | **Adaptive rest**: Sheiko uses PCr-based rest (timer/color reflects estimated recovery). **Intra-session adjustments**: Juggernaut adjusts next sets based on “how the last set felt” (e.g. RPE 9 → drop weight or reduce sets). |

**Gap:** No **intra-session autoregulation**. The plan is fixed at “Generate”; there is no “last set was RPE 9 → suggest -5% for next sets” or “add/drop a set” during the workout. Rest is a single fixed duration, not adaptive to set difficulty or readiness.

**Opportunity:** Add optional “how did that set feel?” (RPE/RIR) after each set and use it to suggest weight/rep changes for remaining sets (and/or feed into next session). Consider an adaptive rest timer (e.g. longer after hard sets, shorter after warm-ups).

### 1.3 Exercise demos and cues
| SA today | Leaders |
|----------|---------|
| Exercise library with **text cues** per exercise. `videoUrl` exists in the type but is not populated. | Juggernaut: **300+ exercise videos** with coaching cues. In-app demos are a core part of UX. |

**Gap:** No exercise **videos** in-app. Cues are strong; video would improve clarity and adherence, especially for beginners and new movements.

**Opportunity:** Populate `videoUrl` (e.g. from a curated CDN or embed) for at least the main compounds and common accessories. Keep cues as the primary in-session reminder.

### 1.4 Warm-up and meet-day tools
| SA today | Leaders |
|----------|---------|
| Prompts tell the AI to include 2–3 warm-up sets (e.g. bar → 50% → 70%). No dedicated warm-up **calculator** or step-by-step in the UI. Goal event/date on blocks; no dedicated **meet/peak** flow. | Juggernaut: **Warm-up planner**, **Meet Day Advisor** (openers, attempt selection, taper). Sheiko: flexible scheduling and load management for competition. |

**Gap:** Warm-ups are left to the AI and not surfaced as a clear, editable sequence. No dedicated **peaking/meet advisor** (openers, RPE-based attempts, taper checklist).

**Opportunity:** Add a warm-up calculator (e.g. bar → 50% → 70% of working weight, steps shown per exercise). For strength/peaking blocks, add a “Meet / test day” helper: suggest openers, second/third attempts, and a short taper checklist.

### 1.5 Schedule flexibility and “catch-up”
| SA today | Leaders |
|----------|---------|
| Blocks define phases and sessions per week; calendar shows planned sessions. Each session is **generated on demand**. Missed days are not explicitly rescheduled. | Sheiko: **1–14 sessions/week**, adapts to changing schedule and missed sessions. Juggernaut: schedule and frequency are inputs; programming adapts. |

**Gap:** If the user skips a day, the next “Generate” is just the next session in context; there is no explicit “reschedule” or “catch up this week” logic. Block structure is phase-based but not explicitly week-by-week periodized in the UI (e.g. “Week 2 of Strength phase”).

**Opportunity:** When generating, consider “sessions done this week” vs “sessions planned” and optionally adjust volume (e.g. 2 missed → slightly higher next session or explicit “make-up” note). Expose “Week X of Y” for the active block more prominently in Plan/Lift.

---

## 2. AI Integration Gaps

### 2.1 Autoregulation at multiple time scales
| SA today | Leaders (e.g. Juggernaut) |
|----------|----------------------------|
| **Session-to-session**: History (and block context) drives optimizer → next workout. RPE trend (last 5 sessions), hard sessions in 7d, and feedback (thumbs + comment) are passed to the AI. **Block-level**: Phase (e.g. accumulation, strength) sets archetypes and focus. | Explicit **pre-session**, **intra-session**, **session-to-session**, **week-to-week**, **block-to-block**, and **program-level** adjustments. Readiness and “how the last set felt” drive real-time and next-session changes. |

**Gap:** No **intra-session** AI (mid-workout suggestions). **Week-to-week** is implicit (history + phase), not an explicit “Week 2 volume progression” model. **Program-level** is only via block design, not an AI that suggests block length or phase changes.

**Opportunity:** Add an intra-session loop: after each set (or each exercise), optional “RPE/RIR” → suggest weight/reps for next set(s) and persist for next session. Consider explicit week-in-block signals (e.g. “Week 2 of 4, moderate volume”) in the prompt. Longer term: optional “block advisor” (e.g. “consider deload” or “consider moving to intensification”).

### 2.2 Use of set-level data
| SA today | Leaders |
|----------|---------|
| **Session RPE** and **session-level** aggregates (hard sessions, tonnage, set count) feed the optimizer. **Per-set** data (reps, weight, RPE) is stored in `completedSets` but **not** used in the optimizer or prompt for next session. Feedback (thumbs + comment) is in the history string for the AI. | Set-level RPE/velocity is used to adjust **next set** and **next session** (e.g. “last set was 9 → reduce load next time”). |

**Gap:** Rich set-level RPE is captured but not used for **autoregulation**. Only session RPE and binary “hard session” logic affect the next prescription.

**Opportunity:** Use last session’s **set-level RPE** (e.g. “sets 2–4 were RPE 9+”) to nudge the optimizer (e.g. lower intensity or volume for that movement next time). Pass a short summary into the prompt (e.g. “Last bench sets were all RPE 8.5–9”).

### 2.3 Personalization and calibration
| SA today | Leaders |
|----------|---------|
| Personalization from **day one** using whatever history exists. Volume tolerance (1–5) and block focus (slider) are user-set. Fatigue targets (e.g. Hanley 400–600) are **goal-based**, not per-athlete. | Sheiko: **30-day observation** before full personalization. Juggernaut: **Individualized volume landmarks** (MRV/MEV-style) and recovery-based frequency. |

**Gap:** No structured **calibration period**. Volume and fatigue are not estimated from the athlete’s own response (e.g. recovery from high-load weeks). Targets are fixed by goal, not by individual recovery data.

**Opportunity:** Optional “calibration” mode: for 2–4 weeks, emphasize data collection (session RPE, set RPE, readiness, sleep) and then derive a simple “volume ceiling” or scaling factor. Use that to cap or scale the current Hanley/Frederick targets so they are athlete-specific, not only goal-specific.

### 2.4 Weak-point and exercise selection
| SA today | Leaders |
|----------|---------|
| **Muscle group priorities** (under-trained patterns) from optimizer; **exercise selection engine** (rotation, frequency, OLAD/main lift). Swap + rebuild. No explicit “weak point” (e.g. lockout, off-chest). | Juggernaut: **Weak-point targeting** (e.g. mid-range bench) and exercise suggestions to address them. |

**Gap:** No **powerlifting-style weak-point** model (sticking point, lift phase). Exercise selection is pattern- and frequency-based, not “weak point → these exercises.”

**Opportunity:** Allow user (or block) to set “weak point” per lift (e.g. “bench: off chest”). Pass that into the prompt and exercise selection so the AI prefers variations and accessories that target that phase (e.g. pause bench, board press). Can stay simple (dropdown per main lift).

---

## 3. Training Logic Gaps

### 3.1 Velocity-based training (VBT)
| SA today | Leaders |
|----------|---------|
| Prescription is **%1RM and RPE** only. No bar velocity or external hardware. | Sheiko: **VELOS-ID** (or similar) integration for bar velocity; rep-by-rep feedback and load adjustment. |

**Gap:** No **VBT**. All autoregulation is RPE and percentage-based.

**Opportunity:** If you add hardware later, reserve a “velocity target” or “velocity drop-off” field in the model. For now, documenting that SA is RPE/%1RM-based sets clear expectations; no change required unless you pursue VBT.

### 3.2 Rest and recovery modeling
| SA today | Leaders |
|----------|---------|
| **Fixed** rest per exercise/set (from AI or defaults). Rest **timer** is user-started; no physiological model. Frederick and accrued fatigue are **session-level** (RPE drift heuristic). | Sheiko: **PCr-based rest** (timer reflects estimated phosphocreatine resynthesis); color/UI adapts so rest is longer when needed. |

**Gap:** Rest is not **adaptive** to set difficulty or recovery. No physiological rest model (e.g. PCr, HRV).

**Opportunity:** At least **recommend** rest by intensity (e.g. 3–5 min for 85%+, 90 s for hypertrophy), and show that in the session UI. Optional: simple “adaptive” rest (e.g. after a set marked RPE 8+, suggest 3 min; after RPE 6, suggest 90 s) without full PCr modeling.

### 3.3 Deload and overreaching
| SA today | Leaders |
|----------|---------|
| **Auto-deload** (e.g. after N consecutive weeks). **RPE trend** (rising/high) reduces volume. Low readiness reduces reps. | Similar ideas; often combined with **planned** deloads and **overreaching** blocks (e.g. 1–2 hard weeks then deload). |

**Gap:** Deload is **reactive** (triggered by history). No explicit **planned** deload in the block (e.g. “Week 4 = deload”) or overreaching prescription (e.g. “Week 2–3 push volume, Week 4 back off”).

**Opportunity:** In the block wizard, allow a **planned deload week** (e.g. every 4th week) so the phase plan includes it. Keep auto-deload as a safety net. Optionally add “overreaching” as a phase or a 1–2 week tag that justifies a following deload.

### 3.4 Intensity and volume landmarks
| SA today | Leaders |
|----------|---------|
| **Goal-based** intensity bands (e.g. strength 80–92%, hypertrophy 60–75%) and **fixed** Hanley/Frederick targets (e.g. 400–600). **Volume tolerance** (1–5) scales sets/reps. | Juggernaut: **Individualized** volume landmarks (e.g. MRV/MEV) from data; frequency and volume adapt to recovery. |

**Gap:** Targets are **not** derived from the athlete’s own response. Everyone with “general” gets the same Hanley band; only a scalar (volume tolerance) varies.

**Opportunity:** Use calibration or history to estimate a **personal** volume ceiling (e.g. “above 25 sets/week at 80%+, session RPE trends up”). Scale or cap the existing Hanley/Frederick targets by that ceiling so prescriptions stay within individual recovery.

---

## 4. Summary: Highest-impact opportunities

1. **Intra-session autoregulation** — “How did that set feel?” → suggest weight/reps for remaining sets and feed into next session.
2. **Use set-level RPE** — Use last session’s per-set RPE in the optimizer and in the AI prompt (e.g. “last bench was RPE 9 across sets → moderate next time”).
3. **Pre-workout + recovery** — Use sleep (and HRV if available) for readiness; optional calibration period and athlete-specific volume caps.
4. **Exercise videos** — Populate `videoUrl` for main exercises; keep cues as the primary in-session aid.
5. **Warm-up and meet-day** — Warm-up calculator in UI; optional meet/test-day advisor (openers, taper).
6. **Adaptive rest** — Rest suggestions by intensity/RPE; optional adaptive rest timer.
7. **Planned deload and block structure** — Deload week in block design; clearer “Week X of Y” and optional overreaching.
8. **Weak-point targeting** — Simple weak-point (per lift) → prompt + exercise selection.

Strength Architect already stands out with **transparent, evidence-based logic** (Hanley, Frederick, peak-force, cluster-taper) and a **coach mode**. Closing the gaps above would align UX and AI more closely with Sheiko Gold and Juggernaut AI while keeping SA’s distinct, science-first positioning.
