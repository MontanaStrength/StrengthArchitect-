import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Send, Paperclip, Loader2 } from 'lucide-react';
import BrandIcon from '../BrandIcon';
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  uploadMessageAttachment,
  getAttachmentSignedUrl,
  markConversationRead,
  subscribeToMessages,
} from '../../shared/services/messagingService';
import type { Message, MessageAttachment } from '../../shared/types';

interface Props {
  /** When set, we resolve conversation by coach + client first */
  clientId: string | null;
  /** When set, we use this conversation directly (e.g. from inbox) */
  conversationId: string | null;
  clientName: string;
  coachUserId: string;
  onBack: () => void;
}

type MessageWithAttachments = Message & { attachments?: MessageAttachment[] };

const ConversationThreadView: React.FC<Props> = ({
  clientId,
  conversationId: initialConversationId,
  clientName,
  coachUserId,
  onBack,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Resolve conversation: either we have conversationId or we need getOrCreateConversation(coachUserId, clientId)
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId);
      setLoading(true);
      setResolveError(null);
      return;
    }
    if (!clientId || !coachUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getOrCreateConversation(coachUserId, clientId)
      .then(conv => {
        if (!cancelled) setConversationId(conv.id);
      })
      .catch(e => {
        if (!cancelled) setResolveError(e?.message || 'Failed to open conversation');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialConversationId, clientId, coachUserId]);

  // Load messages and subscribe
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    getMessages(conversationId)
      .then(data => {
        if (!cancelled) setMessages(data);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    markConversationRead(conversationId).catch(() => {});

    const unsub = subscribeToMessages(conversationId, newMsg => {
      setMessages(prev => [...prev, { ...newMsg, attachments: [] }]);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = composerText.trim();
    if (!conversationId || (!text && !uploading) || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, 'coach', text, coachUserId);
      setMessages(prev => [...prev, { ...msg, attachments: [] }]);
      setComposerText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      return; // allow only video and image for now
    }
    e.target.value = '';
    setUploading(true);
    try {
      const msg = await sendMessage(conversationId, 'coach', isVideo ? '📎 Form check video' : '📎 Image', coachUserId);
      await uploadMessageAttachment(conversationId, msg.id, file);
      const updated = await getMessages(conversationId);
      setMessages(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading && !conversationId) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 size={32} className="text-amber-500 animate-spin" />
      </div>
    );
  }
  if (resolveError) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-4">
        <p className="text-red-400 mb-4">{resolveError}</p>
        <button onClick={onBack} className="text-amber-500 hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <BrandIcon size={22} className="text-amber-500 shrink-0" />
          <span className="font-semibold text-white truncate flex-1">{clientName}</span>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} coachUserId={coachUserId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-neutral-800 bg-neutral-900/95 p-3 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            className="hidden"
            onChange={handleAttach}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 rounded-xl bg-neutral-800 text-gray-400 hover:text-amber-500 transition-colors disabled:opacity-50"
            title="Attach image or video"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={composerText}
            onChange={e => setComposerText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 outline-none text-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!composerText.trim() && !uploading)}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

function MessageBubble({
  message,
  coachUserId,
}: {
  message: MessageWithAttachments;
  coachUserId: string;
}) {
  const isCoach = message.sender === 'coach';
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!message.attachments?.length) return;
    const map: Record<string, string> = {};
    let cancelled = false;
    Promise.all(
      message.attachments.map(async a => {
        try {
          const url = await getAttachmentSignedUrl(a.storagePath);
          return { id: a.id, url };
        } catch {
          return { id: a.id, url: '' };
        }
      })
    ).then(results => {
      if (cancelled) return;
      results.forEach(({ id, url }) => { map[id] = url; });
      setAttachmentUrls(prev => ({ ...prev, ...map }));
    });
    return () => { cancelled = true; };
  }, [message.attachments]);

  const date = new Date(message.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          isCoach ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-neutral-800 border border-neutral-700'
        }`}
      >
        {message.body && <p className="text-sm text-white whitespace-pre-wrap break-words">{message.body}</p>}
        {message.attachments?.map(att => {
          const url = attachmentUrls[att.id];
          const isVideo = att.contentType.startsWith('video/');
          const isImage = att.contentType.startsWith('image/');
          return (
            <div key={att.id} className="mt-2">
              {isImage && url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden max-w-full">
                  <img src={url} alt={att.fileName} className="max-h-48 object-contain" />
                </a>
              )}
              {isVideo && url && (
                <video
                  src={url}
                  controls
                  className="rounded-lg max-h-48 max-w-full"
                  preload="metadata"
                />
              )}
              {!url && (isImage || isVideo) && (
                <span className="text-xs text-gray-500">Loading…</span>
              )}
              {!isImage && !isVideo && (
                <a href={url || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline">
                  {att.fileName}
                </a>
              )}
            </div>
          );
        })}
        <p className={`text-[10px] mt-1 ${isCoach ? 'text-amber-400/80' : 'text-gray-500'}`}>
          {timeStr}
          {message.readAt != null && isCoach && ' · Read'}
        </p>
      </div>
    </div>
  );
}

export default ConversationThreadView;
