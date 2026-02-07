import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, TrainingGoal, SleepEntry } from '../types';
import { BarChart3, TrendingUp, Trophy, Target, Moon, Dumbbell } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
  goals: TrainingGoal[];
  sleepEntries: SleepEntry[];
}

const DashboardView: React.FC<Props> = ({ history, liftRecords, goals, sleepEntries }) => {
  const stats = useMemo(() => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const thisWeek = history.filter(w => w.timestamp > oneWeekAgo);
    const thisMonth = history.filter(w => w.timestamp > oneMonthAgo);

    const weeklyTonnage = thisWeek.reduce((sum, w) => sum + (w.actualTonnage || w.estimatedTonnage || 0), 0);
    const monthlyTonnage = thisMonth.reduce((sum, w) => sum + (w.actualTonnage || w.estimatedTonnage || 0), 0);

    const weeklySets = thisWeek.reduce((sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets, 0), 0);

    const avgSessionRPE = thisWeek.length > 0
      ? thisWeek.filter(w => w.sessionRPE).reduce((sum, w) => sum + (w.sessionRPE || 0), 0) / thisWeek.filter(w => w.sessionRPE).length
      : 0;

    // Top lifts
    const topLifts: Record<string, LiftRecord> = {};
    for (const r of liftRecords) {
      if (!topLifts[r.exerciseId] || r.estimated1RM > topLifts[r.exerciseId].estimated1RM) {
        topLifts[r.exerciseId] = r;
      }
    }

    // Goal progress
    const activeGoals = goals.filter(g => !g.completedDate);

    // Recent sleep
    const recentSleep = sleepEntries.slice(0, 7);
    const avgSleep = recentSleep.length > 0
      ? recentSleep.reduce((sum, s) => sum + s.hoursSlept, 0) / recentSleep.length
      : 0;

    return { thisWeek, thisMonth, weeklyTonnage, monthlyTonnage, weeklySets, avgSessionRPE, topLifts, activeGoals, avgSleep };
  }, [history, liftRecords, goals, sleepEntries]);

  const bigFourLifts = ['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'];
  const bigFourNames: Record<string, string> = {
    back_squat: 'Squat',
    bench_press: 'Bench',
    conventional_deadlift: 'Deadlift',
    overhead_press: 'OHP',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={24} className="text-red-500" /> Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">This Week</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.thisWeek.length}</p>
          <p className="text-xs text-gray-500">sessions</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Weekly Tonnage</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.weeklyTonnage.toLocaleString()}</p>
          <p className="text-xs text-gray-500">lbs</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Weekly Sets</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.weeklySets}</p>
          <p className="text-xs text-gray-500">total</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Avg Session RPE</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.avgSessionRPE ? stats.avgSessionRPE.toFixed(1) : '—'}</p>
          <p className="text-xs text-gray-500">/10</p>
        </div>
      </div>

      {/* Big Four Estimated 1RMs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-yellow-400" /> Estimated 1RMs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bigFourLifts.map(id => {
            const record = stats.topLifts[id];
            return (
              <div key={id} className="text-center">
                <p className="text-xs text-gray-400">{bigFourNames[id]}</p>
                <p className="text-xl font-bold text-white mt-1">{record ? `${Math.round(record.estimated1RM)} lbs` : '—'}</p>
                {record && <p className="text-[10px] text-gray-500">{record.weight}×{record.reps}</p>}
              </div>
            );
          })}
        </div>
        {Object.keys(stats.topLifts).length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-800 text-center">
            <p className="text-xs text-gray-400">
              Estimated Total:{' '}
              <span className="text-white font-bold">
                {Math.round(
                  bigFourLifts.reduce((sum, id) => sum + (stats.topLifts[id]?.estimated1RM || 0), 0)
                )} lbs
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Dumbbell size={16} className="text-red-400" /> Recent Sessions</h3>
        {stats.thisWeek.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions this week. Time to train! 🏋️</p>
        ) : (
          <div className="space-y-2">
            {stats.thisWeek.slice(0, 5).map(w => (
              <div key={w.id} className="flex justify-between items-center py-2 border-b border-neutral-800 last:border-0">
                <div>
                  <p className="text-sm text-white font-medium">{w.title}</p>
                  <p className="text-xs text-gray-500">{new Date(w.timestamp).toLocaleDateString()} • {w.focus}</p>
                </div>
                <div className="text-right">
                  {w.actualTonnage ? (
                    <p className="text-sm text-red-400 font-medium">{w.actualTonnage.toLocaleString()} lbs</p>
                  ) : (
                    <p className="text-sm text-gray-500">~{(w.estimatedTonnage || 0).toLocaleString()} lbs</p>
                  )}
                  {w.sessionRPE && <p className="text-xs text-yellow-400">RPE {w.sessionRPE}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goals Progress + Sleep */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Target size={16} className="text-green-400" /> Active Goals</h3>
          {stats.activeGoals.length === 0 ? (
            <p className="text-gray-500 text-sm">No active goals set.</p>
          ) : (
            <div className="space-y-2">
              {stats.activeGoals.slice(0, 4).map(g => {
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{g.title}</span>
                      <span className="text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Moon size={16} className="text-blue-400" /> Sleep (7-Day Avg)</h3>
          <p className="text-3xl font-bold text-white">{stats.avgSleep ? `${stats.avgSleep.toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Target: 7-9 hours</p>
          {stats.avgSleep > 0 && (
            <div className="mt-2 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${stats.avgSleep >= 7 ? 'bg-green-500' : stats.avgSleep >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (stats.avgSleep / 9) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400 uppercase mb-1">30-Day Summary</p>
        <p className="text-sm text-gray-300">
          <span className="text-white font-bold">{stats.thisMonth.length}</span> sessions •{' '}
          <span className="text-red-400 font-bold">{stats.monthlyTonnage.toLocaleString()}</span> lbs total tonnage
        </p>
      </div>
    </div>
  );
};

export default DashboardView;
