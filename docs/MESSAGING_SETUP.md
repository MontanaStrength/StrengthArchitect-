# Coach–Client Messaging Setup Checklist

Use this after adding the messaging feature (Option 5). Run these steps in your **Supabase** project.

---

## 1. Run the migration

1. Open your Supabase project → **SQL Editor**.
2. Open **`supabase-messaging-migration.sql`** (project root), copy its full contents.
3. Paste into a new query and **Run**.
4. If Supabase shows “Potential issue detected” (destructive operation), it’s referring to `DROP TRIGGER IF EXISTS`. Safe to click **Run this query** — on first run that drop does nothing.
5. Confirm no errors. Tables, policies, trigger, and (if allowed) the storage bucket will be created.

---

## 2. Create the storage bucket (if needed)

If the migration failed on `INSERT INTO storage.buckets` or you’re unsure the bucket exists:

1. In Supabase go to **Storage**.
2. Click **New bucket**.
3. **Name:** `message-attachments`.
4. Leave it **private** (not public).
5. Create the bucket.

RLS from the migration already applies to this bucket.

---

## 3. (Later) Athlete UI and RLS

When you add an athlete app, add RLS (and any mapping of athlete user → `client_id`) so athletes only see and send messages in their own conversation. See **`docs/ATHLETE_UI_FUTURE.md`**.
