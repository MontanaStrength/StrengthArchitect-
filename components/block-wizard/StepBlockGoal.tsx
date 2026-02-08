import React from 'react';
import { BlockStepProps } from './types';
import { PERIODIZATION_TEMPLATES, TrainingPhase } from '../../types';
import { Layers, Wrench } from 'lucide-react';

const GOALS = [
  { value: 'Powerlifting Meet', icon: '🏆', desc: 'Peak for a competition' },
  { value: 'Hypertrophy Cycle', icon: '💪', desc: 'Focused muscle growth' },
  { value: 'General Strength',  icon: '🏋️', desc: 'Get stronger across the board' },
  { value: 'Body Recomp',       icon: '🔥', desc: 'Build muscle, lose fat' },
  { value: 'Sport Performance', icon: '⚡', desc: 'Power & athleticism' },
  { value: 'Custom',            icon: '🎯', desc: 'Define your own goal' },
];

const StepBlockGoal: React.FC<BlockStepProps> = ({ state, onChange }) => {
  return (
    <div className="space-y-8">
      {/* Goal selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">What's the goal?</label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map(g => {
            const active = state.goalEvent === g.value;
            return (
              <button
                key={g.value}
                onClick={() => onChange({ goalEvent: g.value })}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  active
                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                <div>
                  <div className={`text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{g.value}</div>
                  <div className="text-[10px] text-gray-400">{g.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode: template or custom */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">How do you want to build it?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ mode: 'template' })}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
              state.mode === 'template'
                ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            <Layers size={24} className={state.mode === 'template' ? 'text-amber-400' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${state.mode === 'template' ? 'text-amber-400' : 'text-white'}`}>From Template</span>
            <span className="text-[10px] text-gray-400 text-center">Start from a proven program</span>
          </button>
          <button
            onClick={() => onChange({ mode: 'custom' })}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
              state.mode === 'custom'
                ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            <Wrench size={24} className={state.mode === 'custom' ? 'text-amber-400' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${state.mode === 'custom' ? 'text-amber-400' : 'text-white'}`}>Custom Build</span>
            <span className="text-[10px] text-gray-400 text-center">Design your own phases</span>
          </button>
        </div>
      </div>

      {/* Template picker (only in template mode) */}
      {state.mode === 'template' && (
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">Choose a template</label>
          <div className="space-y-2">
            {Object.entries(PERIODIZATION_TEMPLATES).map(([key, tmpl]) => {
              const active = state.templateKey === key;
              const totalWeeks = tmpl.phases.reduce((s, p) => s + p.weekCount, 0);
              return (
                <button
                  key={key}
                  onClick={() => onChange({ templateKey: key, phases: tmpl.phases, name: state.name || tmpl.name })}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                      : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{tmpl.name}</span>
                    <span className="text-xs text-gray-500">{totalWeeks} weeks</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {tmpl.phases.map((p, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full"
                        style={{ flex: p.weekCount, backgroundColor: phaseColor(p.phase) }}
                        title={`${p.phase} — ${p.weekCount}wk`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
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

export default StepBlockGoal;
