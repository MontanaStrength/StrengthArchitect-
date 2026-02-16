# Workout Export: Sync to Google Sheet (Option B)

**Chosen direction:** In-app experience for following workouts + **one master template** that we append to when new workouts are assigned/completed. Data is preserved automatically; athlete (or coach) can analyze in Sheets.

No implementation yet — this is the spec for when we build it.

---

## Behavior

1. **Master template**  
   One Google Sheet structure we define (or a published template). Fixed columns, e.g.:
   - Date, Workout name, Exercise, Set #, Reps, Weight, RPE, Notes  
   (Exact columns TBD; align with our existing workout/exercise schema.)

2. **Connect once**  
   Athlete (or coach on behalf of client) connects their Sheet: OAuth or “paste Sheet ID” + append permission. We store the mapping (e.g. `client_id` → Sheet ID / spreadsheet URL).

3. **Append on new workout**  
   When a workout is assigned or completed, we **append rows** to their Sheet (one row per set, or one row per exercise with set details — TBD). No overwrite; append-only so history is preserved.

4. **In-app remains primary**  
   Athletes follow “today’s workout” in the app. The Sheet is the durable log they own and can use for their own analysis (pivot tables, charts, etc.).

---

## What we need (later)

- **Export format:** Canonical column set and row shape (one row per set vs per exercise, etc.) from our existing workout data.
- **Google Sheets API:** Auth (OAuth or service account), append rows to a specific sheet in the template.
- **Mapping storage:** Where to store “this client/athlete → this Sheet” (e.g. in Supabase, scoped by coach or athlete).
- **Trigger:** When to push — e.g. “when coach assigns workout,” “when athlete completes workout,” or both (configurable).
- **Template doc:** A public or copyable template Sheet with the exact column headers we use, so users can create “my log” from it if they want.

---

## Links

- **Athlete UI ideas:** `docs/ATHLETE_UI_FUTURE.md` (messaging, identity) — workout delivery to athletes follows this Option B.
- **Existing data:** Workout structure lives in `shared/types.ts` and Supabase `workouts`; we already have exercises, sets, reps, RPE, etc. Export layer will read from there.
