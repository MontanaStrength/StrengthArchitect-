import React from 'react';
import { WizardStepProps } from './types';
import { TrainingExperience } from '../../types';

const EXPERIENCE: { value: TrainingExperience; label: string; desc: string }[] = [
  { value: TrainingExperience.BEGINNER,     label: 'Beginner',     desc: '< 1 year consistent training' },
  { value: TrainingExperience.INTERMEDIATE, label: 'Intermediate', desc: '1–3 years structured training' },
  { value: TrainingExperience.ADVANCED,     label: 'Advanced',     desc: '3–7 years, periodized programs' },
  { value: TrainingExperience.ELITE,        label: 'Elite',        desc: '7+ years, competitive level' },
];

const LIFTS = [
  { key: 'squat1RM'        as const, label: 'Squat' },
  { key: 'benchPress1RM'   as const, label: 'Bench Press' },
  { key: 'deadlift1RM'     as const, label: 'Deadlift' },
  { key: 'overheadPress1RM' as const, label: 'OHP' },
];

const StepProfile: React.FC<WizardStepProps> = ({ formData, onChange }) => (
  <div className="space-y-8">
    {/* Experience Level */}
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-3">Experience Level</label>
      <div className="grid grid-cols-2 gap-2">
        {EXPERIENCE.map(e => {
          const active = formData.trainingExperience === e.value;
          return (
            <button
              key={e.value}
              onClick={() => onChange({ trainingExperience: e.value })}
              className={`p-3 rounded-xl border text-left transition-all ${
                active
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                  : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500'
              }`}
            >
              <div className={`text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{e.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{e.desc}</div>
            </button>
          );
        })}
      </div>
    </div>

    {/* Personal stats row */}
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-3">About You</label>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Weight</label>
          <div className="relative mt-1">
            <input
              type="number"
              value={formData.weightLbs}
              onChange={e => onChange({ weightLbs: Number(e.target.value) })}
              className="w-full p-2.5 pr-8 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">lbs</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={e => onChange({ age: Number(e.target.value) })}
            className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Gender</label>
          <select
            value={formData.gender}
            onChange={e => onChange({ gender: e.target.value as 'male' | 'female' })}
            className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>
    </div>

    {/* 1RM Inputs */}
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1">Known 1RMs</label>
      <p className="text-xs text-gray-500 mb-3">Optional — helps the AI scale weights accurately</p>
      <div className="grid grid-cols-2 gap-3">
        {LIFTS.map(lift => (
          <div key={lift.key}>
            <label className="text-xs text-gray-500">{lift.label}</label>
            <div className="relative mt-1">
              <input
                type="number"
                value={formData[lift.key] || ''}
                onChange={e => onChange({ [lift.key]: Number(e.target.value) || undefined })}
                className="w-full p-2.5 pr-8 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="—"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">lbs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default StepProfile;
