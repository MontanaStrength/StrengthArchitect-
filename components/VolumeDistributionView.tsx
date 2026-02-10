import React, { useState, useMemo } from 'react';
import { SavedWorkout, MuscleGroup } from '../types';
import { getExerciseById } from '../services/exerciseLibrary';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts';
import { BarChart3, TrendingUp, ArrowUpRight, Minus, Scale } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
}

type DateRange = '7d' | '30d' | '90d' | 'all';

// Muscle group display config
const MG_CONFIG: Record<string, { label: string; color: string; category: 'push' | 'pull' | 'legs' | 'core' }> = {
  [MuscleGroup.CHEST]:      { label: 'Chest',       color: '#f59e0b', category: 'push' },
  [MuscleGroup.SHOULDERS]:  { label: 'Shoulders',   color: '#fb923c', category: 'push' },
  [MuscleGroup.TRICEPS]:    { label: 'Triceps',     color: '#fbbf24', category: 'push' },
  [MuscleGroup.BACK]:       { label: 'Back',        color: '#3b82f6', category: 'pull' },
  [MuscleGroup.BICEPS]:     { label: 'Biceps',      color: '#60a5fa', category: 'pull' },
  [MuscleGroup.TRAPS]:      { label: 'Traps',       color: '#93c5fd', category: 'pull' },
  [MuscleGroup.FOREARMS]:   { label: 'Forearms',    color: '#a5b4fc', category: 'pull' },
  [MuscleGroup.QUADS]:      { label: 'Quads',       color: '#22c55e', category: 'legs' },
  [MuscleGroup.HAMSTRINGS]: { label: 'Hamstrings',  color: '#4ade80', category: 'legs' },
  [MuscleGroup.GLUTES]:     { label: 'Glutes',      color: '#86efac', category: 'legs' },
  [MuscleGroup.CALVES]:     { label: 'Calves',      color: '#bbf7d0', category: 'legs' },
  [MuscleGroup.CORE]:       { label: 'Core',        color: '#a855f7', category: 'core' },
};

// Evidence-based weekly set targets per muscle group (Schoenfeld / Israetel)
const VOLUME_TARGETS: Record<string, { mev: number; mav: number; mrv: number }> = {
  [MuscleGroup.CHEST]:      { mev: 8, mav: 14, mrv: 22 },
  [MuscleGroup.BACK]:       { mev: 8, mav: 14, mrv: 22 },
  [MuscleGroup.SHOULDERS]:  { mev: 6, mav: 12, mrv: 20 },
  [MuscleGroup.QUADS]:      { mev: 6, mav: 12, mrv: 20 },
  [MuscleGroup.HAMSTRINGS]: { mev: 4, mav: 10, mrv: 16 },
  [MuscleGroup.GLUTES]:     { mev: 4, mav: 10, mrv: 16 },
  [MuscleGroup.BICEPS]:     { mev: 4, mav: 10, mrv: 18 },
  [MuscleGroup.TRICEPS]:    { mev: 4, mav: 10, mrv: 18 },
  [MuscleGroup.CALVES]:     { mev: 6, mav: 10, mrv: 16 },
  [MuscleGroup.CORE]:       { mev: 4, mav: 8,  mrv: 14 },
  [MuscleGroup.TRAPS]:      { mev: 4, mav: 8,  mrv: 14 },
  [MuscleGroup.FOREARMS]:   { mev: 2, mav: 6,  mrv: 12 },
};

