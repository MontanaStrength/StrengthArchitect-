import React from 'react';
import { WizardStepProps } from './types';
import { TrainingGoalFocus } from '../../shared/types';

const GOALS: { value: TrainingGoalFocus; label: string; desc: string; icon: string }[] = [
  { value: 'strength',    label: 'Strength',    desc: 'Heavy loads, low reps',          icon: '🏋️' },
  { value: 'hypertrophy', label: 'Hypertrophy', desc: 'Muscle growth & volume',         icon: '💪' },
  { value: 'power',       label: 'Power',       desc: 'Explosive speed & force',        icon: '⚡' },
  { value: 'endurance',   label: 'Endurance',   desc: 'High reps, conditioning',        icon: '🫁' },
  { value: 'general',     label: 'General',     desc: 'Balanced, full-body fitness',    icon: '🎯' },
];

const StepGoal: React.FC<WizardStepProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    {GOALS.map(g => {
      const active = formData.trainingGoalFocus === g.value;
      return (
        <button
          key={g.value}
          onClick={() => onChange({ trainingGoalFocus: g.value })}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
            active
              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
              : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
          }`}
        >
          <span className="text-2xl">{g.icon}</span>
          <div>
            <div className={`font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{g.label}</div>
            <div className="text-xs text-gray-400">{g.desc}</div>
          </div>
        </button>
      );
    })}
  </div>
);

export default StepGoal;
