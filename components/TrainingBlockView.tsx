import React, { useState } from 'react';
import { TrainingBlock, TrainingBlockPhase, TrainingPhase, PERIODIZATION_TEMPLATES } from '../shared/types';
import { Layers, Plus, Trash2, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  blocks: TrainingBlock[];
  onSave: (block: TrainingBlock) => void;
  onDelete: (id: string) => void;
}

const TrainingBlockView: React.FC<Props> = ({ blocks, onSave, onDelete }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('linear-8-week');
  const [name, setName] = useState('');
  const [goalEvent, setGoalEvent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    const template = PERIODIZATION_TEMPLATES[selectedTemplate];
    if (!template) return;
    const block: TrainingBlock = {
      id: crypto.randomUUID(),
      name: name || template.name,
      startDate: Date.now(),
      phases: template.phases,
      goalEvent: goalEvent || template.goalEvent,
      isActive: blocks.length === 0, // Auto-activate if first block
    };
    onSave(block);
    setShowCreate(false);
    setName('');
    setGoalEvent('');
  };

  const toggleActive = (block: TrainingBlock) => {
    onSave({ ...block, isActive: !block.isActive });
  };

  const getPhaseColor = (phase: TrainingPhase) => {
    switch (phase) {
      case TrainingPhase.GPP: return 'bg-sky-900/50 text-sky-300 border-sky-700';
      case TrainingPhase.HYPERTROPHY: return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
      case TrainingPhase.ACCUMULATION: return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case TrainingPhase.STRENGTH: return 'bg-violet-900/50 text-violet-300 border-violet-700';
      case TrainingPhase.INTENSIFICATION: return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case TrainingPhase.POWER: return 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-700';
      case TrainingPhase.REALIZATION: return 'bg-pink-900/50 text-pink-300 border-pink-700';
      case TrainingPhase.PEAKING: return 'bg-rose-900/50 text-rose-300 border-rose-700';
      case TrainingPhase.DELOAD: return 'bg-slate-800/50 text-slate-300 border-slate-600';
      default: return 'bg-neutral-800 text-gray-300 border-neutral-700';
    }
  };

  const totalWeeks = (block: TrainingBlock) => block.phases.reduce((sum, p) => sum + p.weekCount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers size={24} className="text-amber-500" /> Training Blocks
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={16} /> New Block
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Create Training Block</h3>
          <div>
            <label className="text-xs text-gray-400">Template</label>
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
            >
              {Object.entries(PERIODIZATION_TEMPLATES).map(([key, tmpl]) => (
                <option key={key} value={key}>{tmpl.name}</option>
              ))}
            </select>
          </div>
          <div className={`rounded-xl p-3 border-2 transition-all ${
              name.trim()
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 animate-[pulse_4s_ease-in-out_infinite]'
            }`}>
              <label className="block text-sm font-bold text-amber-400 mb-1">
                🏷️ Block Name {!name.trim() && <span className="text-amber-500 text-xs font-medium ml-1">(required)</span>}
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={PERIODIZATION_TEMPLATES[selectedTemplate]?.name}
                autoFocus
                className={`w-full p-2.5 rounded-lg bg-neutral-800 text-white text-base font-semibold placeholder-gray-600 placeholder:font-normal placeholder:text-sm focus:outline-none transition-all border-2 ${
                  name.trim()
                    ? 'border-neutral-700 focus:border-amber-500'
                    : 'border-amber-500/60 focus:border-amber-500'
                }`}
              />
              {!name.trim() && (
                <p className="text-[10px] text-amber-400/70 mt-1.5">Give your block a name so you can find it later!</p>
              )}
          </div>
          <div>
            <label className="text-xs text-gray-400">Goal Event (optional)</label>
              <input
                value={goalEvent}
                onChange={e => setGoalEvent(e.target.value)}
                placeholder="e.g., Powerlifting Meet"
                className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
              />
          </div>
          {/* Template preview */}
          {PERIODIZATION_TEMPLATES[selectedTemplate] && (
            <div className="space-y-1">
              {PERIODIZATION_TEMPLATES[selectedTemplate].phases.map((p, i) => (
                <div key={i} className={`px-3 py-2 rounded border text-xs ${getPhaseColor(p.phase)}`}>
                  <span className="font-semibold">{p.phase}</span> — {p.weekCount}wk • {p.sessionsPerWeek}x/wk — Intensity: {p.intensityFocus}, Volume: {p.volumeFocus}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-all">
              Create Block
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm rounded-lg transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Blocks List */}
      {blocks.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-gray-500">
          <Layers size={48} className="mx-auto mb-3 opacity-30" />
          <p>No training blocks. Create one to enable periodized training!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map(block => {
            const isExpanded = expandedId === block.id;
            const weeks = totalWeeks(block);
            const elapsedWeeks = Math.floor((Date.now() - block.startDate) / (7 * 24 * 60 * 60 * 1000));
            const progress = Math.min(100, Math.round((elapsedWeeks / weeks) * 100));

            return (
              <div key={block.id} className={`bg-neutral-900 border rounded-xl overflow-hidden ${block.isActive ? 'border-amber-500' : 'border-neutral-800'}`}>
                <div
                  className="p-4 cursor-pointer flex justify-between items-center"
                  onClick={() => setExpandedId(isExpanded ? null : block.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{block.name}</h3>
                      {block.isActive && <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-medium">ACTIVE</span>}
                    </div>
                    <p className="text-xs text-gray-500">{weeks} weeks • Started {new Date(block.startDate).toLocaleDateString()} • Week {Math.min(elapsedWeeks + 1, weeks)}/{weeks}</p>
                    {block.goalEvent && <p className="text-xs text-gray-400 mt-0.5">🎯 {block.goalEvent}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-800 p-4 space-y-2">
                    {block.phases.map((p, i) => {
                      let cumulativeWeeks = 0;
                      for (let j = 0; j < i; j++) cumulativeWeeks += block.phases[j].weekCount;
                      const isCurrent = elapsedWeeks >= cumulativeWeeks && elapsedWeeks < cumulativeWeeks + p.weekCount;
                      return (
                        <div key={i} className={`px-3 py-2 rounded border text-xs ${isCurrent ? 'ring-1 ring-amber-500 ' : ''}${getPhaseColor(p.phase)}`}>
                          <div className="flex justify-between">
                            <span className="font-semibold">{p.phase} ({p.weekCount}wk)</span>
                            {isCurrent && <span className="text-amber-400 font-bold">← CURRENT</span>}
                          </div>
                          <p className="mt-1 opacity-80">{p.description}</p>
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-2 border-t border-neutral-800">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(block); }}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          block.isActive ? 'bg-neutral-800 text-gray-400 hover:bg-neutral-700' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {block.isActive ? <><Square size={12} /> Deactivate</> : <><Play size={12} /> Activate</>}
                      </button>
                      {confirmDeleteId === block.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(block.id); setConfirmDeleteId(null); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          >
                            <Trash2 size={12} /> Confirm
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-gray-400 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(block.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-amber-900/50 text-gray-400 hover:text-amber-400 rounded-lg transition-all"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrainingBlockView;