const VolumeDistributionView: React.FC<Props> = ({ history }) => {
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const dateThreshold = useMemo(() => {
    const now = Date.now();
    if (dateRange === '7d') return now - 7 * 86400000;
    if (dateRange === '30d') return now - 30 * 86400000;
    if (dateRange === '90d') return now - 90 * 86400000;
    return 0;
  }, [dateRange]);

  const filteredWorkouts = useMemo(() =>
    history.filter(w => w.timestamp >= dateThreshold),
    [history, dateThreshold]
  );

  // Compute sets per muscle group (using exercise library lookup)
  const volumeByMuscle = useMemo(() => {
    const vol: Record<string, number> = {};

    for (const workout of filteredWorkouts) {
      for (const ex of workout.exercises) {
        if (ex.isWarmupSet) continue;
        const exerciseDef = getExerciseById(ex.exerciseId);
        if (exerciseDef) {
          // Primary muscles get full set credit, secondary get half
          for (const mg of exerciseDef.primaryMuscles) {
            vol[mg] = (vol[mg] || 0) + ex.sets;
          }
          for (const mg of exerciseDef.secondaryMuscles) {
            vol[mg] = (vol[mg] || 0) + Math.round(ex.sets * 0.5);
          }
        } else if (workout.muscleGroupsCovered) {
          // Fallback: distribute sets across covered muscle groups
          const share = ex.sets / Math.max(1, workout.muscleGroupsCovered.length);
          for (const mg of workout.muscleGroupsCovered) {
            vol[mg] = (vol[mg] || 0) + share;
          }
        }
      }
    }

    return vol;
  }, [filteredWorkouts]);

  // Weekly average (for ranges > 7d)
  const weeks = Math.max(1, (Date.now() - dateThreshold) / (7 * 86400000));
  const isWeekly = dateRange === '7d';

  // Bar chart data
  const barData = useMemo(() => {
    const entries = Object.entries(MG_CONFIG)
      .map(([mg, config]) => {
        const total = volumeByMuscle[mg] || 0;
        const weekly = isWeekly ? total : Math.round(total / weeks);
        const target = VOLUME_TARGETS[mg];
        return {
          muscle: config.label,
          sets: Math.round(weekly),
          color: config.color,
          category: config.category,
          mev: target?.mev || 0,
          mav: target?.mav || 0,
          mrv: target?.mrv || 0,
          status: !target ? 'unknown' :
            weekly < target.mev ? 'under' :
            weekly <= target.mrv ? 'optimal' : 'over',
        };
      })
      .filter(d => d.sets > 0 || d.mev > 0)
      .sort((a, b) => b.sets - a.sets);
    return entries;
  }, [volumeByMuscle, isWeekly, weeks]);

  // Push/pull/legs ratio
  const ratios = useMemo(() => {
    let push = 0, pull = 0, legs = 0, core = 0;
    for (const [mg, val] of Object.entries(volumeByMuscle)) {
      const config = MG_CONFIG[mg];
      if (!config) continue;
      const weekly = isWeekly ? val : val / weeks;
      if (config.category === 'push') push += weekly;
      else if (config.category === 'pull') pull += weekly;
      else if (config.category === 'legs') legs += weekly;
      else core += weekly;
    }
    const total = push + pull + legs + core;
    return { push, pull, legs, core, total };
  }, [volumeByMuscle, isWeekly, weeks]);

  // Weekly tonnage trend (last 8 weeks)
  const weeklyTonnageTrend = useMemo(() => {
    const now = Date.now();
    const weeks: { label: string; tonnage: number; sessions: number; sets: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = now - (i + 1) * 7 * 86400000;
      const weekEnd = now - i * 7 * 86400000;
      const weekWorkouts = history.filter(w => w.timestamp >= weekStart && w.timestamp < weekEnd);
      const tonnage = weekWorkouts.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
      const sets = weekWorkouts.reduce((s, w) => s + w.exercises.reduce((es, e) => es + e.sets, 0), 0);
      const weekLabel = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeks.push({ label: weekLabel, tonnage: Math.round(tonnage), sessions: weekWorkouts.length, sets });
    }
    return weeks;
  }, [history]);

  // Session totals
  const totalSets = Object.values(volumeByMuscle).reduce((s, v) => s + v, 0);
  const totalTonnage = filteredWorkouts.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);

  const statusColor = (status: string) => {
    if (status === 'under') return '#ef4444';
    if (status === 'optimal') return '#22c55e';
    if (status === 'over') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-amber-500" /> Volume
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Sets per muscle group, balance ratios, and tonnage trends</p>
      </div>

      {/* Date Range Picker */}
      <div className="flex gap-1.5">
        {([['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['all', 'All']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setDateRange(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateRange === val
                ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                : 'bg-neutral-900 text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{filteredWorkouts.length}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{Math.round(isWeekly ? totalSets : totalSets / weeks)}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sets/Week</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-yellow-400">{totalTonnage > 0 ? (totalTonnage / 1000).toFixed(0) + 'k' : '0'}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total lbs</div>
        </div>
      </div>

      {/* Volume by Muscle Group — Bar Chart */}
      {barData.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Weekly Sets per Muscle Group</h3>
              <p className="text-[10px] text-gray-500">
                {isWeekly ? 'This week' : `Avg over ${Math.round(weeks)} week${Math.round(weeks) !== 1 ? 's' : ''}`}
                {' · '}
                <span className="text-green-400">Green</span> = optimal,{' '}
                <span className="text-red-400">Red</span> = under MEV,{' '}
                <span className="text-amber-400">Amber</span> = over MRV
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="muscle"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const item = props.payload;
                    return [`${value} sets (MEV: ${item.mev} · MAV: ${item.mav} · MRV: ${item.mrv})`, 'Weekly'];
                  }}
                />
                <Bar dataKey="sets" radius={[0, 4, 4, 0]} barSize={16}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={statusColor(entry.status)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volume landmark legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-neutral-800">
            {barData.filter(d => d.status !== 'unknown').map(d => (
              <div key={d.muscle} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(d.status) }} />
                <span className="text-[10px] text-gray-400">{d.muscle}: <span className="text-white font-medium">{d.sets}</span> / {d.mev}-{d.mrv}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Push/Pull/Legs Balance */}
      {ratios.total > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Scale size={14} className="text-amber-500" /> Training Balance
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Push', value: ratios.push, color: '#f59e0b' },
              { label: 'Pull', value: ratios.pull, color: '#3b82f6' },
              { label: 'Legs', value: ratios.legs, color: '#22c55e' },
              { label: 'Core', value: ratios.core, color: '#a855f7' },
            ].map(r => {
              const pct = ratios.total > 0 ? (r.value / ratios.total * 100) : 0;
              return (
                <div key={r.label} className="text-center">
                  <div className="text-lg font-bold text-white">{Math.round(r.value)}</div>
                  <div className="text-[10px] text-gray-500 mb-2">{r.label} sets/wk</div>
                  <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: r.color }}
                    />
                  </div>
                  <div className="text-[9px] text-gray-600 mt-1">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>

          {/* Push:Pull ratio callout */}
          {ratios.push > 0 && ratios.pull > 0 && (() => {
            const ratio = ratios.push / ratios.pull;
            const isBalanced = ratio >= 0.8 && ratio <= 1.2;
            return (
              <div className={`mt-4 pt-3 border-t border-neutral-800 text-center text-xs ${isBalanced ? 'text-green-400' : 'text-amber-400'}`}>
                Push:Pull ratio — <span className="font-bold">{ratio.toFixed(2)}:1</span>
                {isBalanced
                  ? ' — Well balanced'
                  : ratio > 1.2 ? ' — Push-dominant, consider more pulling volume' : ' — Pull-dominant, consider more pushing volume'
                }
              </div>
            );
          })()}
        </div>
      )}

      {/* Weekly Tonnage Trend */}
      {weeklyTonnageTrend.some(w => w.tonnage > 0) && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-4">Weekly Tonnage Trend</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTonnageTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} lbs`, 'Tonnage']}
                />
                <Bar dataKey="tonnage" radius={[4, 4, 0, 0]} barSize={24}>
                  {weeklyTonnageTrend.map((_, i) => (
                    <Cell key={i} fill={i === weeklyTonnageTrend.length - 1 ? '#f59e0b' : '#3f3f46'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredWorkouts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No workouts in this time range.</p>
          <p className="text-xs mt-1">Complete some sessions to see your volume distribution!</p>
        </div>
      )}
    </div>
  );
};

export default VolumeDistributionView;
