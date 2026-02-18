import React, { useMemo, useState } from 'react';
import {
  TrainingBlock, ReadinessLevel, StrengthWorkoutPlan, SavedWorkout,
  GymSetup, FeedbackData, PreWorkoutCheckIn, MoodLevel, SorenessLevel, NutritionQuality,
} from '../shared/types';
import WorkoutCard from './WorkoutCard';
import FeedbackSection from './FeedbackSection';
import LoadingView from './LoadingView';
import { workoutToCsv, workoutToClipboardData, workoutExportFilename } from '../shared/utils/workoutToSheets';
import { Dumbbell, Zap, RefreshCw, Layers, FileSpreadsheet, Download, Copy, Check, ChevronDown, ChevronUp, Moon, Activity } from 'lucide-react';

interface Props {
  activeBlock: TrainingBlock | null;
  currentPlan: StrengthWorkoutPlan | null;
  currentWorkout: SavedWorkout | null;
  gymSetup: GymSetup;
  readiness: ReadinessLevel;
  isGenerating: boolean;
  error: string;
  /** When true, copy and buttons refer to the client (e.g. "Build Sarah's Workout") */
  isCoachMode?: boolean;
  /** Client's first name for coach-mode labels */
  clientName?: string;
  preWorkoutCheckIn?: PreWorkoutCheckIn;
  onReadinessChange: (r: ReadinessLevel) => void;
  onCheckInChange: (checkIn: PreWorkoutCheckIn) => void;
  onGenerate: () => void;
  onStartSession: () => void;
  onNewWorkout: () => void;
  onSaveFeedback: (workoutId: string, feedback: FeedbackData) => void;
  onNavigatePlan: () => void;
  onSwapExercise?: (oldExerciseId: string, newExerciseId: string, newExerciseName: string) => void;
  /** Rebuild the session with the chosen exercise (AI regenerates with this exercise locked in) */
  onSwapAndRebuild?: (oldExerciseId: string, newExerciseId: string, newExerciseName: string) => void;
}

