import React, { useMemo } from 'react';
import {
  SavedWorkout, LiftRecord, TrainingGoal, SleepEntry,
  MuscleGroup,
} from '../types';
import {
  BarChart3, TrendingUp, Trophy, Target, Moon, Dumbbell,
  Heart, Activity, Award,
} from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
  goals: TrainingGoal[];
  sleepEntries: SleepEntry[];
  dismissedAlertIds: string[];
  onDismissAlert: (id: string) => void;
}

const DashboardView: React.FC<Props> = ({ history, liftRecords, goals, sleepEntries, dismissedAlertIds, onDismissAlert }) => {

  // ── CORE STATS ──────────────────────────────────
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

    const topLifts: Record<string, LiftRecord> = {};
    for (const r of liftRecords) {
      if (!topLifts[r.exerciseId] || r.estimated1RM > topLifts[r.exerciseId].estimated1RM) {
        topLifts[r.exerciseId] = r;
      }
    }

    const activeGoals = goals.filter(g => !g.completedDate);
    const recentSleep = sleepEntries.slice(0, 7);
    const avgSleep = recentSleep.length > 0
      ? recentSleep.reduce((sum, s) => sum + s.hoursSlept, 0) / recentSleep.length
      : 0;

    return { thisWeek, thisMonth, weeklyTonnage, monthlyTonnage, weeklySets, avgSessionRPE, topLifts, activeGoals, avgSleep };
  }, [history, liftRecords, goals, sleepEntries]);

  // ── RECOVERY SCORE ──────────────────────────────
  const recovery = useMemo(() => {
    const now = Date.now();
    const ms3d = 3 * 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    const last3d = history.filter(w => now - w.timestamp < ms3d);
    const last7d = history.filter(w => now - w.timestamp < ms7d);
    const hardSessions3d = last3d.filter(w => (w.sessionRPE || 7) >= 8).length;
    const hardSessions7d = last7d.filter(w => (w.sessionRPE || 7) >= 8).length;
    const tonnage7d = last7d.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);

    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const daysSinceLast = sorted.length > 0 ? Math.floor((now - sorted[0].timestamp) / (24 * 60 * 60 * 1000)) : 99;

    let score = 80;
    score -= hardSessions3d * 15;
    score -= hardSessions7d * 5;
    score -= Math.min(30, tonnage7d / 2000);
    score += daysSinceLast * 10;

    const recentSleep = sleepEntries.slice(0, 3);
    if (recentSleep.length > 0) {
      const avgHours = recentSleep.reduce((s, e) => s + e.hoursSlept, 0) / recentSleep.length;
      if (avgHours < 6) score -= 20;
      else if (avgHours < 7) score -= 10;
      else if (avgHours >= 8) score += 10;
    }

    score = Math.max(0, Math.min(100, score));

    let label: string;
    let suggestion: string;
    if (score >= 80) { label = 'Fully Recovered'; suggestion = 'Great day for a hard session'; }
    else if (score >= 60) { label = 'Mostly Recovered'; suggestion = 'Normal training appropriate'; }
    else if (score >= 40) { label = 'Moderate Fatigue'; suggestion = 'Consider lighter loads'; }
    else if (score >= 20) { label = 'High Fatigue'; suggestion = 'Active recovery recommended'; }
    else { label = 'Overtrained'; suggestion = 'Take a rest day'; }

    return { score: Math.round(score), label, suggestion };
  }, [history, sleepEntries]);

  // ── ACUTE:CHRONIC RATIO ─────────────────────────
  const acuteChronicRatio = useMemo(() => {
    const now = Date.now();
    const acute7 = history.filter(w => w.timestamp > now - 7 * 86400000).reduce((s, w) => s + (w.actualTonnage || 0), 0);
    const chronic28 = history.filter(w => w.timestamp > now - 28 * 86400000).reduce((s, w) => s + (w.actualTonnage || 0), 0);
    const weeklyAvg = chronic28 / 4;
    if (weeklyAvg === 0) return null;
    return Math.round((acute7 / weeklyAvg) * 100) / 100;
  }, [history]);

  // ── WEEKLY TONNAGE BARS (4 weeks) ───────────────
  const weeklyBars = useMemo(() => {
    const now = Date.now();
    const bars: { label: string; tonnage: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 86400000;
      const end = now - i * 7 * 86400000;
      const workouts = history.filter(w => w.timestamp >= start && w.timestamp < end);
      bars.push({
        label: i === 0 ? 'This wk' : i + 'wk ago',
        tonnage: workouts.reduce((s, w) => s + (w.actualTonnage || 0), 0),
      });
    }
    return bars;
  }, [history]);
  const maxBar = Math.max(...weeklyBars.map(b => b.tonnage), 1);

  // ── REPORT CARD GRADES ──────────────────────────
  const reportGrades = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 86400000;
    const fourWeeks = 28 * 86400000;
    const last4 = history.filter(w => w.timestamp > now - fourWeeks);

    const scoreToGrade = (s: number) => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

    // Consistency
    const weeklyCounts: number[] = [];
    for (let i = 0; i < 4; i++) {
      const start = now - (i + 1) * oneWeek;
      const end = now - i * oneWeek;
      weeklyCounts.push(history.filter(w => w.timestamp > start && w.timestamp <= end).length);
    }
    const avgPerWeek = weeklyCounts.reduce((a, b) => a + b, 0) / 4;
    const consistencyScore = Math.min(avgPerWeek / 4 * 100, 100);

    // Volume
    const weeklyTonnage: number[] = [];
    for (let i = 0; i < 4; i++) {
      const start = now - (i + 1) * oneWeek;
      const end = now - i * oneWeek;
      weeklyTonnage.push(history.filter(w => w.timestamp > start && w.timestamp <= end).reduce((s, w) => s + (w.actualTonnage || 0), 0));
    }
    weeklyTonnage.reverse();
    const trend = weeklyTonnage.length >= 2 ? weeklyTonnage[weeklyTonnage.length - 1] - weeklyTonnage[0] : 0;
    const total = weeklyTonnage.reduce((a, b) => a + b, 0);
    const volumeScore = total > 0 ? Math.min(50 + (trend > 0 ? 30 : 0) + (avgPerWeek >= 3 ? 20 : 10), 100) : 0;

    // Strength
    const groups = new Map<string, LiftRecord[]>();
    liftRecords.forEach(r => { const g = groups.get(r.exerciseId) || []; g.push(r); groups.set(r.exerciseId, g); });
    let improving = 0, tracked = 0;
    groups.forEach(recs => {
      if (recs.length < 2) return;
      tracked++;
      const sorted = [...recs].sort((a, b) => a.date - b.date);
      if (sorted[sorted.length - 1].estimated1RM > sorted[0].estimated1RM) improving++;
    });
    const strengthScore = tracked > 0 ? (improving / tracked) * 100 : 0;

    const grades = [
      { cat: 'Consistency', icon: '📅', grade: last4.length === 0 ? 'N/A' : scoreToGrade(consistencyScore), score: Math.round(consistencyScore) },
      { cat: 'Volume', icon: '📊', grade: total === 0 ? 'N/A' : scoreToGrade(volumeScore), score: Math.round(volumeScore) },
      { cat: 'Strength', icon: '💪', grade: tracked === 0 ? 'N/A' : scoreToGrade(strengthScore), score: Math.round(strengthScore) },
    ];

    const gradePoints: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const scored = grades.filter(g => g.grade !== 'N/A');
    const gpa = scored.length > 0 ? (scored.reduce((s, g) => s + (gradePoints[g.grade] || 0), 0) / scored.length).toFixed(1) : null;

    return { grades, gpa };
  }, [history, liftRecords]);

  // ── ACHIEVEMENTS ────────────────────────────────
  const achievements = useMemo(() => {
    const defs: { id: string; title: string; icon: string; check: () => boolean }[] = [
      { id: 'first', title: 'First Rep', icon: '🏋️', check: () => history.length >= 1 },
      { id: '10w', title: 'Dedicated (10)', icon: '💪', check: () => history.length >= 10 },
      { id: '25w', title: 'Consistent (25)', icon: '🔥', check: () => history.length >= 25 },
      { id: '50w', title: 'Iron Will (50)', icon: '⚡', check: () => history.length >= 50 },
      { id: '100w', title: 'Century (100)', icon: '🏆', check: () => history.length >= 100 },
      { id: 'logged', title: 'Logger', icon: '📝', check: () => history.some(w => w.completedSets && w.completedSets.length > 0) },
      { id: 'pr', title: 'PR Setter', icon: '🎯', check: () => liftRecords.length >= 1 },
      { id: '10k', title: '10K Club', icon: '🏗️', check: () => history.some(w => (w.actualTonnage || 0) >= 10000) },
      { id: 'squat225', title: '2-Plate Squat', icon: '🦵', check: () => liftRecords.some(r => r.exerciseId === 'back_squat' && r.estimated1RM >= 225) },
      { id: 'bench225', title: '2-Plate Bench', icon: '��️', check: () => liftRecords.some(r => r.exerciseId === 'bench_press' && r.estimated1RM >= 225) },
      { id: 'dl315', title: '3-Plate Deadlift', icon: '💪', check: () => liftRecords.some(r => r.exerciseId === 'conventional_deadlift' && r.estimated1RM >= 315) },
      { id: '1000', title: '1000lb Total', icon: '👑', check: () => {
        const best = (id: string) => Math.max(0, ...liftRecords.filter(r => r.exerciseId === id).map(r => r.estimated1RM));
        return (best('back_squat') + best('bench_press') + best('conventional_deadlift')) >= 1000;
      }},
    ];
    const unlocked = defs.filter(d => d.check());
    return { unlocked: unlocked.length, total: defs.length, recent: unlocked.slice(-3) };
  }, [history, liftRecords]);

  // ── SMART ALERTS ────────────────────────────────
  const alerts = useMemo(() => {
    const items: { id: string; type: 'warning' | 'success' | 'danger' | 'info'; icon: string; title: string; msg: string }[] = [];
    const now = Date.now();
    const d = 86400000;

    const recent7d = history.filter(w => w.timestamp > now - 7 * d);
    if (history.length > 0 && recent7d.length === 0) {
      items.push({ id: 'no-recent', type: 'warning', icon: '⚠️', title: 'No workouts this week', msg: 'Consistency is key — even a light session helps.' });
    }
    const last3d = history.filter(w => w.timestamp > now - 3 * d);
    if (last3d.length >= 4) {
      items.push({ id: 'high-freq', type: 'danger', icon: '🔴', title: 'High training frequency', msg: last3d.length + ' sessions in 3 days. Consider rest.' });
    }
    const highRPE = history.filter(w => w.timestamp > now - 7 * d && w.sessionRPE && w.sessionRPE >= 9).length;
    if (highRPE >= 3) {
      items.push({ id: 'high-rpe', type: 'warning', icon: '😤', title: 'Multiple RPE 9+ sessions', msg: 'Consider a deload session next.' });
    }
    const recentSleep = sleepEntries.filter(s => new Date(s.date).getTime() > now - 3 * d);
    const poorSleep = recentSleep.filter(s => s.quality === 'poor' || s.hoursSlept < 6);
    if (poorSleep.length >= 2) {
      items.push({ id: 'poor-sleep', type: 'warning', icon: '😴', title: 'Poor sleep pattern', msg: 'Reduce intensity and prioritize recovery.' });
    }

    return items.filter(a => !dismissedAlertIds.includes(a.id));
  }, [history, sleepEntries, dismissedAlertIds]);

  const bigFourLifts = ['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'];
  const bigFourNames: Record<string, string> = {
    back_squat: 'Squat', bench_press: 'Bench',
    conventional_deadlift: 'Deadlift', overhead_press: 'OHP',
  };

  const recoveryColor = recovery.score >= 80 ? 'text-green-400' : recovery.score >= 60 ? 'text-blue-400' : recovery.score >= 40 ? 'text-yellow-400' : 'text-amber-400';
  const recoveryBg = recovery.score >= 80 ? 'border-green-700/50 bg-green-500/5' : recovery.score >= 60 ? 'border-blue-700/50 bg-blue-500/5' : recovery.score >= 40 ? 'border-yellow-700/50 bg-yellow-500/5' : 'border-amber-700/50 bg-amber-500/5';

  const gradeColor: Record<string, string> = {
    A: 'text-green-400 bg-green-500/10', B: 'text-blue-400 bg-blue-500/10',
    C: 'text-yellow-400 bg-yellow-500/10', D: 'text-orange-400 bg-orange-500/10',
    F: 'text-amber-400 bg-amber-500/10', 'N/A': 'text-neutral-500 bg-neutral-800',
  };

  const acwrColor = !acuteChronicRatio ? 'text-gray-500'
    : acuteChronicRatio < 0.8 ? 'text-blue-400'
    : acuteChronicRatio <= 1.3 ? 'text-green-400'
    : acuteChronicRatio <= 1.5 ? 'text-yellow-400'
    : 'text-amber-400';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 size={24} className="text-amber-500" /> Dashboard
      </h2>

      {/* Welcome state for fresh users */}
      {history.length === 0 && liftRecords.length === 0 && (
        <div className="bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10">
            <Dumbbell size={32} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-white">Welcome to Your Dashboard</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Your training metrics, recovery insights, and progress tracking will appear here once you complete your first workout.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-2">
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Sessions</p>
              <p className="text-lg font-bold text-gray-600">&mdash;</p>
            </div>
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Tonnage</p>
              <p className="text-lg font-bold text-gray-600">&mdash;</p>
            </div>
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">PRs</p>
              <p className="text-lg font-bold text-gray-600">&mdash;</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SMART ALERTS ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className={`rounded-xl p-3 border flex items-start gap-3 ${
              a.type === 'danger' ? 'border-amber-500/30 bg-amber-500/5' :
              a.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
              a.type === 'success' ? 'border-green-500/30 bg-green-500/5' :
              'border-blue-500/30 bg-blue-500/5'
            }`}>
              <span className="text-lg flex-shrink-0">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className="text-xs text-neutral-400">{a.msg}</p>
              </div>
              <button onClick={() => onDismissAlert(a.id)} className="text-neutral-500 hover:text-neutral-300 text-xs flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── WEEK AT A GLANCE ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Sessions</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.thisWeek.length}</p>
          <p className="text-xs text-gray-500">this week</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Tonnage</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.weeklyTonnage > 0 ? (stats.weeklyTonnage / 1000).toFixed(0) + 'k' : '0'}</p>
          <p className="text-xs text-gray-500">lbs this week</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Sets</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.weeklySets}</p>
          <p className="text-xs text-gray-500">this week</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Avg RPE</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.avgSessionRPE ? stats.avgSessionRPE.toFixed(1) : '—'}</p>
          <p className="text-xs text-gray-500">/10</p>
        </div>
      </div>

      {/* ── RECOVERY + ACWR row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`border rounded-xl p-4 ${recoveryBg}`}>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-amber-500" />
            <span className="text-xs text-gray-400 uppercase font-medium">Recovery Status</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${recoveryColor}`}>{recovery.score}</span>
            <div>
              <p className="text-sm text-white font-medium">{recovery.label}</p>
              <p className="text-xs text-gray-400">{recovery.suggestion}</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-amber-500" />
            <span className="text-xs text-gray-400 uppercase font-medium">Acute : Chronic Ratio</span>
          </div>
          {acuteChronicRatio !== null ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${acwrColor}`}>{acuteChronicRatio.toFixed(2)}</span>
                <p className="text-xs text-gray-400">
                  {acuteChronicRatio < 0.8 && 'Under-training — safe to increase'}
                  {acuteChronicRatio >= 0.8 && acuteChronicRatio <= 1.3 && 'Sweet spot ✓'}
                  {acuteChronicRatio > 1.3 && acuteChronicRatio <= 1.5 && 'Caution — elevated risk'}
                  {acuteChronicRatio > 1.5 && 'Danger — load spike'}
                </p>
              </div>
              <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  acuteChronicRatio < 0.8 ? 'bg-blue-500' : acuteChronicRatio <= 1.3 ? 'bg-green-500' : acuteChronicRatio <= 1.5 ? 'bg-yellow-500' : 'bg-amber-500'
                }`} style={{ width: Math.min(acuteChronicRatio / 2 * 100, 100) + '%' }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Need more data</p>
          )}
        </div>
      </div>

      {/* ── BIG FOUR 1RMs ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-yellow-400" /> Estimated 1RMs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bigFourLifts.map(id => {
            const record = stats.topLifts[id];
            return (
              <div key={id} className="text-center">
                <p className="text-xs text-gray-400">{bigFourNames[id]}</p>
                <p className="text-xl font-bold text-white mt-1">{record ? Math.round(record.estimated1RM) + '' : '—'}</p>
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
                {Math.round(bigFourLifts.reduce((sum, id) => sum + (stats.topLifts[id]?.estimated1RM || 0), 0))} lbs
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── TONNAGE TREND (4 weeks) ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-amber-500" /> Weekly Tonnage</h3>
        {weeklyBars.some(b => b.tonnage > 0) ? (
          <div className="flex items-end gap-2 h-28">
            {weeklyBars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <span className="text-[10px] text-neutral-400 mb-1">{b.tonnage > 0 ? (b.tonnage / 1000).toFixed(0) + 'k' : ''}</span>
                <div
                  className="w-full bg-amber-500/80 rounded-t transition-all hover:bg-amber-400"
                  style={{ height: (b.tonnage / maxBar) * 100 + '%', minHeight: b.tonnage > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-neutral-500 mt-1">{b.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Complete some sessions to see trends</p>
        )}
      </div>

      {/* ── REPORT CARD GRADES ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">📋 Report Card</h3>
          {reportGrades.gpa && <span className="text-sm font-bold text-amber-400">GPA: {reportGrades.gpa}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {reportGrades.grades.map(g => (
            <div key={g.cat} className="text-center">
              <span className="text-lg">{g.icon}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">{g.cat}</p>
              <span className={'inline-block mt-1 w-8 h-8 leading-8 rounded-lg text-sm font-bold ' + gradeColor[g.grade]}>
                {g.grade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENT SESSIONS ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Dumbbell size={16} className="text-amber-400" /> Recent Sessions</h3>
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
                    <p className="text-sm text-amber-400 font-medium">{w.actualTonnage.toLocaleString()} lbs</p>
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

      {/* ── GOALS + SLEEP + ACHIEVEMENTS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Active Goals */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5"><Target size={14} className="text-green-400" /> Goals</h3>
          {stats.activeGoals.length === 0 ? (
            <p className="text-gray-500 text-xs">No active goals</p>
          ) : (
            <div className="space-y-2">
              {stats.activeGoals.slice(0, 3).map(g => {
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-300 truncate">{g.title}</span>
                      <span className="text-gray-400 ml-1">{pct}%</span>
                    </div>
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sleep */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5"><Moon size={14} className="text-blue-400" /> Sleep (7d avg)</h3>
          <p className="text-2xl font-bold text-white">{stats.avgSleep ? stats.avgSleep.toFixed(1) + 'h' : '—'}</p>
          {stats.avgSleep > 0 && (
            <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={'h-full rounded-full ' + (stats.avgSleep >= 7 ? 'bg-green-500' : stats.avgSleep >= 6 ? 'bg-yellow-500' : 'bg-amber-500')}
                style={{ width: Math.min(100, (stats.avgSleep / 9) * 100) + '%' }}
              />
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5"><Award size={14} className="text-yellow-400" /> Achievements</h3>
          <p className="text-2xl font-bold text-white">{achievements.unlocked}<span className="text-sm text-gray-500">/{achievements.total}</span></p>
          {achievements.recent.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {achievements.recent.map(a => (
                <span key={a.id} className="text-lg" title={a.title}>{a.icon}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 30-DAY SUMMARY ── */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400 uppercase mb-1">30-Day Summary</p>
        <p className="text-sm text-gray-300">
          <span className="text-white font-bold">{stats.thisMonth.length}</span> sessions •{' '}
          <span className="text-amber-400 font-bold">{stats.monthlyTonnage > 0 ? (stats.monthlyTonnage / 1000).toFixed(0) + 'k' : '0'}</span> lbs tonnage
        </p>
      </div>
    </div>
  );
};

export default DashboardView;
