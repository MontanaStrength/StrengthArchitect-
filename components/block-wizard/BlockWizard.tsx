import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  TrainingBlock,
  ScheduledWorkout,
} from '../../shared/types';
import { BlockWizardState, BlockStepConfig, BlockStepProps, DEFAULT_BLOCK_STATE, generatePhasesForFocus } from './types';

import StepBlockGoal from './StepBlockGoal';
import StepPhaseDesigner from './StepPhaseDesigner';
import StepSchedule from './StepSchedule';
import StepBlockReview from './StepBlockReview';

// ─── Step registry ──────────────────────────────────────────────
// To add a new step: import it, then add an entry here.

const BLOCK_STEPS: BlockStepConfig[] = [
  {
    id: 'goal',
    title: 'Block Focus',
    subtitle: 'What kind of training block do you want?',
    component: StepBlockGoal,
  },
  {
    id: 'phases',
    title: 'Design Phases',
    subtitle: 'Configure each mesocycle',
    component: StepPhaseDesigner,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    subtitle: 'Dates, naming & calendar',
    component: StepSchedule,
  },
  {
    id: 'review',
    title: 'Review & Create',
    subtitle: 'Confirm your training block',
    component: StepBlockReview as any, // extra props handled below
  },
];

// ─── Props ──────────────────────────────────────────────────────
export interface BlockWizardProps {
  /** Existing blocks — used to auto-name and check for conflicts */
  existingBlocks: TrainingBlock[];
  /** Called when the block is finalized */
  onCreateBlock: (block: TrainingBlock) => void;
  /** Called for each scheduled workout to add to calendar */
  onScheduleWorkouts?: (workouts: ScheduledWorkout[]) => void;
  /** Navigate away when done */
  onComplete: () => void;
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────────
const BlockWizard: React.FC<BlockWizardProps> = ({
  existingBlocks,
  onCreateBlock,
  onScheduleWorkouts,
  onComplete,
  onCancel,
}) => {
  const [state, setState] = useState<BlockWizardState>(() => {
    const init = { ...DEFAULT_BLOCK_STATE };
    init.phases = generatePhasesForFocus(init.blockFocus, init.totalWeeks, init.defaultSessionsPerWeek, init.defaultSplitPattern);
    return init;
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const visibleSteps = useMemo(
    () => BLOCK_STEPS.filter(s => !s.isVisible || s.isVisible(state)),
    [state],
  );

  const current = visibleSteps[stepIndex] || visibleSteps[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  const handleChange = useCallback((patch: Partial<BlockWizardState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const goNext = () => { if (!isLast) setStepIndex(i => i + 1); };
  const goBack = () => { if (!isFirst) setStepIndex(i => i - 1); };
  const goTo = (idx: number) => { if (idx >= 0 && idx < visibleSteps.length) setStepIndex(idx); };

  // ─── Create the block ──────────────────────────────────────
  const handleCreateBlock = useCallback(() => {
    setIsCreating(true);

    const block: TrainingBlock = {
      id: crypto.randomUUID(),
      name: state.name || 'Training Block',
      startDate: new Date(state.startDate).getTime(),
      goalDate: state.goalDate ? new Date(state.goalDate).getTime() : undefined,
      goalEvent: state.goalEvent || undefined,
      phases: state.phases,
      isActive: existingBlocks.every(b => !b.isActive), // auto-activate if none active
    };

    onCreateBlock(block);

    // Auto-populate calendar if enabled
    if (state.populateCalendar && onScheduleWorkouts) {
      const scheduled = generateScheduledWorkouts(block);
      onScheduleWorkouts(scheduled);
    }

    setIsCreating(false);
    onComplete();
  }, [state, existingBlocks, onCreateBlock, onScheduleWorkouts, onComplete]);

  // ─── Shared step props ─────────────────────────────────────
  const stepProps: BlockStepProps = {
    state,
    onChange: handleChange,
  };

  const StepComponent = current.component;

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Progress bar */}
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
      <p className="text-[11px] text-gray-500 text-right mb-6 pr-1">
        {stepIndex + 1} / {visibleSteps.length}
      </p>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">{current.title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{current.subtitle}</p>
      </div>

      {/* Step content */}
      <div className="min-h-[320px]">
        {current.id === 'review' ? (
          <StepBlockReview
            {...stepProps}
            onCreateBlock={handleCreateBlock}
            isCreating={isCreating}
          />
        ) : (
          <StepComponent {...stepProps} />
        )}
      </div>

      {/* Navigation */}
      {current.id !== 'review' && (
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={isFirst ? onCancel : goBack}
            className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} /> {isFirst ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={goNext}
            disabled={state.phases.length === 0 && state.blockFocus !== 'custom'}
            className="flex items-center gap-1 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-bold rounded-lg text-sm transition-all"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Calendar auto-population ────────────────────────────────
function generateScheduledWorkouts(block: TrainingBlock): ScheduledWorkout[] {
  const workouts: ScheduledWorkout[] = [];
  const blockStartMs = block.startDate;
  let weekOffset = 0;

  for (let phaseIdx = 0; phaseIdx < block.phases.length; phaseIdx++) {
    const phase = block.phases[phaseIdx];

    for (let week = 0; week < phase.weekCount; week++) {
      const weekStartMs = blockStartMs + (weekOffset + week) * 7 * 24 * 60 * 60 * 1000;

      // Distribute sessions evenly across the week
      const daySpacing = Math.floor(7 / phase.sessionsPerWeek);
      for (let session = 0; session < phase.sessionsPerWeek; session++) {
        const dayOffset = session * daySpacing;
        const dateMs = weekStartMs + dayOffset * 24 * 60 * 60 * 1000;
        const dateStr = new Date(dateMs).toISOString().split('T')[0];

        const intensityMap: Record<string, 'low' | 'moderate' | 'high' | 'rest'> = {
          minimal: 'rest',
          low: 'low',
          moderate: 'moderate',
          high: 'high',
          'very-high': 'high',
        };

        workouts.push({
          id: crypto.randomUUID(),
          date: dateStr,
          label: `${phase.phase} — Wk${week + 1} Day${session + 1}`,
          phase: phase.phase,
          suggestedIntensity: intensityMap[phase.intensityFocus] || 'moderate',
          suggestedDuration: 60,
          status: 'planned',
          trainingBlockId: block.id,
          phaseIndex: phaseIdx,
          weekIndex: week,
          dayIndex: session,
        });
      }
    }
    weekOffset += phase.weekCount;
  }

  return workouts;
}

export default BlockWizard;
