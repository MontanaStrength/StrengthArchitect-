import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, CompletedSet } from '../types';
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
      <div className="bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-900 border border-amber-500/20 rounded-2xl p-6 text-center space-y-3">
        <div className="text-5xl">{motivationMsg.emoji}</div>
        <h2 className="text-2xl font-bold text-white">Session Complete</h2>
        <p className="text-amber-400 font-medium">{motivationMsg.text}</p>
        <p className="text-sm text-gray-400">{workout.title}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <Flame size={16} className="text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{tonnage > 0 ? (tonnage / 1000).toFixed(1) + 'k' : '—'}</p>
          <p className="text-[10px] text-gray-500 uppercase">Tonnage (lbs)</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <Dumbbell size={16} className="text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{setsCompleted}<span className="text-sm text-gray-500">/{totalSetsPlanned}</span></p>
          <p className="text-[10px] text-gray-500 uppercase">Sets</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <TrendingUp size={16} className="text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{totalReps}</p>
          <p className="text-[10px] text-gray-500 uppercase">Total Reps</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <Clock size={16} className="text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{durationMin}<span className="text-sm text-gray-500">m</span></p>
          <p className="text-[10px] text-gray-500 uppercase">Duration</p>
        </div>
      </div>

      {/* Session RPE */}
      {workout.sessionRPE && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">Session RPE</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-5 rounded-sm ${
                    i < workout.sessionRPE!
                      ? workout.sessionRPE! >= 9 ? 'bg-red-500' : workout.sessionRPE! >= 7 ? 'bg-amber-500' : 'bg-green-500'
                      : 'bg-neutral-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-white ml-1">{workout.sessionRPE}</span>
          </div>
        </div>
      )}

      {/* PRs */}
      {newPRs.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
            <Trophy size={16} /> New Personal Records
          </h3>
          {newPRs.map(pr => (
            <div key={pr.id} className="flex items-center justify-between py-1.5 border-b border-yellow-500/10 last:border-0">
              <span className="text-sm text-white">{pr.exerciseName}</span>
              <span className="text-sm font-bold text-yellow-400">
                {Math.round(pr.estimated1RM)} lbs <span className="text-xs text-yellow-400/60">e1RM</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Exercise breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><BarChart3 size={14} /> Exercise Breakdown</h3>
        </div>
        {exerciseSummary.map((ex, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {ex.hasPR && <Star size={12} className="text-yellow-400 shrink-0" />}
              <span className="text-sm text-white truncate">{ex.name}</span>
            </div>
            <div className="text-right shrink-0 ml-3">
              <span className="text-xs text-gray-400">{ex.setsCompleted}/{ex.setsPlanned} sets</span>
              {ex.topWeight > 0 && <span className="text-xs text-gray-500 ml-2">top: {ex.topWeight}lbs</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Completion ring */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#262626" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={completionPct === 100 ? '#22c55e' : '#f59e0b'}
              strokeWidth="3"
              strokeDasharray={`${completionPct} ${100 - completionPct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {completionPct}%
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            {completionPct === 100 ? 'Fully completed' : `${setsCompleted} of ${totalSetsPlanned} sets logged`}
          </p>
          <p className="text-xs text-gray-500">
            {completionPct === 100 ? 'Every set accounted for 💯' : 'Partial completion — still counts!'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Continue <ChevronRight size={16} />
        </button>
        <button
          onClick={onViewHistory}
          className="px-5 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all text-sm"
        >
          History
        </button>
      </div>
    </div>
  );
};

export default SessionRecapView;