const READINESS_OPTIONS: { level: ReadinessLevel; label: string; emoji: string; activeClass: string }[] = [
  { level: ReadinessLevel.LOW,    label: 'Low',   emoji: '😴', activeClass: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { level: ReadinessLevel.MEDIUM, label: 'Good',  emoji: '💪', activeClass: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  { level: ReadinessLevel.HIGH,   label: 'Great', emoji: '🔥', activeClass: 'border-green-500 bg-green-500/10 text-green-400' },
];

const MOOD_OPTIONS: { value: MoodLevel; label: string; emoji: string }[] = [
  { value: 'poor',  label: 'Poor',  emoji: '😞' },
  { value: 'okay',  label: 'Okay',  emoji: '😐' },
  { value: 'good',  label: 'Good',  emoji: '🙂' },
  { value: 'great', label: 'Great', emoji: '😁' },
];

const SORENESS_OPTIONS: { value: SorenessLevel; label: string; emoji: string }[] = [
  { value: 'none',     label: 'None',   emoji: '✅' },
  { value: 'mild',     label: 'Mild',   emoji: '🟡' },
  { value: 'moderate', label: 'Sore',   emoji: '🟠' },
  { value: 'severe',   label: 'Wrecked', emoji: '🔴' },
];

const NUTRITION_OPTIONS: { value: NutritionQuality; label: string; emoji: string }[] = [
  { value: 'poor',   label: 'Poor',   emoji: '🍕' },
  { value: 'fair',   label: 'Fair',   emoji: '🥪' },
  { value: 'good',   label: 'Good',   emoji: '🥗' },
  { value: 'dialed', label: 'Dialed', emoji: '💯' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LiftView: React.FC<Props> = ({
  activeBlock, currentPlan, currentWorkout, gymSetup,
  readiness, isGenerating, error,
  isCoachMode, clientName,
  preWorkoutCheckIn,
  onReadinessChange, onCheckInChange, onGenerate, onStartSession,
  onNewWorkout, onSaveFeedback, onNavigatePlan, onSwapExercise, onSwapAndRebuild,
}) => {
  const [copied, setCopied] = useState(false);
  const [overrideRestDay, setOverrideRestDay] = useState(false);
  const [showRecoveryDetails, setShowRecoveryDetails] = useState(false);

  const checkIn = preWorkoutCheckIn ?? {};
  const updateCheckIn = (updates: Partial<PreWorkoutCheckIn>) => {
    onCheckInChange({ ...checkIn, ...updates });
  };

  // HRV vs baseline: only when both provided; typical RMSSD 20–200 ms
  const hrvVsBaseline =
    checkIn.hrvBaselineMs != null && checkIn.hrvBaselineMs > 0 && checkIn.hrvTodayMs != null && checkIn.hrvTodayMs >= 0
      ? (checkIn.hrvTodayMs - checkIn.hrvBaselineMs) / checkIn.hrvBaselineMs
      : null;

  const displayName = (isCoachMode && clientName) ? clientName : null;
  const readinessLabel = displayName ? `How is ${displayName} feeling?` : 'How are you feeling?';
  const buildButtonLabel = displayName ? `Build ${displayName}'s Workout` : "Build Today's Workout";
  const noBlockTitle = displayName ? `No Active Block for ${displayName}` : 'No Active Block';
  const noBlockSubtitle = displayName
    ? `Set up ${displayName}'s training plan in Plan first — block, schedule, and exercises.`
    : 'Set up your training plan first — block name, schedule, and exercises.';

  // Compute block context — week number, rest day, next session
  // Week number = full weeks elapsed since block start (0–6 days → Week 1, 7–13 → Week 2). totalWeeks from phases sum when available.
  const blockContext = useMemo(() => {
    if (!activeBlock) return null;
    const totalWeeks =
      activeBlock.phases?.length > 0
        ? activeBlock.phases.reduce((s, p) => s + p.weekCount, 0)
        : activeBlock.lengthWeeks || 8;
    const now = Date.now();
    const elapsed = now - activeBlock.startDate;
    const weekNum = Math.min(
      Math.max(1, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1),
      totalWeeks,
    );
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
          <Layers size={32} className="text-sa-textMuted" />
        </div>
        <h2 className="sa-view-title">{noBlockTitle}</h2>
        <p className="text-sa-textTertiary text-sm max-w-xs mx-auto leading-relaxed">
          {noBlockSubtitle}
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
  if (blockContext && !blockContext.isTrainingDay && !overrideRestDay) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl">🛌</div>
        <h2 className="sa-view-title">Rest Day</h2>
        <p className="text-sa-textTertiary text-sm">
          Week {blockContext.weekNum} of {blockContext.totalWeeks} · {blockContext.blockName}
        </p>
        {blockContext.nextTrainingDay && (
          <p className="text-sa-textMuted text-sm">
            Next session: <span className="text-sa-accentText font-semibold">{blockContext.nextTrainingDay}</span>
          </p>
        )}
        <button
          onClick={() => setOverrideRestDay(true)}
          className="sa-btn sa-btn-secondary mt-2"
        >
          💪 Train Anyway
        </button>
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
    const handleDownloadCsv = () => {
      const csv = workoutToCsv(currentPlan, displayName ?? undefined);
      const filename = workoutExportFilename(currentPlan, displayName ?? undefined);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleCopyForSheets = async () => {
      const { html, text } = workoutToClipboardData(currentPlan, displayName ?? undefined);
      try {
        // Use the rich clipboard API so Google Sheets gets formatted HTML
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: try plain text, then prompt
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this and paste into Google Sheets:', text);
        }
      }
    };

    return (
      <div className="space-y-6">
        {blockContext && (
          <div className="text-center">
            <p className="sa-section-label">
              Week {blockContext.weekNum}/{blockContext.totalWeeks} · {blockContext.blockName}
            </p>
          </div>
        )}

        <WorkoutCard plan={currentPlan} gymSetup={gymSetup} onSwapExercise={onSwapExercise} onSwapAndRebuild={onSwapAndRebuild} />

        {isCoachMode && (
          <div className="sa-card border-sa-info/30 bg-sa-info/10 rounded-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-sa-info flex items-center gap-2">
              <FileSpreadsheet size={18} /> Send to client (Google Sheets)
            </h3>
            <p className="text-xs text-sa-textTertiary">
              Download a CSV to upload to Google Sheets and share with {displayName || 'your client'}, or copy the table to paste into a new sheet.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="sa-btn sa-btn-primary py-2.5 px-4 flex items-center gap-2 text-sm"
              >
                <Download size={16} /> Download CSV for Sheets
              </button>
              <button
                type="button"
                onClick={handleCopyForSheets}
                className="sa-btn sa-btn-secondary py-2.5 px-4 flex items-center gap-2 text-sm"
              >
                {copied ? <Check size={16} className="text-sa-success" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy table (paste in Sheets)'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isCoachMode && (
            <button
              onClick={onStartSession}
              className="sa-btn sa-btn-primary flex-1 py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Dumbbell size={18} /> Start Session
            </button>
          )}
          {isCoachMode && (
            <button
              onClick={onStartSession}
              className="sa-btn sa-btn-secondary flex-1 py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Dumbbell size={18} /> Log session for client
            </button>
          )}
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
          <h2 className="sa-view-title tracking-tight">
            {displayName ? `${displayName}'s Lift` : "Today's Lift"}
          </h2>
          <p className="sa-view-subtitle mt-1">
            Week {blockContext.weekNum}/{blockContext.totalWeeks} · {blockContext.blockName}
          </p>
        </div>
      )}

      {/* Readiness */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-sa-textSecondary">{readinessLabel}</label>
        <div className="grid grid-cols-3 gap-3">
          {READINESS_OPTIONS.map(opt => {
            const active = readiness === opt.level;
            return (
              <button
                key={opt.level}
                onClick={() => onReadinessChange(opt.level)}
                className={`py-5 rounded-card text-center duration-sa ease-sa transition-colors border-2 ${
                  active ? opt.activeClass : 'border-sa-surface2 bg-sa-surface1 text-sa-textMuted hover:border-sa-surface3'
                }`}
              >
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className="text-xs font-bold">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recovery details (sleep + HRV) — optional, expandable */}
      <div className="rounded-card border border-sa-surface2 bg-sa-surface1 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRecoveryDetails(!showRecoveryDetails)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-sa-textSecondary hover:bg-sa-surface2 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Moon size={16} className="text-sa-textMuted" />
            Recovery details (sleep & HRV)
          </span>
          {showRecoveryDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showRecoveryDetails && (
          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-sa-surface2">
            {/* Sleep: 0–12 h, step 0.5 */}
            <div>
              <label className="block text-xs font-medium text-sa-textMuted mb-1.5">Sleep last night (hours)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  placeholder="e.g. 7"
                  value={checkIn.sleepHoursLastNight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    updateCheckIn({
                      sleepHoursLastNight: v != null && !Number.isNaN(v) ? Math.max(0, Math.min(12, v)) : undefined,
                    });
                  }}
                  className="w-24 rounded-lg border border-sa-surface3 bg-sa-surface2 px-3 py-2 text-sm text-white placeholder:text-sa-textMuted focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
                <span className="text-xs text-sa-textMuted">0–12 h (optional)</span>
              </div>
            </div>
            {/* HRV: baseline vs today (RMSSD in ms, typical 20–200) */}
            <div>
              <label className="block text-xs font-medium text-sa-textMuted mb-1.5 flex items-center gap-1.5">
                <Activity size={14} />
                HRV (e.g. RMSSD from watch, ms)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] text-sa-textMuted mb-1">Baseline (your typical)</span>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    step={1}
                    placeholder="e.g. 55"
                    value={checkIn.hrvBaselineMs ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      updateCheckIn({
                        hrvBaselineMs: v != null && !Number.isNaN(v) ? Math.max(10, Math.min(300, v)) : undefined,
                      });
                    }}
                    className="w-full rounded-lg border border-sa-surface3 bg-sa-surface2 px-3 py-2 text-sm text-white placeholder:text-sa-textMuted focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-sa-textMuted mb-1">Today (this morning)</span>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    step={1}
                    placeholder="e.g. 48"
                    value={checkIn.hrvTodayMs ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      updateCheckIn({
                        hrvTodayMs: v != null && !Number.isNaN(v) ? Math.max(10, Math.min(300, v)) : undefined,
                      });
                    }}
                    className="w-full rounded-lg border border-sa-surface3 bg-sa-surface2 px-3 py-2 text-sm text-white placeholder:text-sa-textMuted focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              </div>
              {hrvVsBaseline != null && (
                <p className="mt-2 text-xs text-sa-textSecondary">
                  {hrvVsBaseline < -0.15
                    ? `Today ${Math.round(hrvVsBaseline * 100)}% vs baseline — consider moderating volume.`
                    : hrvVsBaseline < 0
                      ? `Today slightly below baseline (${Math.round(hrvVsBaseline * 100)}%).`
                      : 'Today at or above baseline — good to go.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="sa-error">{error}</div>
      )}

      {/* Generate — call with no args so the click event is never passed as swapAndRebuild */}
      <button
        onClick={() => onGenerate()}
        className="sa-btn sa-btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
      >
        <Zap size={20} /> {buildButtonLabel}
      </button>
    </div>
  );
};

export default LiftView;
