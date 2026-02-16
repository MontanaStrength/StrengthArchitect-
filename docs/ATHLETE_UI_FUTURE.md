# Future Athlete / Client UI (notes only — no build or design yet)

Ideas to revisit when we add an athlete-facing experience. Do **not** implement or design in detail until we're ready.

## Communication

- Athletes see a single thread: "Messages with coach."
- They can read coach messages, reply with text, and optionally attach form-check videos (or images).
- Backend: reuse existing `conversations` / `messages`; add RLS (and possibly a way to map athlete user → `client_id`) so athletes only see their own conversation.

## Workouts → sync to Sheet (Option B)

- **Chosen approach:** In-app for following workouts + **sync to one Google Sheet** (master template). We append new workout data as rows; athlete owns the Sheet for analysis. See **`docs/WORKOUT_EXPORT_SHEETS.md`** for the full spec.
- Data comes from our existing workout structure (exercises, sets, reps, RPE, etc.); template columns TBD when we implement.

## Athlete identity

- TBD: Will athletes have accounts in the app (e.g. Supabase Auth), or interact via magic links / invite links only? This affects how we map them to `client_id` and secure messaging + workout access.

---

*Last updated when coach–client messaging (Option 5) was implemented.*
