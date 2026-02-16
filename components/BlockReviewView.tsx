import React, { useMemo, useState } from 'react';
import { TrainingBlock, SavedWorkout, LiftRecord, TrainingBlockPhase } from '../shared/types';
import { computeSessionIntensity } from '../shared/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { Layers, TrendingUp, BarChart3, ChevronDown, ChevronUp, Target, Calendar, Zap } from 'lucide-react';

interface Props {
  blocks: TrainingBlock[];
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
}

// Phase display colors
const PHASE_COLORS: Record<string, string> = {
  'Hypertrophy':     '#a855f7',
  'Accumulation':    '#3b82f6',
  'Strength':        '#f59e0b',
  'Intensification': '#f97316',
  'Realization':     '#ef4444',
  'Peaking':         '#dc2626',
  'Deload':          '#22c55e',
};

const BlockReviewView: React.FC<Props> = ({ blocks, history, liftRecords }) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  // Sort blocks by start date (newest first)
  const sortedBlocks = useMemo(() =>
    [...blocks].sort((a, b) => b.startDate - a.startDate),
    [blocks]
  );

  const activeBlock = selectedBlockId
    ? sortedBlocks.find(b => b.id === selectedBlockId)
    : sortedBlocks[0] || null;

  // Workouts within the selected block
  const blockWorkouts = useMemo(() => {
    if (!activeBlock) return [];
    const blockEnd = activeBlock.startDate + (activeBlock.lengthWeeks || 8) * 7 * 86400000;
    return history
      .filter(w => w.timestamp >= activeBlock.startDate && w.timestamp < blockEnd)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [activeBlock, history]);

  // Per-week data within the block
  const weeklyData = useMemo(() => {
    if (!activeBlock || blockWorkouts.length === 0) return [];
    const weeks: {
      week: number;
      label: string;
      sessions: number;
      tonnage: number;
      sets: number;
      avgIntensity: number;
      avgRPE: number;
      phase: string;
    }[] = [];

    const totalWeeks = activeBlock.lengthWeeks || 8;
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = activeBlock.startDate + w * 7 * 86400000;
      const weekEnd = weekStart + 7 * 86400000;
      const weekWorkouts = blockWorkouts.filter(wo => wo.timestamp >= weekStart && wo.timestamp < weekEnd);

      const tonnage = weekWorkouts.reduce((s, wo) => s + (wo.actualTonnage || wo.estimatedTonnage || 0), 0);
      const sets = weekWorkouts.reduce((s, wo) => s + wo.exercises.reduce((es, e) => es + e.sets, 0), 0);
      const avgIntensity = weekWorkouts.length > 0
        ? weekWorkouts.reduce((s, wo) => {
            const exAvg = wo.exercises.reduce((es, e) => es + (e.percentOf1RM || 0), 0) / (wo.exercises.length || 1);
            return s + exAvg;
          }, 0) / weekWorkouts.length
        : 0;
      const avgRPE = weekWorkouts.filter(wo => wo.sessionRPE).length > 0
        ? weekWorkouts.filter(wo => wo.sessionRPE).reduce((s, wo) => s + (wo.sessionRPE || 0), 0) / weekWorkouts.filter(wo => wo.sessionRPE).length
        : 0;

      // Determine which phase this week falls in
      let phaseName = '';
      let cumWeeks = 0;
      for (const phase of (activeBlock.phases || [])) {
        if (w < cumWeeks + phase.weekCount) {
          phaseName = phase.phase;
          break;
        }
        cumWeeks += phase.weekCount;
      }

      weeks.push({
        week: w + 1,
        label: `W${w + 1}`,
        sessions: weekWorkouts.length,
        tonnage: Math.round(tonnage),
        sets,
        avgIntensity: Math.round(avgIntensity),
        avgRPE: Math.round(avgRPE * 10) / 10,
        phase: phaseName,
      });
    }

    return weeks;
  }, [activeBlock, blockWorkouts]);

  // Phase summary cards
  const phaseSummaries = useMemo(() => {
    if (!activeBlock?.phases) return [];

    let cumWeeks = 0;
    return activeBlock.phases.map((phase, idx) => {
      const phaseStart = activeBlock.startDate + cumWeeks * 7 * 86400000;
      const phaseEnd = phaseStart + phase.weekCount * 7 * 86400000;
      cumWeeks += phase.weekCount;

      const phaseWorkouts = blockWorkouts.filter(w => w.timestamp >= phaseStart && w.timestamp < phaseEnd);
      const tonnage = phaseWorkouts.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
      const sets = phaseWorkouts.reduce((s, w) => s + w.exercises.reduce((es, e) => es + e.sets, 0), 0);
      const avgRPE = phaseWorkouts.filter(w => w.sessionRPE).length > 0
        ? phaseWorkouts.filter(w => w.sessionRPE).reduce((s, w) => s + (w.sessionRPE || 0), 0) / phaseWorkouts.filter(w => w.sessionRPE).length
        : 0;
      const avgIntensity = phaseWorkouts.length > 0
        ? phaseWorkouts.reduce((s, w) => {
            const exAvg = w.exercises.reduce((es, e) => es + (e.percentOf1RM || 0), 0) / (w.exercises.length || 1);
            return s + exAvg;
          }, 0) / phaseWorkouts.length
        : 0;

      return {
        idx,
        phase: phase.phase,
        weekCount: phase.weekCount,
        description: phase.description,
        intensityFocus: phase.intensityFocus,
        volumeFocus: phase.volumeFocus,
        sessions: phaseWorkouts.length,
        tonnage,
        sets,
        avgRPE: Math.round(avgRPE * 10) / 10,
        avgIntensity: Math.round(avgIntensity),
        setsPerSession: phaseWorkouts.length > 0 ? Math.round(sets / phaseWorkouts.length) : 0,
      };
    });
  }, [activeBlock, blockWorkouts]);

  // 1RM changes during block
  const strengthChanges = useMemo(() => {
    if (!activeBlock) return [];
    const blockEnd = activeBlock.startDate + (activeBlock.lengthWeeks || 8) * 7 * 86400000;
    const bigFour = ['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'];
    const labels = ['Squat', 'Bench', 'Deadlift', 'OHP'];

    return bigFour.map((id, i) => {
      const exerciseRecords = liftRecords
        .filter(r => r.exerciseId === id)
        .sort((a, b) => a.date - b.date);

      // Best before block
      const beforeRecords = exerciseRecords.filter(r => r.date < activeBlock.startDate);
      const beforeBest = beforeRecords.length > 0 ? Math.max(...beforeRecords.map(r => r.estimated1RM)) : 0;

      // Best during block
      const duringRecords = exerciseRecords.filter(r => r.date >= activeBlock.startDate && r.date < blockEnd);
      const duringBest = duringRecords.length > 0 ? Math.max(...duringRecords.map(r => r.estimated1RM)) : 0;

      const delta = duringBest > 0 && beforeBest > 0 ? duringBest - beforeBest : 0;

      return { id, label: labels[i], before: Math.round(beforeBest), after: Math.round(duringBest), delta: Math.round(delta) };
    });
  }, [activeBlock, liftRecords]);

  // Block totals
  const blockTotals = useMemo(() => {
    const tonnage = blockWorkouts.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
    const sets = blockWorkouts.reduce((s, w) => s + w.exercises.reduce((es, e) => es + e.sets, 0), 0);
    return { sessions: blockWorkouts.length, tonnage, sets };
  }, [blockWorkouts]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers size={24} className="text-amber-500" /> Block Review
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Phase-by-phase analysis and block-over-block progress</p>
      </div>

      {/* Block Selector */}
      {sortedBlocks.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sortedBlocks.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBlockId(b.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeBlock?.id === b.id
                  ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-neutral-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              {b.name} {b.isActive ? '(Active)' : ''}
            </button>
          ))}
        </div>
      )}

      {!activeBlock ? (
        <div className="text-center py-12 text-gray-500">
          <Layers size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No training blocks yet.</p>
          <p className="text-xs mt-1">Create a block in the Plan tab to see analysis here!</p>
        </div>
      ) : (
        <>
          {/* Block Summary */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{activeBlock.name}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(activeBlock.startDate).toLocaleDateString()} — {activeBlock.lengthWeeks || 8} weeks
                  {activeBlock.isActive && <span className="text-green-400 ml-2">(Active)</span>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{blockTotals.sessions}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Sessions</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-400">{blockTotals.tonnage > 0 ? (blockTotals.tonnage / 1000).toFixed(0) + 'k' : '0'}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Total lbs</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{blockTotals.sets}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Total Sets</div>
              </div>
            </div>
          </div>

          {/* Strength Changes During Block */}
          {strengthChanges.some(s => s.after > 0) && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-amber-500" /> Strength Changes
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {strengthChanges.map(s => (
                  <div key={s.id} className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase">{s.label}</div>
                    <div className="text-sm font-bold text-white mt-1">{s.after > 0 ? s.after : '—'}</div>
                    {s.delta !== 0 && (
                      <div className={`text-[10px] font-semibold ${s.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {s.delta > 0 ? '+' : ''}{s.delta} lbs
                      </div>
                    )}
                    {s.before > 0 && s.delta === 0 && s.after > 0 && (
                      <div className="text-[10px] text-gray-600">maintained</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Volume + Intensity Chart */}
          {weeklyData.length > 0 && weeklyData.some(w => w.sessions > 0) && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-amber-500" /> Weekly Progression
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'tonnage') return [`${value.toLocaleString()} lbs`, 'Tonnage'];
                        if (name === 'sets') return [value, 'Sets'];
                        return [value, name];
                      }}
                      labelFormatter={(label: string, payload: any) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${label} — ${item.phase || 'No phase'} (${item.sessions} sessions)` : label;
                      }}
                    />
                    <Bar dataKey="tonnage" radius={[4, 4, 0, 0]} barSize={20}>
                      {weeklyData.map((entry, i) => (
                        <Cell key={i} fill={PHASE_COLORS[entry.phase] || '#3f3f46'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Phase color legend */}
              {activeBlock.phases && activeBlock.phases.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-neutral-800 justify-center">
                  {activeBlock.phases.map(p => (
                    <div key={p.phase} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PHASE_COLORS[p.phase] || '#6b7280' }} />
                      <span className="text-[10px] text-gray-400">{p.phase}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phase Breakdown Cards */}
          {phaseSummaries.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Target size={14} className="text-amber-500" /> Phase Breakdown
              </h3>
              <div className="space-y-2">
                {phaseSummaries.map(ps => {
                  const isExpanded = expandedPhase === ps.idx;
                  const color = PHASE_COLORS[ps.phase] || '#6b7280';

                  return (
                    <div key={ps.idx} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedPhase(isExpanded ? null : ps.idx)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }} />
                          <div>
                            <div className="text-sm font-semibold text-white">{ps.phase}</div>
                            <div className="text-[10px] text-gray-500">{ps.weekCount} week{ps.weekCount !== 1 ? 's' : ''} · {ps.intensityFocus} intensity · {ps.volumeFocus} volume</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{ps.sessions}</div>
                            <div className="text-[9px] text-gray-600">sessions</div>
                          </div>
                          {isExpanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-neutral-800 pt-3">
                          <p className="text-xs text-gray-500 mb-3">{ps.description}</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-neutral-800/50 rounded-lg p-2.5 text-center">
                              <div className="text-sm font-bold text-white">{ps.tonnage > 0 ? (ps.tonnage / 1000).toFixed(0) + 'k' : '0'}</div>
                              <div className="text-[9px] text-gray-500">Tonnage</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-lg p-2.5 text-center">
                              <div className="text-sm font-bold text-white">{ps.sets}</div>
                              <div className="text-[9px] text-gray-500">Total Sets</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-lg p-2.5 text-center">
                              <div className="text-sm font-bold text-white">{ps.avgRPE > 0 ? ps.avgRPE : '—'}</div>
                              <div className="text-[9px] text-gray-500">Avg RPE</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-lg p-2.5 text-center">
                              <div className="text-sm font-bold text-white">{ps.avgIntensity > 0 ? `${ps.avgIntensity}%` : '—'}</div>
                              <div className="text-[9px] text-gray-500">Avg %1RM</div>
                            </div>
                          </div>
                          {ps.setsPerSession > 0 && (
                            <div className="text-[10px] text-gray-500 mt-2 text-center">
                              Average {ps.setsPerSession} sets/session
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlockReviewView;
