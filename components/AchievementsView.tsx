import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, Achievement } from '../shared/types';
import { Trophy } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
}

const AchievementsView: React.FC<Props> = ({ history, liftRecords }) => {
  const achievements = useMemo<Achievement[]>(() => {
    const list: Achievement[] = [
      { id: 'first_workout', title: 'First Rep', description: 'Complete your first workout', icon: '🏋️', condition: (h) => h.length >= 1, unlocked: false },
      { id: '10_workouts', title: 'Dedicated', description: 'Complete 10 workouts', icon: '💪', condition: (h) => h.length >= 10, unlocked: false },
      { id: '25_workouts', title: 'Consistent', description: 'Complete 25 workouts', icon: '🔥', condition: (h) => h.length >= 25, unlocked: false },
      { id: '50_workouts', title: 'Iron Will', description: 'Complete 50 workouts', icon: '⚡', condition: (h) => h.length >= 50, unlocked: false },
      { id: '100_workouts', title: 'Century', description: 'Complete 100 workouts', icon: '🏆', condition: (h) => h.length >= 100, unlocked: false },
      { id: 'first_logged', title: 'Logger', description: 'Log sets in a workout session', icon: '📝', condition: (h) => h.some(w => w.completedSets && w.completedSets.length > 0), unlocked: false },
      { id: 'first_pr', title: 'PR Setter', description: 'Record your first lift PR', icon: '🎯', condition: (_, lr) => (lr || []).length >= 1, unlocked: false },
      { id: 'five_prs', title: 'PR Machine', description: 'Record 5 different exercise PRs', icon: '📈', condition: (_, lr) => { const unique = new Set((lr || []).map(r => r.exerciseId)); return unique.size >= 5; }, unlocked: false },
      { id: 'tonnage_10k', title: '10K Club', description: 'Move 10,000 lbs in a single session', icon: '🏗️', condition: (h) => h.some(w => (w.actualTonnage || 0) >= 10000), unlocked: false },
      { id: 'tonnage_25k', title: '25K Club', description: 'Move 25,000 lbs in a single session', icon: '🏭', condition: (h) => h.some(w => (w.actualTonnage || 0) >= 25000), unlocked: false },
      { id: 'tonnage_50k', title: '50K Club', description: 'Move 50,000 lbs in a single session', icon: '🌋', condition: (h) => h.some(w => (w.actualTonnage || 0) >= 50000), unlocked: false },
      { id: 'rpe_10', title: 'Max Effort', description: 'Rate a session RPE 10', icon: '💀', condition: (h) => h.some(w => w.sessionRPE === 10), unlocked: false },
      { id: 'deload_done', title: 'Smart Lifter', description: 'Complete a deload workout', icon: '🧘', condition: (h) => h.some(w => w.focus?.toLowerCase().includes('deload')), unlocked: false },
      { id: 'streak_3', title: '3-Day Streak', description: 'Train 3 days in a row', icon: '📆', condition: (h) => hasStreak(h, 3), unlocked: false },
      { id: 'streak_7', title: 'Week Warrior', description: 'Train 7 days in a row', icon: '🗓️', condition: (h) => hasStreak(h, 7), unlocked: false },
      { id: 'variety', title: 'Well-Rounded', description: 'Train all 5 focus areas', icon: '🌈', condition: (h) => {
        const focuses = new Set(h.map(w => w.focus?.toLowerCase()));
        return ['strength', 'hypertrophy', 'power', 'endurance', 'deload'].every(f => focuses.has(f));
      }, unlocked: false },
      { id: 'squat_225', title: '2-Plate Squat', description: 'Squat 225 lbs (estimated 1RM)', icon: '🦵', condition: (_, lr) => (lr || []).some(r => r.exerciseId === 'back_squat' && r.estimated1RM >= 225), unlocked: false },
      { id: 'bench_225', title: '2-Plate Bench', description: 'Bench 225 lbs (estimated 1RM)', icon: '🏋️', condition: (_, lr) => (lr || []).some(r => r.exerciseId === 'bench_press' && r.estimated1RM >= 225), unlocked: false },
      { id: 'deadlift_315', title: '3-Plate Deadlift', description: 'Deadlift 315 lbs (estimated 1RM)', icon: '💪', condition: (_, lr) => (lr || []).some(r => r.exerciseId === 'conventional_deadlift' && r.estimated1RM >= 315), unlocked: false },
      { id: 'total_1000', title: '1000lb Total', description: 'S/B/D total of 1000+ lbs', icon: '👑', condition: (_, lr) => {
        const best = (id: string) => Math.max(0, ...(lr || []).filter(r => r.exerciseId === id).map(r => r.estimated1RM));
        return (best('back_squat') + best('bench_press') + best('conventional_deadlift')) >= 1000;
      }, unlocked: false },
    ];

    return list.map(a => ({ ...a, unlocked: a.condition(history, liftRecords) }));
  }, [history, liftRecords]);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy size={24} className="text-yellow-400" /> Achievements</h2>
      <p className="text-sm text-gray-400">{unlocked.length} / {achievements.length} unlocked</p>

      {/* Progress bar */}
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-500 transition-all" style={{ width: `${(unlocked.length / achievements.length) * 100}%` }} />
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-400 mb-2">🏆 Unlocked</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unlocked.map(a => (
              <div key={a.id} className="bg-neutral-900 border border-green-800/50 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">🔒 Locked</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {locked.map(a => (
            <div key={a.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 flex items-center gap-3 opacity-50">
              <span className="text-2xl grayscale">{a.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-400">{a.title}</p>
                <p className="text-xs text-gray-600">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function hasStreak(history: SavedWorkout[], days: number): boolean {
  if (history.length < days) return false;
  const dates = [...new Set(history.map(w => new Date(w.timestamp).toISOString().split('T')[0]))].sort();
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diff === 1) { streak++; if (streak >= days) return true; } else { streak = 1; }
  }
  return streak >= days;
}

export default AchievementsView;
