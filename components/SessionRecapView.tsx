import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, CompletedSet } from '../shared/types';
import { Trophy, TrendingUp, Dumbbell, Clock, Flame, ChevronRight, BarChart3, Star } from 'lucide-react';

interface Props {
  workout: SavedWorkout;
  newPRs: LiftRecord[];
  sessionDurationSec: number;
  onContinue: () => void;
  onViewHistory: () => void;
}

const SessionRecapView: React.FC<Props> = ({ workout, newPRs, sessionDurationSec, onContinue, onViewHistory }) => {
  const tonnage = workout.actualTonnage || workout.estimatedTonnage || 0;
  const completedSets = workout.completedSets || [];
  const totalReps = completedSets.reduce((s, set) => s + set.reps, 0);
  const setsCompleted = completedSets.length;
  const totalSetsPlanned = workout.exercises.reduce((s, e) => s + e.sets, 0);
  const completionPct = totalSetsPlanned > 0 ? Math.round((setsCompleted / totalSetsPlanned) * 100) : 0;

  const durationMin = Math.round(sessionDurationSec / 60);

  // Motivational message based on performance
  const motivationMsg = useMemo(() => {
    const rpe = workout.sessionRPE || 7;
    if (newPRs.length >= 2) return { emoji: '🔥', text: 'Multiple PRs! You\'re on fire!' };
    if (newPRs.length === 1) return { emoji: '🏆', text: 'New personal record — strength is climbing!' };
    if (completionPct === 100 && rpe >= 8) return { emoji: '💪', text: 'All sets crushed at high intensity. Beast mode.' };
    if (completionPct === 100) return { emoji: '✅', text: 'Full session completed. Consistency wins.' };
    if (rpe >= 9) return { emoji: '😤', text: 'Grind session. Recovery is next priority.' };
    if (completionPct >= 80) return { emoji: '👊', text: 'Solid work today. Keep building.' };
    return { emoji: '🏋️', text: 'Every rep counts. You showed up.' };
  }, [workout, newPRs, completionPct]);

  // Exercise summary
  const exerciseSummary = useMemo(() => {
    return workout.exercises.map(ex => {
      const exSets = completedSets.filter(s => s.exerciseId === ex.exerciseId);
      const topWeight = Math.max(0, ...exSets.map(s => s.weightLbs));
      const totalExReps = exSets.reduce((s, set) => s + set.reps, 0);
      const hasPR = newPRs.some(pr => pr.exerciseId === ex.exerciseId);
      return { name: ex.exerciseName, setsCompleted: exSets.length, setsPlanned: ex.sets, topWeight, totalReps: totalExReps, hasPR };
    });
  }, [workout, completedSets, newPRs]);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Hero card */}
      <div className="sa-card bg-gradient-to-br from-sa-accent/10 via-transparent to-transparent border-sa-accent/20 rounded-card p-6 text-center space-y-3">
        <div className="text-5xl">{motivationMsg.emoji}</div>
        <h2 className="text-2xl font-bold text-sa-textPrimary">Session Complete</h2>
        <p className="text-sa-accentText font-medium">{motivationMsg.text}</p>
        <p className="text-sm text-sa-textTertiary">{workout.title}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sa-card sa-stat">
          <Flame size={16} className="text-sa-accent mx-auto mb-1" />
          <p className="sa-stat-value text-sa-textPrimary">{tonnage > 0 ? (tonnage / 1000).toFixed(1) + 'k' : '—'}</p>
          <p className="sa-stat-label">Tonnage (lbs)</p>
        </div>
        <div className="sa-card sa-stat">
          <Dumbbell size={16} className="text-sa-info mx-auto mb-1" />
          <p className="sa-stat-value text-sa-textPrimary">{setsCompleted}<span className="text-sm text-sa-textMuted">/{totalSetsPlanned}</span></p>
          <p className="sa-stat-label">Sets</p>
        </div>
        <div className="sa-card sa-stat">
          <TrendingUp size={16} className="text-sa-success mx-auto mb-1" />
          <p className="sa-stat-value text-sa-textPrimary">{totalReps}</p>
          <p className="sa-stat-label">Total Reps</p>
        </div>
        <div className="sa-card sa-stat">
          <Clock size={16} className="text-purple-400 mx-auto mb-1" />
          <p className="sa-stat-value text-sa-textPrimary">{durationMin}<span className="text-sm text-sa-textMuted">m</span></p>
          <p className="sa-stat-label">Duration</p>
        </div>
      </div>

      {/* Session RPE */}
      {workout.sessionRPE && (
        <div className="sa-card rounded-card p-4 flex items-center justify-between">
          <span className="text-sm text-sa-textTertiary">Session RPE</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-5 rounded-sm ${
                    i < workout.sessionRPE!
                      ? workout.sessionRPE! >= 9 ? 'bg-sa-danger' : workout.sessionRPE! >= 7 ? 'bg-sa-accent' : 'bg-sa-success'
                      : 'bg-sa-surface2'
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-sa-textPrimary ml-1">{workout.sessionRPE}</span>
          </div>
        </div>
      )}

      {/* PRs */}
      {newPRs.length > 0 && (
        <div className="sa-card border-sa-accentText/20 bg-sa-accent/5 rounded-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-sa-accentText flex items-center gap-2">
            <Trophy size={16} /> New Personal Records
          </h3>
          {newPRs.map(pr => (
            <div key={pr.id} className="flex items-center justify-between py-1.5 border-b border-sa-accent/10 last:border-0">
              <span className="text-sm text-sa-textPrimary">{pr.exerciseName}</span>
              <span className="text-sm font-bold text-sa-accentText">
                {Math.round(pr.estimated1RM)} lbs <span className="text-xs opacity-60">e1RM</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Exercise breakdown */}
      <div className="sa-card rounded-card divide-y divide-sa-border overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-sa-textTertiary flex items-center gap-2"><BarChart3 size={14} /> Exercise Breakdown</h3>
        </div>
        {exerciseSummary.map((ex, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {ex.hasPR && <Star size={12} className="text-sa-accentText shrink-0" />}
              <span className="text-sm text-sa-textPrimary truncate">{ex.name}</span>
            </div>
            <div className="text-right shrink-0 ml-3">
              <span className="text-xs text-sa-textTertiary">{ex.setsCompleted}/{ex.setsPlanned} sets</span>
              {ex.topWeight > 0 && <span className="text-xs text-sa-textMuted ml-2">top: {ex.topWeight}lbs</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Completion ring */}
      <div className="sa-card rounded-card p-4 flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--sa-surface-2)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={completionPct === 100 ? 'var(--sa-success)' : 'var(--sa-accent)'}
              strokeWidth="3"
              strokeDasharray={`${completionPct} ${100 - completionPct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-sa-textPrimary">
            {completionPct}%
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-sa-textPrimary">
            {completionPct === 100 ? 'Fully completed' : `${setsCompleted} of ${totalSetsPlanned} sets logged`}
          </p>
          <p className="text-xs text-sa-textMuted">
            {completionPct === 100 ? 'Every set accounted for 💯' : 'Partial completion — still counts!'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="sa-btn sa-btn-primary flex-1 py-3.5 flex items-center justify-center gap-2"
        >
          Continue <ChevronRight size={16} />
        </button>
        <button
          onClick={onViewHistory}
          className="sa-btn sa-btn-secondary px-5 py-3.5 text-sm"
        >
          History
        </button>
      </div>
    </div>
  );
};

export default SessionRecapView;
