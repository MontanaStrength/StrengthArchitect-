import React, { useState, useMemo } from 'react';
import { SavedWorkout } from '../types';
import { computeSessionIntensity } from '../utils';
import { Calendar, Flame, Trophy, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
}

const INTENSITY_COLORS: Record<string, string> = {
  'light':     '#22c55e',
  'moderate':  '#3b82f6',
  'hard':      '#f59e0b',
  'very-hard': '#ef4444',
};

const INTENSITY_BG: Record<string, string> = {
  'light':     'bg-green-500/20',
  'moderate':  'bg-blue-500/20',
  'hard':      'bg-amber-500/20',
  'very-hard': 'bg-red-500/20',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AnalyticsCalendarView: React.FC<Props> = ({ history }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current, -1 = previous, etc.

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Map workouts by date string
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, SavedWorkout[]>();
    for (const w of history) {
      const d = new Date(w.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const arr = map.get(key) || [];
      arr.push(w);
      map.set(key, arr);
    }
    return map;
  }, [history]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const days: { date: string; dayNum: number; workouts: SavedWorkout[]; intensity: string | null; isToday: boolean; isCurrentMonth: boolean }[] = [];

    // Leading empty days
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevDate = new Date(year, month, -firstDayOfWeek + i + 1);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      const workouts = workoutsByDate.get(dateStr) || [];
      const intensity = workouts.length > 0 ? computeSessionIntensity(workouts[0]) : null;
      days.push({ date: dateStr, dayNum: prevDate.getDate(), workouts, intensity, isToday: dateStr === todayStr, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const workouts = workoutsByDate.get(dateStr) || [];
      const intensity = workouts.length > 0 ? computeSessionIntensity(workouts[0]) : null;
      days.push({ date: dateStr, dayNum: d, workouts, intensity, isToday: dateStr === todayStr, isCurrentMonth: true });
    }

    // Trailing days to fill grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        const workouts = workoutsByDate.get(dateStr) || [];
        const intensity = workouts.length > 0 ? computeSessionIntensity(workouts[0]) : null;
        days.push({ date: dateStr, dayNum: nextDate.getDate(), workouts, intensity, isToday: dateStr === todayStr, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfWeek, workoutsByDate]);

  // Streaks
  const streaks = useMemo(() => {
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const dates = new Set<string>();
    for (const w of sorted) {
      const d = new Date(w.timestamp);
      dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    // Current streak (consecutive weeks with at least 1 session)
    let currentStreak = 0;
    const today = new Date();
    for (let week = 0; week < 52; week++) {
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - week * 7);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const hasSession = sorted.some(w => w.timestamp >= weekStart.getTime() && w.timestamp < weekEnd.getTime());
      if (hasSession) currentStreak++;
      else break;
    }

    // Longest streak (consecutive weeks)
    let longestStreak = 0;
    let tempStreak = 0;
    // Go back 52 weeks
    for (let week = 51; week >= 0; week--) {
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - week * 7);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const hasSession = sorted.some(w => w.timestamp >= weekStart.getTime() && w.timestamp < weekEnd.getTime());
      if (hasSession) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return { currentStreak, longestStreak };
  }, [history]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthStart = new Date(year, month, 1).getTime();
    const monthEnd = new Date(year, month + 1, 1).getTime();
    const monthWorkouts = history.filter(w => w.timestamp >= monthStart && w.timestamp < monthEnd);
    const tonnage = monthWorkouts.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
    const totalSets = monthWorkouts.reduce((s, w) => s + w.exercises.reduce((es, e) => es + e.sets, 0), 0);
    const avgRPE = monthWorkouts.filter(w => w.sessionRPE).length > 0
      ? monthWorkouts.filter(w => w.sessionRPE).reduce((s, w) => s + (w.sessionRPE || 0), 0) / monthWorkouts.filter(w => w.sessionRPE).length
      : 0;
    return { sessions: monthWorkouts.length, tonnage, totalSets, avgRPE };
  }, [history, year, month]);

  // Selected date workouts
  const selectedWorkouts = selectedDate ? (workoutsByDate.get(selectedDate) || []) : [];

  // Heat map: last 90 days (contribution-style, but only shown as a compact row)
  const heatMapData = useMemo(() => {
    const days: { date: string; count: number; intensity: string | null }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const workouts = workoutsByDate.get(dateStr) || [];
      const intensity = workouts.length > 0 ? computeSessionIntensity(workouts[0]) : null;
      days.push({ date: dateStr, count: workouts.length, intensity });
    }
    return days;
  }, [workoutsByDate]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={24} className="text-amber-500" /> Calendar
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Training activity, streaks, and session history</p>
      </div>

      {/* Streak + Monthly Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{streaks.currentStreak}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Week Streak</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{monthStats.sessions}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Sessions</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{monthStats.tonnage > 0 ? (monthStats.tonnage / 1000).toFixed(0) + 'k' : '0'}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Tonnage</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{monthStats.avgRPE > 0 ? monthStats.avgRPE.toFixed(1) : '—'}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Avg RPE</div>
        </div>
      </div>

      {/* 90-Day Heat Map Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame size={14} className="text-amber-500" /> Last 90 Days
          </h3>
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <span>Longest streak: <span className="text-amber-400 font-bold">{streaks.longestStreak} weeks</span></span>
          </div>
        </div>
        <div className="flex gap-[3px] flex-wrap">
          {heatMapData.map(d => (
            <button
              key={d.date}
              onClick={() => d.count > 0 ? setSelectedDate(d.date) : null}
              className="w-[10px] h-[10px] rounded-[2px] transition-all hover:ring-1 hover:ring-white/20"
              style={{
                backgroundColor: d.intensity
                  ? INTENSITY_COLORS[d.intensity]
                  : '#1a1a1a',
                opacity: d.count > 0 ? 1 : 0.3,
              }}
              title={`${d.date}: ${d.count} session${d.count !== 1 ? 's' : ''}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 justify-end">
          <span className="text-[8px] text-gray-600">Less</span>
          <div className="flex gap-1">
            <div className="w-[10px] h-[10px] rounded-[2px] bg-[#1a1a1a] opacity-30" />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: INTENSITY_COLORS['light'] }} />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: INTENSITY_COLORS['moderate'] }} />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: INTENSITY_COLORS['hard'] }} />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: INTENSITY_COLORS['very-hard'] }} />
          </div>
          <span className="text-[8px] text-gray-600">More</span>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthOffset(prev => prev - 1)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-sm font-bold text-white">{MONTH_NAMES[month]} {year}</h3>
          <button
            onClick={() => setMonthOffset(prev => Math.min(0, prev + 1))}
            disabled={monthOffset >= 0}
            className="p-1.5 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[9px] text-gray-600 font-semibold py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const hasWorkout = day.workouts.length > 0;
            const isSelected = selectedDate === day.date;

            return (
              <button
                key={i}
                onClick={() => hasWorkout ? setSelectedDate(isSelected ? null : day.date) : null}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                  !day.isCurrentMonth ? 'opacity-25' :
                  isSelected ? 'ring-2 ring-amber-500 bg-amber-500/10' :
                  hasWorkout ? 'hover:bg-neutral-800 cursor-pointer' :
                  ''
                } ${day.isToday ? 'ring-1 ring-white/20' : ''}`}
              >
                <span className={`text-xs ${day.isToday ? 'text-amber-400 font-bold' : day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                  {day.dayNum}
                </span>
                {hasWorkout && (
                  <div className="flex gap-0.5 mt-0.5">
                    {day.workouts.slice(0, 3).map((w, j) => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: INTENSITY_COLORS[computeSessionIntensity(w)] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Workout Detail */}
      {selectedDate && selectedWorkouts.length > 0 && (
        <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {selectedWorkouts.map(w => {
              const intensity = computeSessionIntensity(w);
              const tonnage = w.actualTonnage || w.estimatedTonnage || 0;
              const totalSets = w.exercises.reduce((s, e) => s + e.sets, 0);

              return (
                <div key={w.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-white">{w.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${INTENSITY_BG[intensity]}`}
                          style={{ color: INTENSITY_COLORS[intensity] }}>
                          {intensity}
                        </span>
                        <span className="text-[10px] text-gray-500">{w.focus}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {w.sessionRPE && <div className="text-xs text-gray-400">RPE {w.sessionRPE}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-white">{w.exercises.length}</div>
                      <div className="text-[9px] text-gray-500">Exercises</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-white">{totalSets}</div>
                      <div className="text-[9px] text-gray-500">Sets</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-white">{tonnage > 0 ? (tonnage / 1000).toFixed(1) + 'k' : '—'}</div>
                      <div className="text-[9px] text-gray-500">Tonnage</div>
                    </div>
                  </div>

                  {/* Exercise list */}
                  <div className="space-y-1 pt-1">
                    {w.exercises.filter(e => !e.isWarmupSet).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate">{ex.exerciseName}</span>
                        <span className="text-gray-500 shrink-0 ml-2">
                          {ex.sets}×{ex.reps} {ex.weightLbs ? `@ ${ex.weightLbs} lbs` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No training history yet.</p>
          <p className="text-xs mt-1">Complete your first session to see it here!</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCalendarView;
