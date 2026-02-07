import React, { useMemo } from 'react';
import { SavedWorkout, MuscleGroup } from '../types';

interface Props {
  history: SavedWorkout[];
}

const TrainingLoadView: React.FC<Props> = ({ history }) => {
  const weeklyData = useMemo(() => {
    const weeks: { weekLabel: string; tonnage: number; sets: number; sessions: number; avgRPE: number }[] = [];
    const sorted = [...history].sort((a, b) => a.date - b.date);
    if (sorted.length === 0) return weeks;

    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekWorkouts = sorted.filter(w => w.date >= weekStart && w.date < weekEnd);
      const totalTonnage = weekWorkouts.reduce((sum, w) => sum + (w.actualTonnage || 0), 0);
      const totalSets = weekWorkouts.reduce((sum, w) => {
        return sum + (w.workout?.exercises.reduce((s, ex) => s + (ex.sets || 0), 0) || 0);
      }, 0);
      const rpes = weekWorkouts.filter(w => w.sessionRPE).map(w => w.sessionRPE!);
      const avgRPE = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0;
      weeks.push({
        weekLabel: `W-${i}`,
        tonnage: Math.round(totalTonnage),
        sets: totalSets,
        sessions: weekWorkouts.length,
        avgRPE: Math.round(avgRPE * 10) / 10,
      });
    }
    return weeks;
  }, [history]);

  const muscleVolume = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const thisWeek = history.filter(w => w.date > oneWeekAgo);
    const lastWeek = history.filter(w => w.date > twoWeeksAgo && w.date <= oneWeekAgo);

    const calc = (workouts: SavedWorkout[]) => {
      const vol: Partial<Record<MuscleGroup, number>> = {};
      workouts.forEach(w => {
        w.workout?.muscleGroupsCovered?.forEach(mg => {
          const totalSets = w.workout!.exercises.reduce((s, ex) => s + (ex.sets || 0), 0);
          const perGroup = totalSets / (w.workout!.muscleGroupsCovered?.length || 1);
          vol[mg as MuscleGroup] = (vol[mg as MuscleGroup] || 0) + perGroup;
        });
      });
      return vol;
    };

    return { thisWeek: calc(thisWeek), lastWeek: calc(lastWeek) };
  }, [history]);

  const acuteChronicRatio = useMemo(() => {
    const now = Date.now();
    const acute7 = history.filter(w => w.date > now - 7 * 86400000).reduce((s, w) => s + (w.actualTonnage || 0), 0);
    const chronic28 = history.filter(w => w.date > now - 28 * 86400000).reduce((s, w) => s + (w.actualTonnage || 0), 0);
    const weeklyAvgChronic = chronic28 / 4;
    if (weeklyAvgChronic === 0) return null;
    return Math.round((acute7 / weeklyAvgChronic) * 100) / 100;
  }, [history]);

  const maxTonnage = Math.max(...weeklyData.map(w => w.tonnage), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">📊</span> Training Load Analysis
      </h2>

      {/* Acute:Chronic Ratio */}
      {acuteChronicRatio !== null && (
        <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
          <h3 className="text-lg font-semibold text-white mb-2">Acute : Chronic Workload Ratio</h3>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${
              acuteChronicRatio < 0.8 ? 'text-blue-400' :
              acuteChronicRatio <= 1.3 ? 'text-green-400' :
              acuteChronicRatio <= 1.5 ? 'text-yellow-400' :
              'text-amber-400'
            }`}>
              {acuteChronicRatio.toFixed(2)}
            </div>
            <div className="text-sm text-neutral-400">
              {acuteChronicRatio < 0.8 && 'Undertraining — safe to increase load'}
              {acuteChronicRatio >= 0.8 && acuteChronicRatio <= 1.3 && 'Sweet spot — optimal training zone'}
              {acuteChronicRatio > 1.3 && acuteChronicRatio <= 1.5 && 'Caution — elevated injury risk'}
              {acuteChronicRatio > 1.5 && 'Danger zone — high spike in training load'}
            </div>
          </div>
          <div className="mt-3 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                acuteChronicRatio < 0.8 ? 'bg-blue-500' :
                acuteChronicRatio <= 1.3 ? 'bg-green-500' :
                acuteChronicRatio <= 1.5 ? 'bg-yellow-500' :
                'bg-amber-500'
              }`}
              style={{ width: `${Math.min(acuteChronicRatio / 2 * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500 mt-1">
            <span>0.0</span>
            <span className="text-green-500">0.8–1.3</span>
            <span>2.0</span>
          </div>
        </div>
      )}

      {/* Weekly Tonnage Chart */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Tonnage (8 Weeks)</h3>
        {weeklyData.length > 0 && weeklyData.some(w => w.tonnage > 0) ? (
          <div className="flex items-end gap-2 h-40">
            {weeklyData.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-neutral-400 mb-1">{(w.tonnage / 1000).toFixed(0)}k</span>
                <div
                  className="w-full bg-amber-500/80 rounded-t transition-all hover:bg-amber-400"
                  style={{ height: `${(w.tonnage / maxTonnage) * 100}%`, minHeight: w.tonnage > 0 ? 4 : 0 }}
                />
                <span className="text-xs text-neutral-500 mt-1">{w.weekLabel}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500 text-sm">No tonnage data yet. Complete some workouts!</div>
        )}
      </div>

      {/* Weekly Summary Table */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-400 border-b border-neutral-800">
                <th className="text-left py-2">Week</th>
                <th className="text-right py-2">Sessions</th>
                <th className="text-right py-2">Total Sets</th>
                <th className="text-right py-2">Tonnage</th>
                <th className="text-right py-2">Avg RPE</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.map((w, i) => (
                <tr key={i} className="border-b border-neutral-800/50">
                  <td className="py-2 text-neutral-300">{w.weekLabel}</td>
                  <td className="py-2 text-right text-white">{w.sessions}</td>
                  <td className="py-2 text-right text-white">{w.sets}</td>
                  <td className="py-2 text-right text-amber-400 font-mono">{w.tonnage > 0 ? `${(w.tonnage / 1000).toFixed(1)}k` : '—'}</td>
                  <td className="py-2 text-right text-neutral-300">{w.avgRPE > 0 ? w.avgRPE : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Muscle Group Volume Comparison */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Muscle Volume — This Week vs Last</h3>
        <div className="space-y-2">
          {Object.values(MuscleGroup).map(mg => {
            const thisW = Math.round(muscleVolume.thisWeek[mg] || 0);
            const lastW = Math.round(muscleVolume.lastWeek[mg] || 0);
            const max = Math.max(thisW, lastW, 1);
            if (thisW === 0 && lastW === 0) return null;
            return (
              <div key={mg}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-300">{mg}</span>
                  <span className="text-neutral-400">{thisW} vs {lastW} sets</span>
                </div>
                <div className="flex gap-1 h-3">
                  <div className="flex-1 bg-neutral-800 rounded overflow-hidden">
                    <div className="h-full bg-amber-500 rounded" style={{ width: `${(thisW / max) * 100}%` }} />
                  </div>
                  <div className="flex-1 bg-neutral-800 rounded overflow-hidden">
                    <div className="h-full bg-neutral-600 rounded" style={{ width: `${(lastW / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded inline-block" /> This Week</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-neutral-600 rounded inline-block" /> Last Week</span>
        </div>
      </div>
    </div>
  );
};

export default TrainingLoadView;
