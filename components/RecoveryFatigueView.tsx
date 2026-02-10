import React, { useMemo } from 'react';
import { SavedWorkout, SleepEntry } from '../types';
import {
  calculateSetFatigueScore,
  calculateSetMetabolicLoad,
  FATIGUE_ZONES,
  METABOLIC_ZONES,
} from '../services/optimizerEngine';
import { parseRepsToAverage } from '../utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, LineChart, Line, ScatterChart, Scatter, ZAxis,
  ComposedChart, Bar,
} from 'recharts';
import { Heart, Zap, Moon, Activity, TrendingDown, ShieldCheck } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  sleepEntries: SleepEntry[];
}

// ===== HELPERS =====

/** Compute per-session fatigue score using the Hanley formula */
const computeSessionFatigue = (workout: SavedWorkout): number => {
  let total = 0;
  for (const ex of workout.exercises) {
    if (ex.isWarmupSet) continue;
    const intensity = ex.percentOf1RM || 70; // default 70% if unknown
    const reps = parseRepsToAverage(ex.reps);
    total += calculateSetFatigueScore(reps * ex.sets, intensity);
  }
  return total;
};

/** Compute per-session metabolic stress using the Frederick formula */
const computeSessionMetabolicStress = (workout: SavedWorkout): number => {
  let total = 0;
  for (const ex of workout.exercises) {
    if (ex.isWarmupSet) continue;
    const intensity = ex.percentOf1RM || 70;
    const reps = parseRepsToAverage(ex.reps);
    const rpe = ex.rpeTarget || 7;
    for (let s = 0; s < ex.sets; s++) {
      total += calculateSetMetabolicLoad(intensity, reps, rpe);
    }
  }
  return total;
};

const ZONE_COLORS: Record<string, string> = {
  'light': '#22c55e',
  'moderate': '#3b82f6',
  'moderate-high': '#f59e0b',
  'high': '#ef4444',
  'extreme': '#dc2626',
};

// ===== COMPONENT =====

