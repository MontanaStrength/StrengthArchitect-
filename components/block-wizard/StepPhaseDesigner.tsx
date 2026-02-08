import React from 'react';
import { BlockStepProps } from './types';
import {
  TrainingPhase,
  TrainingBlockPhase,
  PHASE_PRESETS,
  SPLIT_PATTERNS,
  SplitPattern,
} from '../../types';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

/** All available phases a user can add */
const PHASE_OPTIONS = Object.values(TrainingPhase);

const INTENSITY_LEVELS = ['minimal', 'low', 'moderate', 'high', 'very-high'] as const;
const VOLUME_LEVELS    = ['minimal', 'low', 'moderate', 'high', 'very-high'] as const;

const StepPhaseDesigner: React.FC<BlockStepProps> = ({ state, onChange }) => {
  const { phases } = state;

  const updatePhase = (idx: number, patch: Partial<TrainingBlockPhase>) => {
    const updated = phases.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange({ phases: updated });
  };

  const addPhase = (phase: TrainingPhase) => {
    const preset = PHASE_PRESETS[phase];
    const newPhase: TrainingBlockPhase = {
      ...preset,
      weekCount: phase === TrainingPhase.DELOAD ? 1 : 3,
      sessionsPerWeek: state.defaultSessionsPerWeek,
      splitPattern: state.defaultSplitPattern,
    };
    onChange({ phases: [...phases, newPhase] });
  };

  const removePhase = (idx: number) => {
    onChange({ phases: phases.filter((_, i) => i !== idx) });
  };

  const movePhase = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= phases.length) return;
    const arr = [...phases];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange({ phases: arr });
  };

  const totalWeeks = phases.reduce((s, p) => s + p.weekCount, 0);
  const totalSessions = phases.reduce((s, p) => s + p.weekCount * p.sessionsPerWeek, 0);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 bg-neutral-800/50 rounded-lg px-4 py-2">
        <span>{phases.length} phases</span>
        <span>{totalWeeks} weeks</span>
        <span>~{totalSessions} total sessions</span>
      </div>

      {/* Phase list */}
      <div className="space-y-3">
        {phases.map((phase, idx) => (
          <div
            key={idx}
            className="bg-neutral-800/40 border border-neutral-700 rounded-xl p-4 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => movePhase(idx, -1)}
                    disabled={idx === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => movePhase(idx, 1)}
                    disabled={idx === phases.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: phaseColor(phase.phase) }}
                />
                <select
                  value={phase.phase}
                  onChange={e => {
                    const newPhaseType = e.target.value as TrainingPhase;
                    const preset = PHASE_PRESETS[newPhaseType];
                    updatePhase(idx, {
                      phase: newPhaseType,
                      intensityFocus: preset.intensityFocus,
                      volumeFocus: preset.volumeFocus,
                      primaryArchetypes: preset.primaryArchetypes,
                      description: preset.description,
                    });
                  }}
                  className="bg-transparent text-white font-semibold text-sm border-none focus:outline-none cursor-pointer"
                >
                  {PHASE_OPTIONS.map(p => (
                    <option key={p} value={p} className="bg-neutral-900">{p}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => removePhase(idx)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Controls grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Weeks */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Weeks</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={phase.weekCount}
                  onChange={e => updatePhase(idx, { weekCount: Math.max(1, Number(e.target.value)) })}
                  className="w-full mt-1 p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Sessions / week */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions/wk</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={phase.sessionsPerWeek}
                  onChange={e => updatePhase(idx, { sessionsPerWeek: Math.max(1, Math.min(7, Number(e.target.value))) })}
                  className="w-full mt-1 p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Intensity */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Intensity</label>
                <select
                  value={phase.intensityFocus}
                  onChange={e => updatePhase(idx, { intensityFocus: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  {INTENSITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Volume */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Volume</label>
                <select
                  value={phase.volumeFocus}
                  onChange={e => updatePhase(idx, { volumeFocus: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  {VOLUME_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Split pattern */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Split</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SPLIT_PATTERNS.map(sp => (
                  <button
                    key={sp.value}
                    onClick={() => updatePhase(idx, { splitPattern: sp.value })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      phase.splitPattern === sp.value
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:border-neutral-500'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 italic">{phase.description}</p>
          </div>
        ))}
      </div>

      {/* Add phase */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Add Phase</label>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => addPhase(p)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 border border-neutral-700 text-gray-300 hover:border-amber-500 hover:text-amber-400 transition-all"
            >
              <Plus size={12} /> {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function phaseColor(p: TrainingPhase): string {
  switch (p) {
    case TrainingPhase.HYPERTROPHY:     return '#7c3aed';
    case TrainingPhase.ACCUMULATION:    return '#3b82f6';
    case TrainingPhase.STRENGTH:        return '#f59e0b';
    case TrainingPhase.INTENSIFICATION: return '#eab308';
    case TrainingPhase.REALIZATION:     return '#f97316';
    case TrainingPhase.PEAKING:         return '#ef4444';
    case TrainingPhase.DELOAD:          return '#22c55e';
    default: return '#6b7280';
  }
}

export default StepPhaseDesigner;
