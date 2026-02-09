# Strength Architect — Refinement & Polish Roadmap

A focused audit of **look**, **feel**, **usability**, **workflow**, and **logic** to push the app toward class-leading quality.

---

## 1. Look & visual consistency

### Design tokens vs Tailwind
- **index.css** defines a strong design system (`--sa-*` vars, `.sa-card`, `.sa-btn`, etc.).
- Many components still use raw Tailwind (`bg-neutral-900`, `rounded-xl`, `border-neutral-800`) instead of the shared tokens.
- **Recommendation:** Standardize on design tokens. Use `bg-sa-surface1`, `rounded-[var(--sa-radius-lg)]` (or add Tailwind theme entries for `sa-surface1`, `sa-radius-lg`) so cards, inputs, and buttons feel like one system. This will make future theme/contrast changes trivial.

### Typography
- Mix of `text-2xl`, `text-lg`, `text-sm`, `text-[10px]` and CSS vars (`--sa-text-heading`, `--sa-text-micro`). Pick one source of truth (e.g. Tailwind theme that maps to your type scale) so headings and labels are consistent across Plan, Lift, Analyze, and modals.

### Spacing and density
- Some views feel dense (PlanView exercises, TrackingView), others spacious (SessionRecap). Use the 8pt grid (`--sa-space-*`) consistently; consider slightly more breathing room in forms and long lists.

### Empty and loading states
- **LiftView** “No Active Block” and “Rest Day” are clear and actionable.
- **HistoryView**, **DashboardView**, **TrackingView**: when there’s no data, add a short empty state (illustration or icon + one line + primary CTA) instead of a blank area. Same for “no notifications” in NotificationCenterView.

### Auth and first impression
- AuthView hero is strong (grayscale bg, amber CTA). Small polish: ensure “Strength” and “Architect” spacing/line-break is consistent with the in-app header so the brand feels identical after login.

---

## 2. Feel (micro-interactions and feedback)

### Buttons and taps
- `.sa-btn:active { transform: scale(0.98); }` is good. Apply the same subtle press feedback to all primary actions (e.g. PlanView “Create Block”, SessionRecap “Continue”, Auth submit). Avoid heavy scale on small icon buttons.

### Transitions
- You use `transition-colors` and `transition-all` in places. Standardize: `transition-[var(--sa-transition)]` for 150ms ease on hover/focus for interactive elements so the app feels snappy and consistent.
- Tab switches (Plan Block/Schedule/Exercises, Tracking Sleep/Body Comp) could use a short crossfade or slide so the change doesn’t feel abrupt.

### Success and confirmation
- PlanView’s “Block Created” overlay (checkmark, glow, summary) is excellent. Consider similar “save” feedback for: Gym Setup, Goal saved, Sleep/Body Comp logged (e.g. brief toast or inline “Saved” state) so users never wonder if something persisted.

### Session and recap
- WorkoutSession already has rest timer and beeps. Optional: very subtle haptic (e.g. `navigator.vibrate?.(50)` on set complete) when supported, and a quick highlight on the next set so the eye knows where to go.
- SessionRecapView’s motivational copy and completion ring are strong. A short confetti or badge animation on “Session Complete” or on a new PR could deepen the reward feeling (keep it optional or low-motion-friendly).

---

## 3. Usability

### Navigation and wayfinding
- Three main tabs (Plan / Lift / Analyze) are clear. Back chevron when in a sub-view is good.
- **Lift sub-actions:** Plate Calculator, Exercise Library, Strength Test live under Lift but aren’t obvious from the Lift hub. Consider a “Tools” or “More” row on the Lift tab (like Plan’s “More” section) so they’re discoverable without leaving the flow.
- **Analyze:** Dashboard vs History vs Lift Records vs Tracking could use a one-line description under each tile so users know where to go for “how am I recovering?” vs “what did I lift last week?”.

### Forms and inputs
- **OnboardingView:** Weight/age inputs don’t enforce sane bounds (e.g. 50–500 lbs, 13–120 age). Add `min`/`max` and optional soft validation so bad data doesn’t propagate.
- **PlanView:** Block name required state is clear. “Estimated 1RMs” could show a small “?” tooltip: “Used for working weight suggestions; leave blank to use RPE-based loads.”
- **TrackingView:** Sleep date picker and quality are good. If you add more metrics later, keep the “Log Sleep” / “Log Body Comp” flow to a single screen or stepper so it doesn’t feel like a separate app.

### Readability and hierarchy
- SessionRecapView stats grid (Tonnage, Sets, Reps, Duration) is scannable. Use the same `.sa-stat` (or equivalent) pattern on Dashboard and Analyze hub so “big number + label” is consistent.
- Tables/lists (History, Lift Records): ensure row hover and selected state are obvious and that primary action (e.g. “Open” or “View”) is the main target, with delete secondary.

