import React, { useEffect } from 'react';
import { BlockStepProps, BLOCK_FOCUS_OPTIONS, BlockFocus, generatePhasesForFocus } from './types';
import { TrainingPhase, SPLIT_PATTERNS, SplitPattern } from '../../shared/types';
import { Minus, Plus } from 'lucide-react';

const StepBlockGoal: React.FC<BlockStepProps> = ({ state, onChange }) => {
  const focusMeta = BLOCK_FOCUS_OPTIONS.find(f => f.value === state.blockFocus) || BLOCK_FOCUS_OPTIONS[0];
  const [min, max] = focusMeta.suggestedWeeks;

  const regeneratePhases = (focus: BlockFocus, weeks: number, sessions: number, split: SplitPattern) => {
    const phases = generatePhasesForFocus(focus, weeks, sessions, split);
    onChange({ phases });
  };

  const handleFocusChange = (focus: BlockFocus) => {
    const meta = BLOCK_FOCUS_OPTIONS.find(f => f.value === focus)!;
    const weeks = Math.max(meta.suggestedWeeks[0], Math.min(meta.suggestedWeeks[1], meta.defaultWeeks));
    if (focus !== 'custom') {
      const phases = generatePhasesForFocus(focus, weeks, state.defaultSessionsPerWeek, state.defaultSplitPattern);
      onChange({ blockFocus: focus, totalWeeks: weeks, mode: 'template', phases });
    } else {
      onChange({ blockFocus: focus, totalWeeks: weeks, mode: 'custom', phases: [] });
    }
  };

  const handleWeeksChange = (weeks: number) => {
    const clamped = Math.max(min, Math.min(max, weeks));
    onChange({ totalWeeks: clamped });
    if (state.blockFocus !== 'custom') {
      regeneratePhases(state.blockFocus, clamped, state.defaultSessionsPerWeek, state.defaultSplitPattern);
    }
  };

  const handleSessionsChange = (sessions: number) => {
    const clamped = Math.max(2, Math.min(7, sessions));
    onChange({ defaultSessionsPerWeek: clamped });
    if (state.blockFocus !== 'custom') {
      regeneratePhases(state.blockFocus, state.totalWeeks, clamped, state.defaultSplitPattern);
    }
  };

  const handleSplitChange = (split: SplitPattern) => {
    onChange({ defaultSplitPattern: split });
    if (state.blockFocus !== 'custom') {
      regeneratePhases(state.blockFocus, state.totalWeeks, state.defaultSessionsPerWeek, split);
    }
  };

  useEffect(() => {
    if (state.phases.length === 0 && state.blockFocus !== 'custom') {
      regeneratePhases(state.blockFocus, state.totalWeeks, state.defaultSessionsPerWeek, state.defaultSplitPattern);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Block Focus */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">Block Focus</label>
        <div className="space-y-2">
          {BLOCK_FOCUS_OPTIONS.map(opt => {
            const active = state.blockFocus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleFocusChange(opt.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  active
                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                <span className="text-2xl w-9 text-center flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{opt.label}</div>
                  <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{opt.desc}</div>
                </div>
                {active && opt.value !== 'custom' && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">{opt.suggestedWeeks[0]}–{opt.suggestedWeeks[1]}wk</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration & frequency (only for non-custom) */}
      {state.blockFocus !== 'custom' && (
        <div className="space-y-5">
          {/* Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Duration</label>
              <span className="text-sm font-bold text-amber-400">{state.totalWeeks} weeks</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleWeeksChange(state.totalWeeks - 1)}
                disabled={state.totalWeeks <= min}
                className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="range"
                min={min}
                max={max}
                value={state.totalWeeks}
                onChange={e => handleWeeksChange(Number(e.target.value))}
                className="flex-1 accent-amber-500 h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <button
                onClick={() => handleWeeksChange(state.totalWeeks + 1)}
                disabled={state.totalWeeks >= max}
                className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Sessions per week */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Sessions / Week</label>
              <span className="text-sm font-bold text-amber-400">{state.defaultSessionsPerWeek}×</span>
            </div>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => handleSessionsChange(n)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                    state.defaultSessionsPerWeek === n
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-neutral-800 border-neutral-700 text-gray-400 hover:border-neutral-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Split pattern */}
          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Split Pattern</label>
            <div className="flex flex-wrap gap-1.5">
              {SPLIT_PATTERNS.filter(sp => sp.value !== 'custom').map(sp => (
                <button
                  key={sp.value}
                  onClick={() => handleSplitChange(sp.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    state.defaultSplitPattern === sp.value
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-neutral-800 border-neutral-700 text-gray-400 hover:border-neutral-500'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phase preview */}
          {state.phases.length > 0 && (
            <div className="bg-neutral-800/50 rounded-xl p-4 space-y-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Phase Breakdown</label>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                {state.phases.map((p, i) => (
                  <div
                    key={i}
                    className="h-full transition-all duration-300"
                    style={{ flex: p.weekCount, backgroundColor: phaseColor(p.phase) }}
                    title={`${p.phase} — ${p.weekCount}wk`}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {state.phases.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phaseColor(p.phase) }} />
                    <span className="text-gray-300 font-medium flex-1">{p.phase}</span>
                    <span className="text-gray-500">{p.weekCount} wk</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500">Int: {p.intensityFocus}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500">Vol: {p.volumeFocus}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 italic">You can fine-tune each phase on the next step.</p>
            </div>
          )}
        </div>
      )}

      {/* Custom hint */}
      {state.blockFocus === 'custom' && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-400">You'll design your phases from scratch on the next step.</p>
          <p className="text-xs text-gray-600 mt-1">Add any combination of Hypertrophy, Strength, Peaking, Deload, and more.</p>
        </div>
      )}
    </div>
  );
};

function phaseColor(p: TrainingPhase): string {
  switch (p) {
    case TrainingPhase.GPP:              return '#0ea5e9';
    case TrainingPhase.HYPERTROPHY:      return '#4f46e5';
    case TrainingPhase.ACCUMULATION:     return '#3b82f6';
    case TrainingPhase.STRENGTH:         return '#7c3aed';
    case TrainingPhase.INTENSIFICATION:  return '#9333ea';
    case TrainingPhase.POWER:            return '#c026d3';
    case TrainingPhase.REALIZATION:      return '#db2777';
    case TrainingPhase.PEAKING:          return '#e11d48';
    case TrainingPhase.DELOAD:           return '#64748b';
    default: return '#6b7280';
  }
}

export default StepBlockGoal;
