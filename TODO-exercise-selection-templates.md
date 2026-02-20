# TODO: Split-Specific Exercise Selection Templates

## Goal
Improve AI exercise selection by encoding what "excellent" exercise selection looks like
for each scheduling model (split pattern). Currently the exercise selection engine provides
generic pattern-slot guidance. This upgrade would give the AI a specific recipe per day type.

## Architecture

### Where templates live
- New file: shared/services/exerciseSelectionTemplates.ts
- Imported by exerciseSelectionEngine.ts and injected into the prompt via
  formatExerciseSelectionContextForPrompt()

### Template structure (proposed)
Each split pattern defines a day rotation with explicit slot descriptions:
- role: primary / secondary / variation / accessory / isolation
- movementPattern: from MovementPattern enum
- description: what this slot should be (e.g. "competition squat or close variation")
- exampleExerciseIds: concrete suggestions from exerciseLibrary

## Templates to Create

### 1. Full Body (2-4 days/week)
- Day A: Primary squat, horizontal push, horizontal pull, accessory hinge, core
- Day B: Primary hinge, vertical push, vertical pull, accessory squat, core
- Day C (optional): Variation squat, variation bench, row variation, rear delt, arms
- Session structure variations for OLAD vs standard vs high-variety

### 2. Upper / Lower (3-5 days/week)
- Upper A: Primary bench, secondary OHP, horizontal pull, vertical pull, lateral raise, tricep
- Upper B: Primary OHP, secondary bench variation, row, pulldown, rear delt, bicep
- Lower A: Primary squat, secondary RDL/hinge, leg press or lunge, leg curl, calf, core
- Lower B: Primary deadlift, secondary front squat or SSB, Bulgarian split squat, leg extension, core

### 3. Push / Pull / Legs (3-6 days/week)
- Push: Primary bench, secondary OHP or incline, chest fly, lateral raise, tricep pushdown, overhead tricep
- Pull: Primary barbell row, secondary pullup/pulldown, cable row, face pull, rear delt, bicep curl, hammer curl
- Legs: Primary squat, secondary RDL, leg press, walking lunge, leg curl, leg extension, calf raise

### 4. SBD / Powerlifting (3-5 days/week)
- Squat Day: Competition squat, pause/tempo squat, front squat or SSB, leg press, leg curl, core anti-extension
- Bench Day: Competition bench, close-grip or incline bench, OHP, tricep work, lateral raise, face pull
- Deadlift Day: Competition deadlift, deficit or block pull, barbell row, pullup, good morning, core anti-rotation
- Upper accessory (optional): DB bench, DB row, lateral raise, face pull, bicep, tricep
- Lower accessory (optional): Leg press, Bulgarian split squat, GHR, leg curl, calf, core

### 5. Custom
- Fallback to current pattern-slot approach but with better suggestions per slot

## Integration Points

1. exerciseSelectionEngine.ts computeExerciseSelectionContext()
   - Accept splitPattern and dayIndex as inputs
   - Look up the appropriate DayTemplate from the rotation
   - Output structured slot guidance instead of generic pattern lists

2. formatExerciseSelectionContextForPrompt()
   - Format day template as explicit slot instructions

3. server/generateWorkout.ts and api/generate-workout.ts
   - Pass split pattern and day index through to exercise selection engine
   - Template guidance appears in the EXERCISE SELECTION & ROTATION section

## Priority order
1. SBD / Powerlifting (most specific, easiest to define "correct")
2. Upper / Lower (very common, clear day types)
3. Push / Pull / Legs (popular, well-established)
4. Full Body (more flexible, less prescriptive)
5. Custom (fallback behavior)

## Notes
- Templates should be guidance, not rigid -- AI still fills gaps based on equipment, history, fatigue
- User exercise preferences (18-slot system) override template suggestions when set
- Per-day exercise overrides (feature #2) take precedence over templates
- Consider equipment filtering: if user lacks specialty bars, template should not suggest SSB