### Accessibility
- Focus styles are defined (`:focus-visible` with amber outline). Verify all interactive elements (tabs, dropdowns, custom buttons) receive focus and that order is logical (e.g. modal trap, then back to trigger).
- Labels: ensure every input has a visible or `aria-label` so screen readers get context. Session RPE 1–10 scale could use `aria-valuetext` for “RPE 7” etc.
- Color: Amber on dark passes contrast; ensure “success” (e.g. green) and “warning” (amber) aren’t the only differentiators for critical messages (e.g. add an icon or short text).

---

## 4. Workflow and logic

### Lift flow
- **No block → Plan** is clear. After onboarding, defaulting to Lift tab is good; if there’s no block, the empty state already sends users to Plan.
- **Rest day → “Train Anyway”** correctly flips into the readiness/generate flow. Consider resetting `overrideRestDay` when the user leaves Lift or starts a new day (e.g. when `blockContext.weekNum` or date changes) so they don’t accidentally carry “override” forever.
- **Generate → Result → Start Session → Session → Recap** is a solid path. One gap: from Recap, “Continue” goes to Lift and clears current plan. If the user meant “I’m done for today,” that’s perfect; if they wanted “log another session” (e.g. same workout again), there’s no shortcut. Optional: “Build next workout” or “Same again” from Recap for power users.

### Plan flow
- Block → Schedule → Exercises with sub-tabs is logical. Saving from any sub-tab is good. The confirmation overlay is a strong end state.
- **Phases:** PlanView currently edits block name, length, schedule, goal bias, volume, and exercise slots. Training *phases* (e.g. Hypertrophy 4 wk → Strength 4 wk) live in onboarding and BlockWizard but aren’t editable in PlanView. If phase design is part of “refining the plan,” consider exposing phase list and week counts in Plan (even if advanced).

### Data and sync
- Cloud sync is fire-and-forget (e.g. `syncWorkoutToCloud(...).catch(console.error)`). For polish: show a small “Saved” or cloud icon in the header or near the last-edited entity when sync succeeds, and optionally “Syncing…” / “Offline” so users know their data is persisted. Retry or queue on network failure would be a later step.
- Coach mode: switching client clears all scoped data and reloads. That’s correct; a short “Loading Sarah’s data…” on the client banner during load would reduce perceived lag.

### Bug fix applied
- **LiftView:** `useState(overrideRestDay)` was previously declared after an early return, violating React’s rules of hooks. It’s now declared at the top of the component with `copied` so hooks are always called in the same order.

---

## 5. Logic and edge cases

### Rest day override
- Resetting `overrideRestDay` when the calendar day or block week changes (or when navigating away from Lift) keeps “Train Anyway” as an explicit one-time choice.

### Session recap duration
- Session duration uses `completedSets[0]?.timestamp` vs “now.” If the user leaves the session screen and comes back, duration can be large. Consider “session start” stored once when entering WorkoutSession and duration = now - session start until complete, so duration is always “time on this screen” (or make the definition clear in the UI).

### Optimizer and context
- Training context (phase, week in phase, block name) is passed into generation; optimizer recommendations are computed from history and context. No obvious logic gaps; if you add “deload week” or “taper” in the future, ensure `trainingContext` and optimizer both respect it.

### Empty history
- When `history.length === 0`, generation still works (no previous workouts). Good. Dashboard and Analyze stats will be zeros or “—”; empty states there (as above) will complete the picture.

---

## 6. Prioritized action list

**Quick wins (1–2 hours each)**  
1. Add empty states to History, Dashboard, Tracking, Notifications (icon + line + CTA).  
2. Use design tokens consistently in 2–3 key views (e.g. LiftView, SessionRecapView) and align Tailwind theme with `--sa-*`.  
3. OnboardingView: add min/max on weight and age inputs.  
4. Lift tab: add a “Tools” row linking to Plate Calculator, Exercise Library, Strength Test.  
5. Optional: reset `overrideRestDay` when date or block week changes (or on navigating away from Lift).

**Medium (half day each)**  
6. Short “Saved” or sync indicator after cloud writes (e.g. header or toast).  
7. Consistent transition and button feedback (e.g. `sa-transition` and press state) across all primary actions.  
8. One-line descriptions under Analyze hub tiles (Dashboard, History, Lift Records, Tracking).  
9. Optional: light “Session saved” or “PR logged” feedback after SessionRecap “Continue” or when saving a record.

**Larger (when you want to go deeper)**  
10. Phase editing in PlanView (phase list, week counts, intensity/volume labels).  
11. Optional “Same workout again” or “Build next” from SessionRecap.  
12. Accessibility pass: focus order, aria labels, and reduced-motion preference for any new animations.

---

You’re already in a strong place: clear Plan/Lift/Analyze model, coach mode, block-based programming, and a thoughtful session → recap flow. These refinements will tighten consistency, feedback, and edge-case behavior so the app feels polished and reliable every step of the way.
