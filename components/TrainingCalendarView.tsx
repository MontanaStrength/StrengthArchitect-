import React, { useState, useMemo } from 'react';
import { ScheduledWorkout, SavedWorkout, TrainingGoalFocus, ScheduledWorkoutStatus } from '../shared/types';
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  scheduled: ScheduledWorkout[];
  history: SavedWorkout[];
  onSave: (sw: ScheduledWorkout) => void;
  onDelete: (id: string) => void;
}

const TrainingCalendarView: React.FC<Props> = ({ scheduled, history, onSave, onDelete }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addFocus, setAddFocus] = useState<TrainingGoalFocus>('strength');
  const [addIntensity, setAddIntensity] = useState<'low' | 'moderate' | 'high' | 'rest'>('moderate');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: { date: string; dayNum: number; scheduled: ScheduledWorkout[]; completed: SavedWorkout[]; isToday: boolean }[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayScheduled = scheduled.filter(s => s.date === dateStr);
      const dayStart = new Date(year, month, d).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayCompleted = history.filter(w => w.timestamp >= dayStart && w.timestamp < dayEnd);
      days.push({ date: dateStr, dayNum: d, scheduled: dayScheduled, completed: dayCompleted, isToday: dateStr === today });
    }
    return days;
  }, [year, month, daysInMonth, scheduled, history]);

  const handleSave = () => {
    if (!addDate || !addLabel) return;
    const sw: ScheduledWorkout = {
      id: crypto.randomUUID(),
      date: addDate,
      label: addLabel,
      suggestedFocus: addFocus,
      suggestedIntensity: addIntensity,
      status: 'planned',
    };
    onSave(sw);
    setShowAdd(false);
    setAddLabel('');
  };

  const toggleStatus = (sw: ScheduledWorkout) => {
    const nextStatus: Record<ScheduledWorkoutStatus, ScheduledWorkoutStatus> = {
      planned: 'completed',
      completed: 'skipped',
      skipped: 'planned',
    };
    onSave({ ...sw, status: nextStatus[sw.status] });
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar size={24} className="text-amber-500" /> Training Calendar</h2>
        <button onClick={() => { setShowAdd(!showAdd); setAddDate(new Date().toISOString().split('T')[0]); }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg"><Plus size={16} /> Schedule</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Label</label>
              <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="e.g., Upper Body" className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Focus</label>
              <select value={addFocus} onChange={e => setAddFocus(e.target.value as TrainingGoalFocus)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                <option value="strength">Strength</option><option value="hypertrophy">Hypertrophy</option><option value="power">Power</option><option value="endurance">Endurance</option><option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Intensity</label>
              <select value={addIntensity} onChange={e => setAddIntensity(e.target.value as any)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="rest">Rest</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!addDate || !addLabel} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-bold text-white">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="grid grid-cols-7 gap-1 min-w-[420px]">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {calendarDays.map(day => (
          <div
            key={day.date}
            className={`min-h-[72px] p-1 rounded-lg border text-xs transition-all ${
              day.isToday ? 'border-amber-500 bg-amber-900/20' : 'border-neutral-800 bg-neutral-900/50'
            }`}
          >
            <p className={`text-right text-[10px] ${day.isToday ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>{day.dayNum}</p>
            {day.scheduled.map(s => (
              <button
                key={s.id}
                onClick={() => toggleStatus(s)}
                className={`w-full text-left px-1 py-0.5 rounded text-[9px] truncate mt-0.5 ${
                  s.status === 'completed' ? 'bg-green-900/50 text-green-300 line-through' :
                  s.status === 'skipped' ? 'bg-neutral-800 text-gray-500 line-through' :
                  'bg-blue-900/50 text-blue-300'
                }`}
                title={`${s.label} (${s.status}) — click to toggle`}
              >
                {s.label}
              </button>
            ))}
            {day.completed.map(w => (
              <div key={w.id} className="px-1 py-0.5 rounded bg-amber-900/30 text-amber-300 text-[9px] truncate mt-0.5">
                ✓ {w.title}
              </div>
            ))}
          </div>
        ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Planned</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Logged Session</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Skipped</span>
      </div>
    </div>
  );
};

export default TrainingCalendarView;
