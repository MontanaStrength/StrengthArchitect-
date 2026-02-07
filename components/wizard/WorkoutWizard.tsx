import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FormData, OptimizerConfig } from '../../types';
import { TrainingContext } from '../../services/geminiService';
import { WizardStepConfig, WizardStepProps } from './types';

// Steps — import and register here. To add/remove/reorder steps, just
// edit the WIZARD_STEPS array. That's it.
import StepGoal from './StepGoal';
import StepSession from './StepSession';
import StepProfile from './StepProfile';
import StepReview from './StepReview';

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: 'goal',
    title: 'Training Focus',
    subtitle: 'What are you training for today?',
    component: StepGoal,
  },
  {
    id: 'session',
    title: "Today's Session",
    subtitle: 'Duration & readiness check',
    component: StepSession,
  },
  {
    id: 'profile',
    title: 'Your Profile',
    subtitle: 'Experience & lifting stats',
    component: StepProfile,
  },
  {
    id: 'review',
    title: 'Review & Generate',
    subtitle: 'Confirm and build your workout',
    component: StepReview,
  },
];

// ─── Props ────────────────────────────────────────────────────
export interface WorkoutWizardProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  trainingContext: TrainingContext | null;
  optimizerConfig: OptimizerConfig;
  onGenerate: () => void;
  isGenerating: boolean;
  error: string;
}

// ─── Component ────────────────────────────────────────────────
const WorkoutWizard: React.FC<WorkoutWizardProps> = ({
  formData,
  setFormData,
  trainingContext,
  optimizerConfig,
  onGenerate,
  isGenerating,
  error,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  // Filter to only visible steps
  const visibleSteps = useMemo(
    () => WIZARD_STEPS.filter(s => !s.isVisible || s.isVisible(formData)),
    [formData],
  );

  const current = visibleSteps[stepIndex] || visibleSteps[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  const handleChange = (patch: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...patch }));
  };

  const goNext = () => {
    if (!isLast) setStepIndex(i => i + 1);
  };
  const goBack = () => {
    if (!isFirst) setStepIndex(i => i - 1);
  };
  const goTo = (idx: number) => {
    if (idx >= 0 && idx < visibleSteps.length) setStepIndex(idx);
  };

  // Shared step props
  const stepProps: WizardStepProps = {
    formData,
    onChange: handleChange,
    trainingContext,
    optimizerConfig,
  };

  const StepComponent = current.component;

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* ── Progress bar ────────────────────────────── */}
      <div className="flex items-center gap-1 mb-2 px-1">
        {visibleSteps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= stepIndex ? 'bg-amber-500' : 'bg-neutral-700'
            }`}
            aria-label={`Go to step: ${s.title}`}
          />
        ))}
      </div>

      {/* Step count */}
      <p className="text-[11px] text-gray-500 text-right mb-6 pr-1">
        {stepIndex + 1} / {visibleSteps.length}
      </p>

      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">{current.title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{current.subtitle}</p>
      </div>

      {/* ── Step content ────────────────────────────── */}
      <div className="min-h-[320px]">
        {current.id === 'review' ? (
          <StepReview
            {...stepProps}
            onGenerate={onGenerate}
            isGenerating={isGenerating}
            error={error}
          />
        ) : (
          <StepComponent {...stepProps} />
        )}
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      {current.id !== 'review' && (
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={goBack}
            disabled={isFirst}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              isFirst
                ? 'text-neutral-600 cursor-default'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <button
            onClick={goNext}
            className="flex items-center gap-1 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-sm transition-all"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkoutWizard;
