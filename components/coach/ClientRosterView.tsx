import React, { useState } from 'react';
import { CoachClient } from '../../shared/types';
import { Plus, Users, ChevronRight, Search, Settings, LogOut, MessageCircle } from 'lucide-react';
import BrandIcon from '../BrandIcon';

interface Props {
  clients: CoachClient[];
  clientsLoading: boolean;
  onSelectClient: (client: CoachClient) => void;
  onAddClient: () => void;
  onEditClient: (client: CoachClient) => void;
  onDeleteClient: (id: string) => void;
  onSwitchMode: () => void;
  onSignOut: () => void;
  onOpenInbox?: () => void;
  onOpenThreadWithClient?: (client: CoachClient) => void;
}

const AVATAR_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

const ClientRosterView: React.FC<Props> = ({
  clients, clientsLoading, onSelectClient, onAddClient, onEditClient, onDeleteClient, onSwitchMode, onSignOut,
  onOpenInbox, onOpenThreadWithClient,
}) => {
  const [search, setSearch] = useState('');

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getColor = (client: CoachClient) => {
    return client.avatarColor || AVATAR_COLORS[Math.abs(client.name.charCodeAt(0)) % AVATAR_COLORS.length];
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandIcon size={22} className="text-amber-500" />
            <span className="text-lg font-bold">
              <span className="text-white">Strength </span>
              <span className="text-amber-500">Architect</span>
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">Coach</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenInbox && (
              <button onClick={onOpenInbox} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors text-sm font-medium" title="Messages">
                <MessageCircle size={18} />
                <span>Messages</span>
              </button>
            )}
            <button onClick={onSwitchMode} className="p-2 text-gray-500 hover:text-gray-300 transition-colors" title="Switch mode">
              <Settings size={16} />
            </button>
            <button onClick={onSignOut} className="p-2 text-gray-400 hover:text-amber-400 transition-colors" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Title + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={24} className="text-blue-400" /> My Athletes
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {clients.length} athlete{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onAddClient}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all text-sm"
          >
            <Plus size={16} /> Add Athlete
          </button>
        </div>

        {/* Search */}
        {clients.length > 3 && (
          <div className="relative mb-5">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search athletes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm placeholder-gray-500 focus:border-amber-500 outline-none"
            />
          </div>
        )}

        {/* Loading */}
        {clientsLoading && clients.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-neutral-800 rounded w-32" />
                    <div className="h-2 bg-neutral-800 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!clientsLoading && filtered.length === 0 && clients.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="text-xl font-bold text-white mb-2">No athletes yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Add your first athlete to start building their program.
            </p>
            <button
              onClick={onAddClient}
              className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all"
            >
              <Plus size={18} /> Add First Athlete
            </button>
          </div>
        )}

        {/* No search results */}
        {!clientsLoading && filtered.length === 0 && clients.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No athletes matching "{search}"</p>
          </div>
        )}

        {/* Client Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(client => (
            <div
              key={client.id}
              className="group bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all"
            >
              <button
                onClick={() => onSelectClient(client)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: getColor(client) + '20', color: getColor(client) }}
                  >
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {client.experience} · {client.weightLbs} lbs · {client.age}yo
                    </p>
                    {client.email && (
                      <p className="text-[10px] text-gray-600 truncate mt-0.5">{client.email}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-700 group-hover:text-amber-500 transition-colors mt-1 shrink-0" />
                </div>
              </button>
              <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-neutral-800/50">
                {onOpenThreadWithClient && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenThreadWithClient(client); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors text-xs font-medium"
                    title="Message"
                  >
                    <MessageCircle size={14} /> Message
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Edit profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientRosterView;
