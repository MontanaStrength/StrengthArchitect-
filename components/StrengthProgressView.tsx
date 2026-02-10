import React, { useState, useMemo } from 'react';
import { LiftRecord, SavedWorkout } from '../types';
import { estimate1RM } from '../utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Trophy, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight, ArrowRight, Minus } from 'lucide-react';

// ===== TYPES =====

interface Props {
  records: LiftRecord[];
  history: SavedWorkout[];
  athleteWeightLbs?: number;
  onSave: (record: LiftRecord) => void;
  onDelete: (id: string) => void;
}

type DateRange = '30d' | '90d' | '1y' | 'all';

interface ExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  best1RM: number;
  latest1RM: number;
  records: LiftRecord[];
  trend: 'improving' | 'plateau' | 'declining';
  weeklyRate: number; // lbs per week change
}

// ===== STRENGTH STANDARDS (approximate, male, lbs) =====

const STRENGTH_STANDARDS: Record<string, { bw: number[]; levels: number[][] }> = {
  back_squat: {
    bw: [132, 148, 165, 181, 198, 220, 242, 275],
    levels: [
      [115, 190, 250, 320, 385],
      [125, 210, 275, 355, 425],
      [135, 230, 300, 385, 460],
      [150, 245, 320, 415, 495],
      [160, 260, 340, 440, 520],
      [170, 275, 360, 460, 550],
      [180, 290, 375, 480, 570],
      [190, 305, 395, 500, 595],
    ],
  },
  bench_press: {
    bw: [132, 148, 165, 181, 198, 220, 242, 275],
    levels: [
      [85, 135, 175, 225, 275],
      [95, 150, 195, 250, 305],
      [105, 165, 215, 275, 330],
      [115, 180, 230, 295, 355],
      [120, 190, 245, 315, 375],
      [130, 205, 260, 335, 400],
      [135, 215, 275, 350, 420],
      [145, 225, 290, 365, 440],
    ],
  },
  conventional_deadlift: {
    bw: [132, 148, 165, 181, 198, 220, 242, 275],
    levels: [
      [135, 225, 300, 385, 460],
      [150, 250, 330, 420, 505],
      [165, 275, 355, 455, 545],
      [175, 290, 380, 485, 580],
      [185, 310, 400, 510, 610],
      [200, 325, 420, 535, 640],
      [210, 340, 440, 560, 665],
      [220, 355, 455, 580, 690],
    ],
  },
  overhead_press: {
    bw: [132, 148, 165, 181, 198, 220, 242, 275],
    levels: [
      [55, 90, 120, 155, 185],
      [60, 100, 135, 170, 205],
      [65, 110, 145, 185, 225],
      [70, 120, 155, 200, 240],
      [75, 125, 165, 215, 255],
      [80, 135, 175, 225, 270],
      [85, 140, 185, 235, 285],
      [90, 150, 195, 250, 300],
    ],
  },
};

const LEVEL_LABELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
const LEVEL_COLORS = ['#6b7280', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

function getStrengthLevel(exerciseId: string, e1RM: number, bodyweight: number): { level: number; label: string; color: string; nextThreshold: number | null } {
  const standards = STRENGTH_STANDARDS[exerciseId];
  if (!standards || !bodyweight || !e1RM) return { level: -1, label: 'Unknown', color: '#6b7280', nextThreshold: null };

  // Interpolate for bodyweight
  const bws = standards.bw;
  let bwIdx = bws.findIndex(b => b >= bodyweight);
  if (bwIdx === -1) bwIdx = bws.length - 1;
  if (bwIdx === 0) bwIdx = 0;

  const thresholds = standards.levels[bwIdx];
  let level = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (e1RM >= thresholds[i]) { level = i; break; }
  }

  const nextThreshold = level < thresholds.length - 1 ? thresholds[level + 1] : null;
  return { level, label: LEVEL_LABELS[level], color: LEVEL_COLORS[level], nextThreshold };
}

// ===== COMPONENT =====