const RecoveryFatigueView: React.FC<Props> = ({ history, sleepEntries }) => {

  // Per-session fatigue + metabolic data (last 30 sessions)
  const sessionData = useMemo(() => {
    const recent = [...history].sort((a, b) => a.timestamp - b.timestamp).slice(-30);
    return recent.map(w => {
      const fatigue = computeSessionFatigue(w);
      const metabolic = computeSessionMetabolicStress(w);
      const tonnage = w.actualTonnage || w.estimatedTonnage || 0;
      const intensity = w.exercises.reduce((s, e) => s + (e.percentOf1RM || 0), 0) / (w.exercises.length || 1);
      return {
        date: w.timestamp,
        dateLabel: new Date(w.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fatigue: Math.round(fatigue),
        metabolic: Math.round(metabolic),
        tonnage: Math.round(tonnage),
        rpe: w.sessionRPE || 0,
        intensity: Math.round(intensity),
        title: w.title,
      };
    });
  }, [history]);

  // ACWR (Acute:Chronic Workload Ratio) time series
  const acwrData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length < 4) return [];

    const points: { date: number; dateLabel: string; acwr: number; acute: number; chronic: number }[] = [];
    const now = Date.now();

    // Compute ACWR for each of the last 12 weeks
    for (let week = 11; week >= 0; week--) {
      const weekEnd = now - week * 7 * 86400000;
      const acuteStart = weekEnd - 7 * 86400000;
      const chronicStart = weekEnd - 28 * 86400000;

      const acute = sorted
        .filter(w => w.timestamp >= acuteStart && w.timestamp < weekEnd)
        .reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);

      const chronicWeeks: number[] = [];
      for (let cw = 0; cw < 4; cw++) {
        const cwStart = chronicStart + cw * 7 * 86400000;
        const cwEnd = cwStart + 7 * 86400000;
        const weekTonnage = sorted
          .filter(w => w.timestamp >= cwStart && w.timestamp < cwEnd)
          .reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
        chronicWeeks.push(weekTonnage);
      }
      const chronic = chronicWeeks.reduce((s, v) => s + v, 0) / 4;
      const acwr = chronic > 0 ? acute / chronic : 0;

      points.push({
        date: weekEnd,
        dateLabel: new Date(weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        acwr: Math.round(acwr * 100) / 100,
        acute: Math.round(acute),
        chronic: Math.round(chronic),
      });
    }

    return points;
  }, [history]);

  // Recovery score (current)
  const recoveryScore = useMemo(() => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 86400000;
    const sevenDaysAgo = now - 7 * 86400000;

    const last3 = history.filter(w => w.timestamp >= threeDaysAgo);
    const last7 = history.filter(w => w.timestamp >= sevenDaysAgo);

    let score = 80;

    // Hard sessions penalty
    const hardRecent = last3.filter(w => (w.sessionRPE || 0) >= 8 || w.exercises.some(e => (e.percentOf1RM || 0) >= 85)).length;
    const hardWeek = last7.filter(w => (w.sessionRPE || 0) >= 8 || w.exercises.some(e => (e.percentOf1RM || 0) >= 85)).length;
    score -= hardRecent * 15;
    score -= hardWeek * 5;

    // Tonnage penalty
    const weekTonnage = last7.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
    score -= Math.min(30, Math.round(weekTonnage / 2000));

    // Days since last workout bonus
    const lastWorkout = history[0];
    if (lastWorkout) {
      const daysSince = (now - lastWorkout.timestamp) / 86400000;
      score += Math.min(20, Math.round(daysSince * 10));
    }

    // Sleep adjustment
    const recentSleep = sleepEntries.filter(s => {
      const d = new Date(s.date).getTime();
      return d >= sevenDaysAgo;
    });
    if (recentSleep.length > 0) {
      const avgHours = recentSleep.reduce((s, e) => s + e.hoursSlept, 0) / recentSleep.length;
      if (avgHours >= 8) score += 10;
      else if (avgHours >= 7) score += 5;
      else if (avgHours < 6) score -= 15;
      else if (avgHours < 7) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }, [history, sleepEntries]);

  const recoveryLabel = recoveryScore >= 80 ? 'Fresh' : recoveryScore >= 60 ? 'Recovered' : recoveryScore >= 40 ? 'Moderate Fatigue' : recoveryScore >= 20 ? 'High Fatigue' : 'Overtrained';
  const recoveryColor = recoveryScore >= 80 ? '#22c55e' : recoveryScore >= 60 ? '#3b82f6' : recoveryScore >= 40 ? '#f59e0b' : '#ef4444';

  // Current ACWR
  const currentACWR = acwrData.length > 0 ? acwrData[acwrData.length - 1].acwr : 0;
  const acwrLabel = currentACWR < 0.8 ? 'Under-training' : currentACWR <= 1.3 ? 'Sweet Spot' : currentACWR <= 1.5 ? 'Caution' : 'Danger';
  const acwrColor = currentACWR < 0.8 ? '#3b82f6' : currentACWR <= 1.3 ? '#22c55e' : currentACWR <= 1.5 ? '#f59e0b' : '#ef4444';

  // Sleep trend (last 14 days)
  const sleepTrend = useMemo(() => {
    return [...sleepEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14)
      .map(s => ({
        date: s.date,
        dateLabel: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: s.hoursSlept,
        quality: s.quality === 'excellent' ? 4 : s.quality === 'good' ? 3 : s.quality === 'fair' ? 2 : 1,
        hrv: s.hrv || null,
      }));
  }, [sleepEntries]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart size={24} className="text-amber-500" /> Recovery
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Fatigue tracking, workload ratios, and recovery signals</p>
      </div>

      {/* Top Cards — Recovery Score + ACWR */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recovery Score</div>
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#262626" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={recoveryColor} strokeWidth="6"
                strokeDasharray={`${recoveryScore * 2.136} 213.6`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-bold text-white">{recoveryScore}</span>
          </div>
          <div className="text-xs font-semibold" style={{ color: recoveryColor }}>{recoveryLabel}</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Workload Ratio</div>
          <div className="text-3xl font-bold text-white mb-1">{currentACWR.toFixed(2)}</div>
          <div className="text-xs font-semibold" style={{ color: acwrColor }}>{acwrLabel}</div>
          <div className="text-[9px] text-gray-600 mt-1">Acute:Chronic (0.8-1.3 optimal)</div>
        </div>
      </div>

      {/* Fatigue Score Chart — Hanley Metric */}
      {sessionData.length >= 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={14} className="text-amber-500" /> Session Fatigue Score
              </h3>
              <p className="text-[10px] text-gray-500">Hanley Fatigue Metric — higher = more neuromuscular stress</p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sessionData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                {/* Zone bands */}
                <ReferenceArea y1={0} y2={400} fill="#22c55e" fillOpacity={0.04} />
                <ReferenceArea y1={400} y2={600} fill="#3b82f6" fillOpacity={0.04} />
                <ReferenceArea y1={600} y2={800} fill="#f59e0b" fillOpacity={0.06} />
                <ReferenceArea y1={800} y2={10000} fill="#ef4444" fillOpacity={0.06} />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'fatigue') return [`${value}`, 'Fatigue Score'];
                    return [`${value}`, name];
                  }}
                  labelFormatter={(label: string, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${label} — "${item.title}"` : label;
                  }}
                />
                <Area type="monotone" dataKey="fatigue" stroke="#ef4444" strokeWidth={2} fill="url(#fatigueGrad)"
                  dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#f87171', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Zone legend */}
          <div className="flex gap-3 mt-3 pt-3 border-t border-neutral-800 justify-center">
            {FATIGUE_ZONES.slice(0, 4).map(z => (
              <div key={z.zone} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[z.zone] }} />
                <span className="text-[9px] text-gray-500">{z.label} ({z.min}-{z.max})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACWR Time Series */}
      {acwrData.length >= 3 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={14} className="text-amber-500" /> Workload Ratio Trend
              </h3>
              <p className="text-[10px] text-gray-500">Acute:Chronic — stay in the green zone (0.8-1.3)</p>
            </div>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={acwrData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                {/* Sweet spot band */}
                <ReferenceArea y1={0.8} y2={1.3} fill="#22c55e" fillOpacity={0.08} />
                <ReferenceLine y={1.0} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.3} />
                <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.3} />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'acwr') return [value.toFixed(2), 'ACWR'];
                    return [`${value.toLocaleString()} lbs`, name === 'acute' ? 'Acute (7d)' : 'Chronic (28d avg)'];
                  }}
                />
                <Line type="monotone" dataKey="acwr" stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#fbbf24', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sleep Trend */}
      {sleepTrend.length >= 3 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Moon size={14} className="text-blue-400" /> Sleep Trend
              </h3>
              <p className="text-[10px] text-gray-500">Last 14 nights — hours and quality</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-400">
                {(sleepTrend.reduce((s, d) => s + d.hours, 0) / sleepTrend.length).toFixed(1)}h
              </div>
              <div className="text-[9px] text-gray-600">avg</div>
            </div>
          </div>

          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sleepTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <ReferenceArea y1={7} y2={9} fill="#3b82f6" fillOpacity={0.05} />
                <ReferenceLine y={8} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.3} />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[4, 10]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'hours') return [`${value}h`, 'Sleep'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="hours" fill="#3b82f6" fillOpacity={0.6} radius={[3, 3, 0, 0]} barSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metabolic Stress Chart — Frederick Formula */}
      {sessionData.length >= 2 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingDown size={14} className="text-purple-400" /> Metabolic Stress
              </h3>
              <p className="text-[10px] text-gray-500">Frederick Formula — higher = more hypertrophic stimulus per session</p>
            </div>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="metabolicGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  formatter={(value: number) => [`${value}`, 'Metabolic Load']}
                  labelFormatter={(label: string, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${label} — "${item.title}"` : label;
                  }}
                />
                <Area type="monotone" dataKey="metabolic" stroke="#a855f7" strokeWidth={2} fill="url(#metabolicGrad)"
                  dot={{ fill: '#a855f7', r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: '#c084fc', r: 5, strokeWidth: 2, stroke: '#1a1a1a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Zone legend */}
          <div className="flex gap-3 mt-3 pt-3 border-t border-neutral-800 justify-center">
            {METABOLIC_ZONES.slice(0, 4).map(z => (
              <div key={z.zone} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[z.zone] }} />
                <span className="text-[9px] text-gray-500">{z.label} ({z.min}-{z.max})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessionData.length < 2 && sleepTrend.length < 3 && (
        <div className="text-center py-12 text-gray-500">
          <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Not enough data yet.</p>
          <p className="text-xs mt-1">Complete a few sessions and log sleep to see recovery analytics!</p>
        </div>
      )}
    </div>
  );
};

export default RecoveryFatigueView;
