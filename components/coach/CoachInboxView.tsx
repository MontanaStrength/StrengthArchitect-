import React, { useEffect, useState } from 'react';
import { MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import BrandIcon from '../BrandIcon';
import {
  listConversationsForCoach,
  type ConversationWithMeta,
} from '../../shared/services/messagingService';

interface Props {
  coachUserId: string;
  clients: { id: string; name: string }[];
  onSelectConversation: (conv: ConversationWithMeta) => void;
  onBack: () => void;
}

const CoachInboxView: React.FC<Props> = ({
  coachUserId,
  clients,
  onSelectConversation,
  onBack,
}) => {
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listConversationsForCoach(coachUserId, clients)
      .then(data => {
        if (!cancelled) setConversations(data);
      })
      .catch(e => {
        if (!cancelled) setError(e?.message || 'Failed to load conversations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [coachUserId, clients]);

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Back to roster"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <BrandIcon size={22} className="text-amber-500" />
            <span className="text-lg font-bold">
              <span className="text-white">Strength </span>
              <span className="text-amber-500">Architect</span>
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">Coach</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <MessageCircle size={20} className="text-blue-400" />
            <span className="font-semibold text-white">Messages</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-amber-500 animate-spin" />
          </div>
        )}
        {error && (
          <div className="py-8 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {!loading && !error && conversations.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No conversations yet</h3>
            <p className="text-gray-400 text-sm">
              Start a conversation from an athlete&apos;s card on the roster (Message).
            </p>
          </div>
        )}
        {!loading && !error && conversations.length > 0 && (
          <ul className="space-y-1">
            {conversations.map(conv => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-bold text-sm">
                      {(conv.clientName || '?').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">
                        {conv.clientName || 'Unknown'}
                      </span>
                      {conv.unreadCount != null && conv.unreadCount > 0 && (
                        <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {conv.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                  {conv.lastMessageAt != null && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default CoachInboxView;
