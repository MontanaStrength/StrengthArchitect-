import { supabase, isSupabaseConfigured } from './supabaseService';
import type {
  Conversation,
  Message,
  MessageAttachment,
  MessageSender,
} from '../types';

const BUCKET = 'message-attachments';

// --- Conversations ---

export async function getOrCreateConversation(
  coachUserId: string,
  clientId: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('coach_user_id', coachUserId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) {
    return rowToConversation(existing);
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      coach_user_id: coachUserId,
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return rowToConversation(created);
}

export interface ConversationWithMeta extends Conversation {
  clientName?: string;
  lastMessageAt?: number;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export async function listConversationsForCoach(
  coachUserId: string,
  clients: { id: string; name: string }[]
): Promise<ConversationWithMeta[]> {
  const { data: rows, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('coach_user_id', coachUserId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const conversations = (rows || []).map(rowToConversation);
  if (conversations.length === 0) return [];

  const convIds = conversations.map(c => c.id);

  const { data: messageRows } = await supabase
    .from('messages')
    .select('id, conversation_id, body, created_at, sender, read_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  const lastByConv = new Map<string, { body: string; created_at: string; sender: string; read_at: string | null }>();
  const unreadByConv = new Map<string, number>();
  for (const m of messageRows || []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, {
        body: m.body,
        created_at: m.created_at,
        sender: m.sender,
        read_at: m.read_at,
      });
    }
    if (m.sender === 'client' && !m.read_at) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) || 0) + 1);
    }
  }

  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  return conversations.map(c => ({
    ...c,
    clientName: clientMap.get(c.clientId),
    lastMessageAt: lastByConv.get(c.id)
      ? new Date(lastByConv.get(c.id)!.created_at).getTime()
      : undefined,
    lastMessagePreview: lastByConv.get(c.id)
      ? truncate(lastByConv.get(c.id)!.body, 60)
      : undefined,
    unreadCount: unreadByConv.get(c.id) ?? 0,
  }));
}

// --- Messages ---

export async function getMessages(conversationId: string): Promise<(Message & { attachments?: MessageAttachment[] })[]> {
  const { data: messageRows, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgError) throw msgError;
  const messages = (messageRows || []).map(rowToMessage);

  const { data: attRows, error: attError } = await supabase
    .from('message_attachments')
    .select('*')
    .in('message_id', messages.map(m => m.id));

  if (attError) throw attError;
  const attsByMessage = new Map<string, MessageAttachment[]>();
  for (const a of attRows || []) {
    const list = attsByMessage.get(a.message_id) || [];
    list.push(rowToAttachment(a));
    attsByMessage.set(a.message_id, list);
  }

  return messages.map(m => ({
    ...m,
    attachments: attsByMessage.get(m.id) || [],
  }));
}

export async function sendMessage(
  conversationId: string,
  sender: MessageSender,
  body: string,
  senderUserId?: string | null
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender,
      sender_user_id: senderUserId || null,
      body: body.trim() || '',
      read_at: null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMessage(data);
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) throw error;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('sender', 'client')
    .is('read_at', null);

  if (error) throw error;
}

// --- Attachments ---

export async function uploadMessageAttachment(
  conversationId: string,
  messageId: string,
  file: File
): Promise<MessageAttachment> {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${conversationId}/${messageId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
    })
    .select()
    .single();

  if (error) throw error;
  return rowToAttachment(data);
}

export function getAttachmentUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** For private buckets use signed URL; anon key may not have public read. */
export async function getAttachmentSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// --- Realtime ---

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      payload => {
        onMessage(rowToMessage(payload.new as Record<string, unknown>));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- Helpers ---

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    coachUserId: row.coach_user_id as string,
    clientId: row.client_id as string,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    sender: row.sender as MessageSender,
    senderUserId: (row.sender_user_id as string) || null,
    body: (row.body as string) || '',
    createdAt: new Date(row.created_at as string).getTime(),
    readAt: row.read_at ? new Date(row.read_at as string).getTime() : null,
  };
}

function rowToAttachment(row: Record<string, unknown>): MessageAttachment {
  return {
    id: row.id as string,
    messageId: row.message_id as string,
    storagePath: row.storage_path as string,
    fileName: row.file_name as string,
    contentType: row.content_type as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
