import React, { useMemo } from 'react';
import {
  TrainingBlock, ReadinessLevel, StrengthWorkoutPlan, SavedWorkout,
  GymSetup, FeedbackData,
} from '../types';
import WorkoutCard from './WorkoutCard';
import FeedbackSection from './FeedbackSection';
import LoadingView from './LoadingView';
import { Dumbbell, Zap, RefreshCw, Layers } from 'lucide-react';

interface Props {
  activeBlock: TrainingBlock | null;
  currentPlan: StrengthWorkoutPlan | null;
  currentWorkout: SavedWorkout | null;
  gymSetup: GymSetup;
  readiness: ReadinessLevel;
  isGenerating: boolean;
  error: string;
  onReadinessChange: (r: ReadinessLevel) => void;
  onGenerate: () => void;
  onStartSession: () => void;
  onNewWorkout: () => void;
  onSaveFeedback: (workoutId: string, feedback: FeedbackData) => void;
  onNavigatePlan: () => void;
}

const READINESS_OPTIONS: { level: ReadinessLevel; label: string; emoji: string; activeClass: string }[] = [
  { level: ReadinessLevel.LOW,    label: 'Low',   emoji: '😴', activeClass: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { level: ReadinessLevel.MEDIUM, label: 'Good',  emoji: '💪', activeClass: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  { level: ReadinessLevel.HIGH,   label: 'Great', emoji: '🔥', activeClass: 'border-green-500 bg-green-500/10 text-green-400' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LiftView: React.FC<Props> = ({
  activeBlock, currentPlan, currentWorkout, gymSetup,
  readiness, isGenerating, error,
  onReadinessChange, onGenerate, onStartSession,
  onNewWorkout, onSaveFeedback, onNavigatePlan,
}) => {

  // Compute block context — week number, rest day, next session
  const blockContext = useMemo(() => {
    if (!activeBlock) return null;
    const now = Date.now();
    const elapsed = now - activeBlock.startDate;
    const weekNum = Math.min(
      Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1,
      activeBlock.lengthWeeks || 8,
    );
    const totalWeeks = activeBlock.lengthWeeks || 8;
    const todayDow = new Date().getDay(); // 0=Sun
    const days = activeBlock.trainingDays;
    const isTrainingDay = days ? days.includes(todayDow) : true;

    let nextTrainingDay: string | null = null;
    if (!isTrainingDay && days?.length) {
      for (let offset = 1; offset <= 7; offset++) {
        const d = (todayDow + offset) % 7;
        if (days.includes(d)) {
          nextTrainingDay = DAY_NAMES[d];
          break;
        }
      }
    }

    return { weekNum, totalWeeks, isTrainingDay, nextTrainingDay, blockName: activeBlock.name };
  }, [activeBlock]);

  // ──────────────────────────────────────────────────
  // STATE: No active block
  // ──────────────────────────────────────────────────
  if (!activeBlock) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-card bg-sa-surface2 flex items-center justify-center mx-auto">
          <Layers size={32} className="text-gray-600" />
        </div>
        <h2 className="text-lg font-bold text-white">No Active Block</h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
          Set up your training plan first — block name, schedule, and exercises.
        </p>
        <button
          onClick={onNavigatePlan}
          className="sa-btn sa-btn-primary mt-4"
        >
          Go to Plan →
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // STATE: Rest day
  // ──────────────────────────────────────────────────
  if (blockContext && !blockContext.isTrainingDay) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl">🛌</div>
        <h2 className="text-lg font-bold text-white">Rest Day</h2>
        <p className="text-gray-400 text-sm">
          Week {blockContext.weekNum} of {blockContext.totalWeeks} · {blockContext.blockName}
        </p>
        {blockContext.nextTrainingDay && (
          <p className="text-gray-500 text-sm">
            Next session: <span className="text-amber-400 font-semibold">{blockContext.nextTrainingDay}</span>
          </p>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // STATE: Generating — multi-step progress
  // ──────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <LoadingView
        contextLabel={blockContext ? `Week ${blockContext.weekNum}/${blockContext.totalWeeks} · ${blockContext.blockName}` : undefined}
      />
    );
  }

  // ──────────────────────────────────────────────────
  // STATE: Workout generated — show card + start
  // ──────────────────────────────────────────────────
  if (currentPlan) {
    return (
      <div className="space-y-6">
        {blockContext && (
          <div className="text-center">
            <p className="sa-section-label">
              Week {blockContext.weekNum}/{blockContext.totalWeeks} · {blockContext.blockName}
            </p>
          </div>
        )}

        <WorkoutCard plan={currentPlan} gymSetup={gymSetup} />

        <div className="flex gap-3">
          <button
            onClick={onStartSession}
            className="sa-btn sa-btn-primary flex-1 py-3.5 text-base flex items-center justify-center gap-2"
          >
            <Dumbbell size={18} /> Start Session
          </button>
          <button
            onClick={onNewWorkout}
            className="sa-btn sa-btn-secondary px-5 py-3.5 flex items-center gap-2"
          >
            <RefreshCw size={16} /> Rebuild
          </button>
        </div>

        {currentWorkout && (
          <FeedbackSection
            workoutId={currentWorkout.id}
            existingFeedback={currentWorkout.feedback}
            onSaveFeedback={onSaveFeedback}
          />
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // STATE: Ready to generate — readiness check
  // ──────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      {blockContext && (
        <div className="text-center">
          <h2 className="text-lg font-bold text-white tracking-tight">Today's Lift</h2>
          <p className="text-sm text-gray-500 mt-1">
            Week {blockContext.weekNum}/{blockContext.totalWeeks} · {blockContext.blockName}
          </p>
        </div>
      )}

      {/* Readiness */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-300">How are you feeling?</label>
        <div className="grid grid-cols-3 gap-3">
          {READINESS_OPTIONS.map(opt => {
            const active = readiness === opt.level;
            return (
              <button
                key={opt.level}
                onClick={() => onReadinessChange(opt.level)}
                className={`py-5 rounded-card text-center transition-all border-2 ${
                  active ? opt.activeClass : 'border-sa-surface2 bg-sa-surface1 text-gray-500 hover:border-sa-surface3'
                }`}
              >
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className="text-xs font-bold">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="sa-error">{error}</div>
      )}

      {/* Generate */}
      <button
        onClick={onGenerate}
        className="sa-btn sa-btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
      >
        <Zap size={20} /> Build Today's Workout
      </button>
    </div>
  );
};

export default LiftView;
