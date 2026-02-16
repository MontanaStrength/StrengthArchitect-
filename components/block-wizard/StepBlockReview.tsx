import React from 'react';
import { BlockStepProps } from './types';
import { TrainingPhase } from '../../shared/types';
import { CheckCircle2, Calendar, Dumbbell, Layers } from 'lucide-react';

interface StepBlockReviewProps extends BlockStepProps {
  onCreateBlock: () => void;
  isCreating: boolean;
}

const StepBlockReview: React.FC<StepBlockReviewProps> = ({ state, onCreateBlock, isCreating }) => {
  const totalWeeks = state.phases.reduce((s, p) => s + p.weekCount, 0);
  const totalSessions = state.phases.reduce((s, p) => s + p.weekCount * p.sessionsPerWeek, 0);
  const startMs = new Date(state.startDate).getTime();
  const endDate = new Date(startMs + totalWeeks * 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      {/* Block name & meta */}
      <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-5">
        <h3 className="text-lg font-bold text-white">{state.name || 'Untitled Block'}</h3>
        {state.goalEvent && <p className="text-sm text-gray-400 mt-0.5">🎯 {state.goalEvent}</p>}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{totalWeeks}</div>
            <div className="text-[10px] text-gray-500 uppercase">Weeks</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{state.phases.length}</div>
            <div className="text-[10px] text-gray-500 uppercase">Phases</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">~{totalSessions}</div>
            <div className="text-[10px] text-gray-500 uppercase">Sessions</div>
          </div>
        </div>
      </div>

      {/* Visual timeline */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Block Timeline</label>
        <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
          {state.phases.map((p, i) => (
            <div
              key={i}
              className="h-full"
              style={{ flex: p.weekCount, backgroundColor: phaseColor(p.phase) }}
              title={`${p.phase} — ${p.weekCount}wk`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>{new Date(state.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Phase breakdown */}
      <div className="space-y-2">
        {state.phases.map((phase, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 bg-neutral-800/40 border border-neutral-700/50 rounded-lg px-4 py-3"
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: phaseColor(phase.phase) }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{phase.phase}</div>
              <div className="text-[10px] text-gray-400">
                {phase.weekCount}wk · {phase.sessionsPerWeek}x/wk · {phase.splitPattern.replace(/-/g, ' ')} · Int: {phase.intensityFocus} · Vol: {phase.volumeFocus}
              </div>
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">
              {phase.weekCount * phase.sessionsPerWeek} sessions
            </div>
          </div>
        ))}
      </div>

      {/* Calendar note */}
      {state.populateCalendar && (
        <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/40 rounded-xl p-3 text-xs text-blue-300">
          <Calendar size={14} className="mt-0.5 flex-shrink-0" />
          <span>Your training calendar will be auto-populated with {totalSessions} scheduled sessions.</span>
        </div>
      )}

      {/* Create button */}
      <button
        onClick={onCreateBlock}
        disabled={isCreating || state.phases.length === 0}
        className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-amber-500/25"
      >
        {isCreating ? (
          <>
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Layers size={20} /> Create Training Block
          </>
        )}
      </button>
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

export default StepBlockReview;
