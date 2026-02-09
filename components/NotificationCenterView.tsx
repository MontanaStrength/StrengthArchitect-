import React, { useMemo } from 'react';
import { SavedWorkout, LiftRecord, SleepEntry, TrainingGoal } from '../types';

interface Props {
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
  sleepEntries: SleepEntry[];
  goals: TrainingGoal[];
  dismissedAlertIds: string[];
  onDismissAlert: (id: string) => void;
  onClearDismissed: () => void;
  /** When provided, empty state shows a CTA to go to dashboard */
  onGoToDashboard?: () => void;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  icon: string;
  title: string;
  message: string;
  timestamp: number;
}

const NotificationCenterView: React.FC<Props> = ({ history, liftRecords, sleepEntries, goals, dismissedAlertIds, onDismissAlert, onClearDismissed, onGoToDashboard }) => {
  const alerts = useMemo<Alert[]>(() => {
    const items: Alert[] = [];
    const now = Date.now();
    const oneDay = 86400000;
    const oneWeek = 7 * oneDay;

    // 1. No recent workouts
    const recentWorkouts = history.filter(w => w.timestamp > now - oneWeek);
    if (history.length > 0 && recentWorkouts.length === 0) {
      items.push({
        id: 'no-recent-workouts',
        type: 'warning',
        icon: '⚠️',
        title: 'No workouts this week',
        message: 'You haven\'t logged a workout in over 7 days. Consistency is key — even a light session helps.',
        timestamp: now,
      });
    }

    // 2. High training frequency
    const last3Days = history.filter(w => w.timestamp > now - 3 * oneDay);
    if (last3Days.length >= 4) {
      items.push({
        id: 'high-frequency-3d',
        type: 'danger',
        icon: '🔴',
        title: 'High training frequency',
        message: `${last3Days.length} sessions in 3 days. Consider a rest day to avoid overtraining and reduce injury risk.`,
        timestamp: now,
      });
    }

    // 3. High RPE streak
    const highRPESessions = history
      .filter(w => w.timestamp > now - oneWeek && w.sessionRPE && w.sessionRPE >= 9)
      .length;
    if (highRPESessions >= 3) {
      items.push({
        id: 'high-rpe-streak',
        type: 'warning',
        icon: '😤',
        title: 'Multiple high-RPE sessions',
        message: `${highRPESessions} sessions at RPE 9+ this week. Consider a deload or lower-intensity session next.`,
        timestamp: now,
      });
    }

    // 4. PR alerts
    const recentPRs = liftRecords
      .filter(r => r.date > now - oneWeek)
      .sort((a, b) => b.estimated1RM - a.estimated1RM);
    if (recentPRs.length > 0) {
      // Group by exercise, find actual PRs
      const exercisePRs = new Map<string, LiftRecord>();
      liftRecords.forEach(r => {
        const existing = exercisePRs.get(r.exerciseId);
        if (!existing || r.estimated1RM > existing.estimated1RM) {
          exercisePRs.set(r.exerciseId, r);
        }
      });
      const newPRs = recentPRs.filter(r => {
        const best = exercisePRs.get(r.exerciseId);
        return best && best.id === r.id;
      });
      newPRs.forEach(pr => {
        items.push({
          id: `pr-${pr.id}`,
          type: 'success',
          icon: '🏆',
          title: `New PR: ${pr.exerciseName}!`,
          message: `${pr.weight} lbs × ${pr.reps} reps (est. 1RM: ${Math.round(pr.estimated1RM)} lbs)`,
          timestamp: pr.date,
        });
      });
    }

    // 5. Poor sleep warning
    const recentSleep = sleepEntries
      .filter(s => {
        const d = new Date(s.date).getTime();
        return d > now - 3 * oneDay;
      });
    const poorSleep = recentSleep.filter(s => s.quality === 'poor' || s.hoursSlept < 6);
    if (poorSleep.length >= 2) {
      items.push({
        id: 'poor-sleep-streak',
        type: 'warning',
        icon: '😴',
        title: 'Poor sleep pattern',
        message: 'Multiple nights of poor sleep recently. Consider reducing training intensity and prioritizing recovery.',
        timestamp: now,
      });
    }

    // 6. Goal approaching deadline
    goals.forEach(g => {
      if (g.completedDate) return;
      if (g.targetDate && g.targetDate < now + 7 * oneDay && g.targetDate > now) {
        const daysLeft = Math.ceil((g.targetDate - now) / oneDay);
        const progress = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
        items.push({
          id: `goal-deadline-${g.id}`,
          type: progress >= 80 ? 'info' : 'warning',
          icon: '🎯',
          title: `Goal deadline in ${daysLeft} days`,
          message: `"${g.title}" is ${Math.round(progress)}% complete. ${progress >= 80 ? 'Almost there!' : 'Push hard this week!'}`,
          timestamp: now,
        });
      }
    });

    // 7. Tonnage spike warning
    if (recentWorkouts.length > 0) {
      const thisWeekTonnage = recentWorkouts.reduce((s, w) => s + (w.actualTonnage || 0), 0);
      const prevWeek = history.filter(w => w.timestamp > now - 2 * oneWeek && w.timestamp <= now - oneWeek);
      const prevWeekTonnage = prevWeek.reduce((s, w) => s + (w.actualTonnage || 0), 0);
      if (prevWeekTonnage > 0 && thisWeekTonnage > prevWeekTonnage * 1.3) {
        items.push({
          id: 'tonnage-spike',
          type: 'warning',
          icon: '📈',
          title: 'Tonnage spike detected',
          message: `This week's tonnage is ${Math.round((thisWeekTonnage / prevWeekTonnage - 1) * 100)}% higher than last week. Keep acute:chronic ratio in check.`,
          timestamp: now,
        });
      }
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [history, liftRecords, sleepEntries, goals]);

  const activeAlerts = alerts.filter(a => !dismissedAlertIds.includes(a.id));
  const dismissedAlerts = alerts.filter(a => dismissedAlertIds.includes(a.id));

  const typeStyles: Record<Alert['type'], string> = {
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
    success: 'border-green-500/30 bg-green-500/5',
    danger: 'border-amber-500/30 bg-amber-500/5',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🔔</span> Notification Center
        {activeAlerts.length > 0 && (
          <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full">{activeAlerts.length}</span>
        )}
      </h2>

      {activeAlerts.length === 0 && (
        <div className="sa-card text-center py-12 px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-white">All clear</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            No active notifications. We'll nudge you about recovery, PRs, and goals when it's useful.
          </p>
          {onGoToDashboard && (
            <button
              onClick={onGoToDashboard}
              className="sa-btn sa-btn-secondary"
            >
              View Dashboard
            </button>
          )}
        </div>
      )}

      {/* Active Alerts */}
      <div className="space-y-3">
        {activeAlerts.map(alert => (
          <div key={alert.id} className={`rounded-xl p-4 border ${typeStyles[alert.type]} flex items-start gap-3`}>
            <span className="text-2xl flex-shrink-0">{alert.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
              <p className="text-sm text-neutral-400 mt-1">{alert.message}</p>
            </div>
            <button
              onClick={() => onDismissAlert(alert.id)}
              className="text-neutral-500 hover:text-neutral-300 text-sm flex-shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Dismissed */}
      {dismissedAlerts.length > 0 && (
        <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-neutral-400">Dismissed ({dismissedAlerts.length})</h3>
            <button
              onClick={onClearDismissed}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Clear All Dismissed
            </button>
          </div>
          <div className="space-y-2">
            {dismissedAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-2 text-sm text-neutral-500">
                <span>{alert.icon}</span>
                <span className="truncate">{alert.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterView;
