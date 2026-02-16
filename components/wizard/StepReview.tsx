import React from 'react';
import { WizardStepProps } from './types';
import { ReadinessLevel, TrainingExperience } from '../../shared/types';
import { Sparkles, ArrowRight } from 'lucide-react';

/** Summary card labels */
const goalLabel: Record<string, string> = {
  strength: '🏋️ Strength',
  hypertrophy: '💪 Hypertrophy',
  power: '⚡ Power',
  endurance: '🫁 Endurance',
  general: '🎯 General',
};

const readinessEmoji: Record<ReadinessLevel, string> = {
  [ReadinessLevel.LOW]: '😴',
  [ReadinessLevel.MEDIUM]: '💪',
  [ReadinessLevel.HIGH]: '🔥',
};

interface StepReviewProps extends WizardStepProps {
  onGenerate: () => void;
  isGenerating: boolean;
  error?: string;
}

const StepReview: React.FC<StepReviewProps> = ({
  formData,
  trainingContext,
  optimizerConfig,
  onGenerate,
  isGenerating,
  error,
}) => {
  const rows: { label: string; value: string }[] = [
    { label: 'Goal',       value: goalLabel[formData.trainingGoalFocus] || formData.trainingGoalFocus },
    { label: 'Duration',   value: `${formData.duration} min` },
    { label: 'Readiness',  value: `${readinessEmoji[formData.readiness]} ${formData.readiness.split(' (')[0]}` },
    { label: 'Experience', value: formData.trainingExperience },
    { label: 'Bodyweight', value: `${formData.weightLbs} lbs` },
  ];

  // Add 1RMs if any exist
  const lifts = [
    formData.squat1RM        && `S: ${formData.squat1RM}`,
    formData.benchPress1RM   && `B: ${formData.benchPress1RM}`,
    formData.deadlift1RM     && `D: ${formData.deadlift1RM}`,
    formData.overheadPress1RM && `O: ${formData.overheadPress1RM}`,
  ].filter(Boolean);

  if (lifts.length) {
    rows.push({ label: '1RMs', value: lifts.join(' · ') });
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 divide-y divide-neutral-700/60 overflow-hidden">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-gray-400">{r.label}</span>
            <span className="text-sm font-semibold text-white">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Optimizer badge */}
      {optimizerConfig?.recommendations && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold">
            <Sparkles size={16} />
            Optimizer Active
          </div>
          <p className="text-xs text-purple-400 mt-1">
            {optimizerConfig.recommendations.rationale}
          </p>
          <p className="text-xs text-purple-300 mt-1">
            Target: {optimizerConfig.recommendations.sessionVolume} sets · {optimizerConfig.recommendations.repScheme} · {optimizerConfig.recommendations.intensityRange.min}–{optimizerConfig.recommendations.intensityRange.max}% 1RM
          </p>
        </div>
      )}

      {/* Active block */}
      {trainingContext && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 text-sm">
          <span className="text-blue-300 font-semibold">📋 Active Block:</span>{' '}
          <span className="text-blue-200">
            {trainingContext.blockName} — {trainingContext.phaseName} (Week {trainingContext.weekInPhase}/{trainingContext.totalWeeksInPhase})
          </span>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={() => onGenerate()}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-wait text-black font-bold rounded-xl text-lg transition-all shadow-lg shadow-amber-500/25"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Generating…
          </>
        ) : (
          <>
            🏋️ Generate Workout <ArrowRight size={20} />
          </>
        )}
      </button>

      {error && (
        <div className="bg-amber-900/50 border border-amber-700 rounded-xl p-4 text-amber-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default StepReview;
