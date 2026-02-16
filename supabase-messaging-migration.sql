-- Strength Architect: Coach–Client Messaging
-- Run this in the Supabase SQL editor after coach_clients exists.
-- Full checklist: docs/MESSAGING_SETUP.md

-- 1. CONVERSATIONS (one per coach–client pair)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_user_id, client_id)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Coach: full access to their conversations
CREATE POLICY "Coach can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = coach_user_id);

-- 2. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('coach', 'client')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at);

-- Coach can read/write messages in their conversations
CREATE POLICY "Coach can manage messages in own conversations"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.coach_user_id = auth.uid()
    )
  );

-- 3. MESSAGE ATTACHMENTS (references Storage paths)
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

CREATE POLICY "Coach can manage attachments in own conversations"
  ON message_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_attachments.message_id AND c.coach_user_id = auth.uid()
    )
  );

-- 4. STORAGE BUCKET
-- Create bucket in Dashboard if this fails: Storage → New bucket → id: message-attachments, public: false
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects: coach can read/insert/update/delete in paths that belong to their conversations
-- (Supabase storage policies use (bucket_id, name) and we need to allow by conversation_id in path)
CREATE POLICY "Coach can manage message attachment files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND c.coach_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND c.coach_user_id = auth.uid()
      )
    )
  );

-- 5. Keep conversation.updated_at in sync when messages are added
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE PROCEDURE update_conversation_updated_at();
