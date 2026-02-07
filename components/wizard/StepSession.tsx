import React from 'react';
import { WizardStepProps } from './types';
import { ReadinessLevel } from '../../types';

const DURATIONS = [30, 45, 60, 75, 90];

const READINESS: { value: ReadinessLevel; label: string; emoji: string }[] = [
  { value: ReadinessLevel.LOW,    label: 'Recovery Day',       emoji: '😴' },
  { value: ReadinessLevel.MEDIUM, label: 'Regular Training',   emoji: '💪' },
  { value: ReadinessLevel.HIGH,   label: 'Peak Performance',   emoji: '🔥' },
];

const StepSession: React.FC<WizardStepProps> = ({ formData, onChange }) => (
  <div className="space-y-8">
    {/* Duration */}
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-3">How long do you have?</label>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => onChange({ duration: d })}
            className={`flex-1 min-w-[64px] py-3 rounded-xl border text-sm font-bold transition-all ${
              formData.duration === d
                ? 'bg-amber-500 border-amber-500 text-black'
                : 'bg-neutral-800/60 border-neutral-700 text-gray-300 hover:border-neutral-500'
            }`}
          >
            {d}<span className="text-[10px] font-normal ml-0.5">min</span>
          </button>
        ))}
      </div>
    </div>

    {/* Readiness */}
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-3">How are you feeling?</label>
      <div className="space-y-2">
        {READINESS.map(r => {
          const active = formData.readiness === r.value;
          return (
            <button
              key={r.value}
              onClick={() => onChange({ readiness: r.value })}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                active
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                  : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
              }`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className={`font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default StepSession;