const StrengthProgressView: React.FC<Props> = ({ records, history, athleteWeightLbs, onSave, onDelete }) => {
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // Add form state
  const [formExerciseName, setFormExerciseName] = useState('');
  const [formExerciseId, setFormExerciseId] = useState('');
  const [formWeight, setFormWeight] = useState(135);
  const [formReps, setFormReps] = useState(5);
  const [formRpe, setFormRpe] = useState<number | undefined>();
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // ===== DERIVED DATA =====

  const dateThreshold = useMemo(() => {
    const now = Date.now();
    if (dateRange === '30d') return now - 30 * 86400000;
    if (dateRange === '90d') return now - 90 * 86400000;
    if (dateRange === '1y') return now - 365 * 86400000;
    return 0;
  }, [dateRange]);

  const filteredRecords = useMemo(() =>
    records.filter(r => r.date >= dateThreshold),
    [records, dateThreshold]
  );

  const exerciseGroups: ExerciseGroup[] = useMemo(() => {
    const map = new Map<string, LiftRecord[]>();
    for (const r of filteredRecords) {
      const arr = map.get(r.exerciseId) || [];
      arr.push(r);
      map.set(r.exerciseId, arr);
    }

    const groups: ExerciseGroup[] = [];
    for (const [exerciseId, recs] of map.entries()) {
      const sorted = [...recs].sort((a, b) => a.date - b.date);
      const best = Math.max(...recs.map(r => r.estimated1RM));
      const latest = sorted[sorted.length - 1].estimated1RM;

      // Trend detection: compare last 3 vs previous 3
      let trend: 'improving' | 'plateau' | 'declining' = 'plateau';
      let weeklyRate = 0;
      if (sorted.length >= 2) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const weeks = Math.max(1, (last.date - first.date) / (7 * 86400000));
        weeklyRate = (last.estimated1RM - first.estimated1RM) / weeks;

        if (sorted.length >= 4) {
          const mid = Math.floor(sorted.length / 2);
          const recentAvg = sorted.slice(mid).reduce((s, r) => s + r.estimated1RM, 0) / sorted.slice(mid).length;
          const olderAvg = sorted.slice(0, mid).reduce((s, r) => s + r.estimated1RM, 0) / sorted.slice(0, mid).length;
          const delta = recentAvg - olderAvg;
          if (delta > 5) trend = 'improving';
          else if (delta < -5) trend = 'declining';
          else trend = 'plateau';
        } else if (sorted.length >= 2) {
          const delta = last.estimated1RM - first.estimated1RM;
          if (delta > 5) trend = 'improving';
          else if (delta < -5) trend = 'declining';
        }
      }

      groups.push({
        exerciseId,
        exerciseName: recs[0].exerciseName,
        best1RM: best,
        latest1RM: latest,
        records: sorted,
        trend,
        weeklyRate,
      });
    }

    // Sort: big four first, then by best 1RM
    const bigFour = ['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'];
    groups.sort((a, b) => {
      const aIsBig = bigFour.indexOf(a.exerciseId);
      const bIsBig = bigFour.indexOf(b.exerciseId);
      if (aIsBig >= 0 && bIsBig >= 0) return aIsBig - bIsBig;
      if (aIsBig >= 0) return -1;
      if (bIsBig >= 0) return 1;
      return b.best1RM - a.best1RM;
    });

    return groups;
  }, [filteredRecords]);

  // Chart data for selected exercise (or first available)
  const activeExerciseId = selectedExercise || exerciseGroups[0]?.exerciseId || null;
  const activeGroup = exerciseGroups.find(g => g.exerciseId === activeExerciseId);

  const chartData = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.records.map(r => ({
      date: r.date,
      dateLabel: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      e1RM: Math.round(r.estimated1RM),
      weight: r.weight,
      reps: r.reps,
      rpe: r.rpe,
    }));
  }, [activeGroup]);

  // Big four summary
  const bigFourSummary = useMemo(() => {
    const ids = ['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'];
    const labels = ['Squat', 'Bench', 'Deadlift', 'OHP'];
    return ids.map((id, i) => {
      const group = exerciseGroups.find(g => g.exerciseId === id);
      return {
        id,
        label: labels[i],
        best: group?.best1RM || 0,
        trend: group?.trend || 'plateau',
        weeklyRate: group?.weeklyRate || 0,
      };
    });
  }, [exerciseGroups]);

  const bigFourTotal = bigFourSummary.reduce((s, l) => s + l.best, 0);

  // PR timeline (all-time PRs in order)
  const prTimeline = useMemo(() => {
    const prs: { record: LiftRecord; previousBest: number }[] = [];
    const bestByExercise = new Map<string, number>();

    const allSorted = [...records].sort((a, b) => a.date - b.date);
    for (const r of allSorted) {
      const current = bestByExercise.get(r.exerciseId) || 0;
      if (r.estimated1RM > current) {
        prs.push({ record: r, previousBest: current });
        bestByExercise.set(r.exerciseId, r.estimated1RM);
      }
    }

    return prs.reverse().slice(0, 10);
  }, [records]);

  // Plateau alerts
  const plateauAlerts = useMemo(() => {
    return exerciseGroups.filter(g => {
      if (g.records.length < 3) return false;
      const threeWeeksAgo = Date.now() - 21 * 86400000;
      const recentRecords = g.records.filter(r => r.date > threeWeeksAgo);
      if (recentRecords.length < 2) return false;
      const maxRecent = Math.max(...recentRecords.map(r => r.estimated1RM));
      return maxRecent <= g.best1RM && g.trend === 'plateau';
    });
  }, [exerciseGroups]);

  // Add form handler
  const handleAdd = () => {
    const id = formExerciseId || formExerciseName.toLowerCase().replace(/\s+/g, '_');
    const est = estimate1RM(formWeight, formReps, formRpe);
    const record: LiftRecord = {
      id: crypto.randomUUID(),
      exerciseId: id,
      exerciseName: formExerciseName,
      weight: formWeight,
      reps: formReps,
      estimated1RM: est,
      date: new Date(formDate + 'T12:00:00').getTime(),
      rpe: formRpe,
    };
    onSave(record);
    setShowAddForm(false);
    setFormExerciseName('');
    setFormExerciseId('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const quickExercises = [
    { id: 'back_squat', name: 'Back Squat' },
    { id: 'bench_press', name: 'Bench Press' },
    { id: 'conventional_deadlift', name: 'Deadlift' },
    { id: 'overhead_press', name: 'OHP' },
    { id: 'barbell_row', name: 'Barbell Row' },
    { id: 'front_squat', name: 'Front Squat' },
  ];

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <ArrowUpRight size={14} className="text-green-400" />;
    if (trend === 'declining') return <ArrowUpRight size={14} className="text-red-400 rotate-90" />;
    return <Minus size={14} className="text-gray-500" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-400';
    if (trend === 'declining') return 'text-red-400';
    return 'text-gray-500';
  };

  // ===== RENDER =====

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-amber-500" /> Strength
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Track progress, PRs, and strength levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-all"
          >
            <Plus size={14} /> Log PR
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex gap-1.5">
        {([['30d', '30D'], ['90d', '90D'], ['1y', '1Y'], ['all', 'All']] as const).map(([val, label]) => (
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

      {/* Add PR Form */}
      {showAddForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Log a Lift</h3>
          <div>
            <label className="text-xs text-gray-400">Quick Select</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {quickExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setFormExerciseName(ex.name); setFormExerciseId(ex.id); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formExerciseId === ex.id ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Exercise Name</label>
            <input
              value={formExerciseName}
              onChange={e => { setFormExerciseName(e.target.value); setFormExerciseId(e.target.value.toLowerCase().replace(/\s+/g, '_')); }}
              className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 outline-none"
              placeholder="Exercise name"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-400">Weight</label>
              <input type="number" value={formWeight} onChange={e => setFormWeight(Number(e.target.value))} className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Reps</label>
              <input type="number" value={formReps} onChange={e => setFormReps(Number(e.target.value))} className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">RPE</label>
              <input type="number" value={formRpe || ''} min={1} max={10} step={0.5} onChange={e => setFormRpe(Number(e.target.value) || undefined)} className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 outline-none" placeholder="opt" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 outline-none" />
            </div>
          </div>
          {formWeight > 0 && formReps > 0 && (
            <p className="text-sm text-gray-400">Estimated 1RM: <span className="text-amber-400 font-bold">{Math.round(estimate1RM(formWeight, formReps, formRpe))} lbs</span></p>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!formExerciseName} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-all disabled:opacity-50">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-400 text-sm rounded-lg transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Big Four Summary Cards */}
      {bigFourTotal > 0 && (
        <div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {bigFourSummary.map(lift => (
              <button
                key={lift.id}
                onClick={() => setSelectedExercise(lift.id)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  activeExerciseId === lift.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                }`}
              >
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{lift.label}</div>
                <div className={`text-lg font-bold ${lift.best > 0 ? 'text-white' : 'text-gray-700'}`}>
                  {lift.best > 0 ? Math.round(lift.best) : '—'}
                </div>
                {lift.best > 0 && (
                  <div className={`flex items-center justify-center gap-0.5 text-[10px] ${trendColor(lift.trend)}`}>
                    {trendIcon(lift.trend)}
                    <span>{lift.weeklyRate > 0 ? '+' : ''}{lift.weeklyRate.toFixed(1)}/wk</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500">Estimated Total: </span>
            <span className="text-sm font-bold text-amber-400">{Math.round(bigFourTotal)} lbs</span>
          </div>
        </div>
      )}

      {/* 1RM Progress Chart */}
      {activeGroup && chartData.length >= 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{activeGroup.exerciseName}</h3>
              <p className="text-xs text-gray-500">Estimated 1RM over time</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-400">{Math.round(activeGroup.best1RM)}</div>
              <div className="text-[10px] text-gray-500">Best e1RM</div>
            </div>
          </div>

          {/* Exercise selector (if more than big four) */}
          {exerciseGroups.length > 4 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {exerciseGroups.map(g => (
                <button
                  key={g.exerciseId}
                  onClick={() => setSelectedExercise(g.exerciseId)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    activeExerciseId === g.exerciseId
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-neutral-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {g.exerciseName}
                </button>
              ))}
            </div>
          )}

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="e1rmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => [`${value} lbs`, 'Est. 1RM']}
                  labelFormatter={(label: string) => label}
                />
                <Area
                  type="monotone"
                  dataKey="e1RM"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#e1rmGradient)"
                  dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#fbbf24', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
                />
                {/* Best 1RM reference line */}
                <ReferenceLine
                  y={activeGroup.best1RM}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Strength Level Bar (for big four) */}
          {athleteWeightLbs && STRENGTH_STANDARDS[activeGroup.exerciseId] && (() => {
            const sl = getStrengthLevel(activeGroup.exerciseId, activeGroup.best1RM, athleteWeightLbs);
            if (sl.level < 0) return null;

            return (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Strength Level</span>
                  <span className="text-xs font-bold" style={{ color: sl.color }}>{sl.label}</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  {LEVEL_LABELS.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        backgroundColor: i <= sl.level ? LEVEL_COLORS[i] : '#262626',
                        opacity: i <= sl.level ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {LEVEL_LABELS.map((label, i) => (
                    <span key={label} className="text-[8px]" style={{ color: i === sl.level ? sl.color : '#4b5563' }}>{label}</span>
                  ))}
                </div>
                {sl.nextThreshold && (
                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                    <span className="text-gray-400">{Math.round(sl.nextThreshold - activeGroup.best1RM)} lbs</span> to {LEVEL_LABELS[sl.level + 1]}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Plateau Alerts */}
      {plateauAlerts.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 mb-2">
            <AlertTriangle size={14} /> Plateau Detected
          </h3>
          <div className="space-y-1">
            {plateauAlerts.map(g => (
              <p key={g.exerciseId} className="text-xs text-gray-400">
                <span className="text-white font-medium">{g.exerciseName}</span> — no 1RM improvement in recent sessions. Consider a variation swap or deload.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* PR Timeline */}
      {prTimeline.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" /> Recent PRs
          </h3>
          <div className="space-y-2">
            {prTimeline.slice(0, 6).map(({ record, previousBest }) => (
              <div key={record.id} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Trophy size={14} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{record.exerciseName}</span>
                    {previousBest > 0 && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded font-medium">
                        +{Math.round(record.estimated1RM - previousBest)} lbs
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {record.weight}×{record.reps}{record.rpe ? ` @ RPE ${record.rpe}` : ''} — {new Date(record.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-amber-400">{Math.round(record.estimated1RM)}</div>
                  <div className="text-[9px] text-gray-600">e1RM</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Exercises — Expandable List */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">All Exercises</h3>
        {exerciseGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No lift records yet.</p>
            <p className="text-xs mt-1">Log a PR or complete a session to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exerciseGroups.map(g => {
              const isExpanded = expandedExercise === g.exerciseId;
              return (
                <div key={g.exerciseId} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : g.exerciseId)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex items-center gap-1 ${trendColor(g.trend)}`}>
                        {trendIcon(g.trend)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white truncate block">{g.exerciseName}</span>
                        <span className="text-[10px] text-gray-500">{g.records.length} record{g.records.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-400">{Math.round(g.best1RM)}</div>
                        <div className="text-[9px] text-gray-600">best e1RM</div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-1.5">
                      {g.records.slice().reverse().slice(0, 8).map(r => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {new Date(r.date).toLocaleDateString()} — {r.weight}×{r.reps}{r.rpe ? ` RPE ${r.rpe}` : ''}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">e1RM: <span className="text-white">{Math.round(r.estimated1RM)}</span></span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(r.id); }}
                              className="text-gray-700 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => { setSelectedExercise(g.exerciseId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-[10px] text-amber-500 hover:text-amber-400 font-medium mt-1"
                      >
                        View chart →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const r = records.find(rec => rec.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white">Delete Record?</h3>
              <p className="text-sm text-gray-400">
                {r ? `${r.exerciseName} — ${r.weight}×${r.reps}${r.rpe ? ` RPE ${r.rpe}` : ''} (e1RM: ${Math.round(r.estimated1RM)})` : 'This record'} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all">Cancel</button>
                <button onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StrengthProgressView;
