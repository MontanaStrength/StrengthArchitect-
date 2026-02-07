import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, TrainingGoal } from '../types';

interface Props {
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
  goals: TrainingGoal[];
}

interface ReportCard {
  category: string;
  icon: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  score: number; // 0-100
  summary: string;
  details: string[];
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-400 bg-green-500/10 border-green-500/30',
  B: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  C: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  D: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  F: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'N/A': 'text-neutral-500 bg-neutral-800 border-neutral-700',
};

const scoreToGrade = (score: number): ReportCard['grade'] => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const ReportCardsView: React.FC<Props> = ({ history, liftRecords, goals }) => {
  const reports = useMemo<ReportCard[]>(() => {
    const now = Date.now();
    const oneWeek = 7 * 86400000;
    const fourWeeks = 28 * 86400000;
    const last4Weeks = history.filter(w => w.date > now - fourWeeks);
    const lastWeek = history.filter(w => w.date > now - oneWeek);
    const cards: ReportCard[] = [];

    // 1. Consistency
    const weeklyCounts: number[] = [];
    for (let i = 0; i < 4; i++) {
      const start = now - (i + 1) * oneWeek;
      const end = now - i * oneWeek;
      weeklyCounts.push(history.filter(w => w.date > start && w.date <= end).length);
    }
    const avgPerWeek = weeklyCounts.reduce((a, b) => a + b, 0) / 4;
    const consistencyScore = Math.min(avgPerWeek / 4 * 100, 100); // 4 sessions/week = 100%
    const variance = weeklyCounts.length > 1 
      ? Math.sqrt(weeklyCounts.reduce((s, c) => s + Math.pow(c - avgPerWeek, 2), 0) / weeklyCounts.length)
      : 0;
    cards.push({
      category: 'Consistency',
      icon: '📅',
      grade: last4Weeks.length === 0 ? 'N/A' : scoreToGrade(consistencyScore),
      score: Math.round(consistencyScore),
      summary: `${avgPerWeek.toFixed(1)} sessions/week (4-week avg)`,
      details: [
        `Weekly sessions: ${weeklyCounts.reverse().join(', ')}`,
        `Variance: ${variance.toFixed(1)} (lower is more consistent)`,
        avgPerWeek >= 3 ? '✅ Great training frequency' : '⚠️ Aim for 3-4 sessions per week',
      ],
    });

    // 2. Volume Progression
    const weeklyTonnage: number[] = [];
    for (let i = 0; i < 4; i++) {
      const start = now - (i + 1) * oneWeek;
      const end = now - i * oneWeek;
      const weekWorkouts = history.filter(w => w.date > start && w.date <= end);
      weeklyTonnage.push(weekWorkouts.reduce((s, w) => s + (w.actualTonnage || 0), 0));
    }
    weeklyTonnage.reverse();
    const tonnageTrend = weeklyTonnage.length >= 2 
      ? weeklyTonnage[weeklyTonnage.length - 1] - weeklyTonnage[0] 
      : 0;
    const totalTonnage = weeklyTonnage.reduce((a, b) => a + b, 0);
    const volumeScore = totalTonnage > 0 
      ? Math.min(50 + (tonnageTrend > 0 ? 30 : 0) + (avgPerWeek >= 3 ? 20 : 10), 100) 
      : 0;
    cards.push({
      category: 'Volume Progression',
      icon: '📊',
      grade: totalTonnage === 0 ? 'N/A' : scoreToGrade(volumeScore),
      score: Math.round(volumeScore),
      summary: `${(totalTonnage / 1000).toFixed(0)}k lbs total tonnage (4 weeks)`,
      details: [
        `Weekly tonnage: ${weeklyTonnage.map(t => `${(t / 1000).toFixed(0)}k`).join(' → ')}`,
        tonnageTrend > 0 ? '📈 Volume trending up — good progression' : tonnageTrend < 0 ? '📉 Volume trending down' : '➡️ Volume stable',
      ],
    });

    // 3. Strength Progress
    const exerciseGroups = new Map<string, LiftRecord[]>();
    liftRecords.forEach(r => {
      const group = exerciseGroups.get(r.exerciseId) || [];
      group.push(r);
      exerciseGroups.set(r.exerciseId, group);
    });
    let improvingExercises = 0;
    let totalExercises = 0;
    exerciseGroups.forEach(records => {
      if (records.length < 2) return;
      totalExercises++;
      const sorted = [...records].sort((a, b) => a.date - b.date);
      const first = sorted[0].estimated1RM;
      const last = sorted[sorted.length - 1].estimated1RM;
      if (last > first) improvingExercises++;
    });
    const strengthScore = totalExercises > 0 ? (improvingExercises / totalExercises) * 100 : 0;
    cards.push({
      category: 'Strength Progress',
      icon: '💪',
      grade: totalExercises === 0 ? 'N/A' : scoreToGrade(strengthScore),
      score: Math.round(strengthScore),
      summary: `${improvingExercises}/${totalExercises} lifts improving`,
      details: [
        `${liftRecords.length} total records tracked`,
        improvingExercises > 0 ? `✅ ${improvingExercises} exercises with estimated 1RM increases` : '⚠️ No measurable improvements yet',
      ],
    });

    // 4. Goal Progress
    const activeGoals = goals.filter(g => !g.completedDate);
    const completedGoals = goals.filter(g => g.completedDate);
    const onTrack = activeGoals.filter(g => {
      if (!g.targetDate || g.targetValue === 0) return true;
      const elapsed = (now - g.startDate) / (g.targetDate - g.startDate);
      const progress = g.currentValue / g.targetValue;
      return progress >= elapsed * 0.8;
    });
    const goalScore = goals.length > 0 
      ? ((completedGoals.length + onTrack.length) / goals.length) * 100 
      : 0;
    cards.push({
      category: 'Goals',
      icon: '🎯',
      grade: goals.length === 0 ? 'N/A' : scoreToGrade(goalScore),
      score: Math.round(goalScore),
      summary: `${completedGoals.length} completed, ${activeGoals.length} active`,
      details: [
        `${onTrack.length}/${activeGoals.length} active goals on track`,
        completedGoals.length > 0 ? `🏆 ${completedGoals.length} goals achieved!` : 'Set some goals to track progress',
      ],
    });

    // 5. Intensity Management
    const rpes = last4Weeks.filter(w => w.sessionRPE).map(w => w.sessionRPE!);
    const avgRPE = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0;
    const highRPE = rpes.filter(r => r >= 9).length;
    const lowRPE = rpes.filter(r => r <= 6).length;
    // Good intensity management: avg 7-8, mix of easy and hard
    const intensityScore = rpes.length > 0
      ? Math.max(0, 100 - Math.abs(avgRPE - 7.5) * 15 - (highRPE > rpes.length * 0.5 ? 20 : 0))
      : 0;
    cards.push({
      category: 'Intensity Management',
      icon: '🔥',
      grade: rpes.length === 0 ? 'N/A' : scoreToGrade(intensityScore),
      score: Math.round(intensityScore),
      summary: `Avg RPE: ${avgRPE.toFixed(1)} across ${rpes.length} sessions`,
      details: [
        `High intensity (RPE 9+): ${highRPE} sessions`,
        `Easy sessions (RPE ≤6): ${lowRPE} sessions`,
        avgRPE >= 7 && avgRPE <= 8.5 ? '✅ Good intensity balance' : avgRPE > 8.5 ? '⚠️ Training too hard — add easy days' : '⚠️ Could push harder on some sessions',
      ],
    });

    return cards;
  }, [history, liftRecords, goals]);

  const overallGPA = useMemo(() => {
    const gradePoints: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const scored = reports.filter(r => r.grade !== 'N/A');
    if (scored.length === 0) return null;
    const total = scored.reduce((s, r) => s + (gradePoints[r.grade] || 0), 0);
    return (total / scored.length).toFixed(2);
  }, [reports]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">📋</span> Training Report Cards
      </h2>

      {/* Overall GPA */}
      {overallGPA && (
        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 text-center">
          <div className="text-sm text-neutral-400 mb-1">Overall Training GPA</div>
          <div className="text-5xl font-bold text-amber-400">{overallGPA}</div>
          <div className="text-sm text-neutral-400 mt-1">/ 4.00</div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map(report => (
          <div key={report.category} className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{report.icon}</span>
                <h3 className="text-sm font-semibold text-white">{report.category}</h3>
              </div>
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg border text-lg font-bold ${GRADE_COLORS[report.grade]}`}>
                {report.grade}
              </div>
            </div>
            <p className="text-sm text-neutral-300 mb-3">{report.summary}</p>
            {/* Score Bar */}
            {report.grade !== 'N/A' && (
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${report.score}%` }}
                />
              </div>
            )}
            <ul className="space-y-1">
              {report.details.map((detail, i) => (
                <li key={i} className="text-xs text-neutral-400">{detail}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportCardsView;
