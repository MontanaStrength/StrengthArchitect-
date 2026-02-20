import React, { useState, useMemo, useCallback } from 'react';
import { ScheduledWorkout, SavedWorkout, TrainingGoalFocus, ScheduledWorkoutStatus, TrainingPhase, SkeletonExercise } from '../shared/types';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Search, Dumbbell } from 'lucide-react';
import { getAllExercises } from '../shared/services/exerciseLibrary';

interface Props {
  scheduled: ScheduledWorkout[];
  history: SavedWorkout[];
  onSave: (sw: ScheduledWorkout) => void;
  onDelete: (id: string) => void;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  [TrainingPhase.HYPERTROPHY]:     { bg: 'bg-blue-900/50',   text: 'text-blue-300',   border: 'border-blue-700/50' },
  [TrainingPhase.ACCUMULATION]:    { bg: 'bg-cyan-900/50',   text: 'text-cyan-300',   border: 'border-cyan-700/50' },
  [TrainingPhase.STRENGTH]:        { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700/50' },
  [TrainingPhase.INTENSIFICATION]: { bg: 'bg-violet-900/50', text: 'text-violet-300', border: 'border-violet-700/50' },
  [TrainingPhase.REALIZATION]:     { bg: 'bg-rose-900/50',   text: 'text-rose-300',   border: 'border-rose-700/50' },
  [TrainingPhase.PEAKING]:         { bg: 'bg-red-900/50',    text: 'text-red-300',    border: 'border-red-700/50' },
  [TrainingPhase.DELOAD]:          { bg: 'bg-emerald-900/50',text: 'text-emerald-300',border: 'border-emerald-700/50' },
};
const DEFAULT_PHASE_COLOR = { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700/50' };

function getWeeksFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return (date.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000);
}

const TIER_OPTIONS: SkeletonExercise['tier'][] = ['primary', 'secondary', 'tertiary', 'accessory'];

const TrainingCalendarView: React.FC<Props> = ({ scheduled, history, onSave, onDelete }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addFocus, setAddFocus] = useState<TrainingGoalFocus>('strength');
  const [addIntensity, setAddIntensity] = useState<'low' | 'moderate' | 'high' | 'rest'>('moderate');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const allExercises = useMemo(() => getAllExercises(), []);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return [];
    const q = exerciseSearch.toLowerCase();
    return allExercises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.movementPattern.toLowerCase().includes(q) ||
      e.primaryMuscles.some(m => m.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [exerciseSearch, allExercises]);

  const handleAddExercise = useCallback((sw: ScheduledWorkout, exerciseId: string, exerciseName: string) => {
    const existing = sw.skeletonExercises || [];
    if (existing.some(e => e.exerciseId === exerciseId)) return;
    const tier: SkeletonExercise['tier'] = existing.length === 0 ? 'primary' : existing.length <= 1 ? 'secondary' : 'accessory';
    const updated: ScheduledWorkout = {
      ...sw,
      skeletonExercises: [...existing, { exerciseId, exerciseName, tier }],
    };
    onSave(updated);
    setExerciseSearch('');
  }, [onSave]);

  const handleRemoveExercise = useCallback((sw: ScheduledWorkout, exerciseId: string) => {
    const updated: ScheduledWorkout = {
      ...sw,
      skeletonExercises: (sw.skeletonExercises || []).filter(e => e.exerciseId !== exerciseId),
    };
    onSave(updated);
  }, [onSave]);

  const handleChangeTier = useCallback((sw: ScheduledWorkout, exerciseId: string, newTier: SkeletonExercise['tier']) => {
    const updated: ScheduledWorkout = {
      ...sw,
      skeletonExercises: (sw.skeletonExercises || []).map(e =>
        e.exerciseId === exerciseId ? { ...e, tier: newTier } : e
      ),
    };
    onSave(updated);
  }, [onSave]);

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
        {calendarDays.map(day => {
          const isSelected = selectedDate === day.date;
          return (
          <div
            key={day.date}
            onClick={() => setSelectedDate(isSelected ? null : day.date)}
            className={`min-h-[72px] p-1 rounded-lg border text-xs transition-all cursor-pointer ${
              isSelected ? 'border-amber-400 bg-amber-900/10 ring-1 ring-amber-400/30' :
              day.isToday ? 'border-amber-500 bg-amber-900/20' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
            }`}
          >
            <p className={`text-right text-[10px] ${day.isToday ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>{day.dayNum}</p>
            {day.scheduled.map(s => {
              const phaseColor = s.phase ? (PHASE_COLORS[s.phase] || DEFAULT_PHASE_COLOR) : DEFAULT_PHASE_COLOR;
              const statusStyle =
                s.status === 'completed' ? 'bg-green-900/50 text-green-300 line-through' :
                s.status === 'skipped' ? 'bg-neutral-800 text-gray-500 line-through' :
                `${phaseColor.bg} ${phaseColor.text}`;
              const weeksOut = getWeeksFromToday(s.date);
              const cellLabel = s.sessionFocus && weeksOut > 4
                ? s.sessionFocus
                : s.sessionFocus
                ? `${s.sessionFocus}`
                : s.label;
              const exerciseHint = s.skeletonExercises && weeksOut <= 2 && s.status === 'planned'
                ? s.skeletonExercises.filter(e => e.tier === 'primary').map(e => e.exerciseName).join(', ')
                : undefined;
              return (
              <div key={s.id}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStatus(s); }}
                  className={`w-full text-left px-1 py-0.5 rounded text-[9px] truncate mt-0.5 ${statusStyle}`}
                  title={`${s.label}${s.targetIntensity ? ` | ${s.targetIntensity}` : ''} (${s.status})`}
                >
                  {cellLabel}
                </button>
                {exerciseHint && (
                  <p className="text-[8px] text-gray-500 truncate px-0.5">{exerciseHint}</p>
                )}
              </div>
              );
            })}
            {day.completed.map(w => (
              <div key={w.id} className="px-1 py-0.5 rounded bg-amber-900/30 text-amber-300 text-[9px] truncate mt-0.5">
                &#10003; {w.title}
              </div>
            ))}
          </div>
          );
        })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDate && (() => {
        const dayWorkouts = scheduled.filter(s => s.date === selectedDate);
        const dayHistory = history.filter(w => {
          const d = new Date(selectedDate + 'T00:00:00');
          return w.timestamp >= d.getTime() && w.timestamp < d.getTime() + 86400000;
        });
        const weeksOut = getWeeksFromToday(selectedDate);
        const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        return (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{dateLabel}</h4>
              <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            {dayWorkouts.length === 0 && dayHistory.length === 0 && (
              <p className="text-xs text-gray-500">No sessions scheduled.</p>
            )}

            {dayWorkouts.map(sw => {
              const phaseColor = sw.phase ? (PHASE_COLORS[sw.phase] || DEFAULT_PHASE_COLOR) : DEFAULT_PHASE_COLOR;
              return (
                <div key={sw.id} className={`rounded-lg border p-3 space-y-2 ${phaseColor.border} ${phaseColor.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${phaseColor.text}`}>{sw.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        sw.status === 'completed' ? 'bg-green-900/60 text-green-300' :
                        sw.status === 'skipped' ? 'bg-neutral-700 text-gray-400' :
                        'bg-blue-900/60 text-blue-300'
                      }`}>{sw.status}</span>
                      <button
                        onClick={() => onDelete(sw.id)}
                        className="text-gray-600 hover:text-red-400 text-[10px]"
                      >delete</button>
                    </div>
                  </div>

                  {/* Exercise list (editable for planned sessions within 4 weeks) */}
                  {sw.status === 'planned' && weeksOut <= 4 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Dumbbell size={10} /> Exercises
                        </p>
                        {editingSessionId !== sw.id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(sw.id); setExerciseSearch(''); }}
                            className="text-[10px] text-amber-400 hover:text-amber-300"
                          >Edit</button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }}
                            className="text-[10px] text-gray-400 hover:text-white"
                          >Done</button>
                        )}
                      </div>

                      {(sw.skeletonExercises || []).map((ex, i) => (
                        <div key={ex.exerciseId} className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-400 text-[10px] w-3">{i + 1}.</span>
                          <span className="text-gray-200 flex-1 truncate">{ex.exerciseName}</span>
                          {editingSessionId === sw.id ? (
                            <>
                              <select
                                value={ex.tier}
                                onChange={(e) => handleChangeTier(sw, ex.exerciseId, e.target.value as SkeletonExercise['tier'])}
                                className="bg-neutral-800 border border-neutral-700 text-gray-300 text-[10px] rounded px-1 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveExercise(sw, ex.exerciseId); }}
                                className="text-gray-600 hover:text-red-400"
                              ><X size={12} /></button>
                            </>
                          ) : (
                            <span className="text-gray-500 text-[10px]">{ex.tier}</span>
                          )}
                        </div>
                      ))}

                      {(!sw.skeletonExercises || sw.skeletonExercises.length === 0) && editingSessionId !== sw.id && (
                        <p className="text-[10px] text-gray-600 italic">No exercises set — tap Edit to add</p>
                      )}

                      {editingSessionId === sw.id && (
                        <div className="mt-2 space-y-1.5">
                          <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              value={exerciseSearch}
                              onChange={(e) => setExerciseSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Search exercises..."
                              className="w-full pl-7 pr-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white placeholder-gray-500"
                              autoFocus
                            />
                          </div>
                          {filteredExercises.length > 0 && (
                            <div className="bg-neutral-800 border border-neutral-700 rounded max-h-36 overflow-y-auto">
                              {filteredExercises.map(ex => {
                                const alreadyAdded = (sw.skeletonExercises || []).some(s => s.exerciseId === ex.id);
                                return (
                                  <button
                                    key={ex.id}
                                    onClick={(e) => { e.stopPropagation(); if (!alreadyAdded) handleAddExercise(sw, ex.id, ex.name); }}
                                    disabled={alreadyAdded}
                                    className={`w-full text-left px-2 py-1.5 text-xs border-b border-neutral-700/50 last:border-0 ${
                                      alreadyAdded ? 'text-gray-600 cursor-not-allowed' : 'text-gray-200 hover:bg-neutral-700'
                                    }`}
                                  >
                                    <span>{ex.name}</span>
                                    <span className="text-[10px] text-gray-500 ml-1.5">{ex.movementPattern.replace(/_/g, ' ')}</span>
                                    {alreadyAdded && <span className="text-[10px] text-gray-600 ml-1">added</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {(sw.targetRepRange || sw.targetIntensity) && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          {sw.targetRepRange && `${sw.targetRepRange} reps`}{sw.targetRepRange && sw.targetIntensity && ' · '}{sw.targetIntensity}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Read-only for completed/skipped or >4 weeks out */}
                  {(sw.status !== 'planned' || weeksOut > 4) && sw.skeletonExercises && sw.skeletonExercises.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400">
                        {sw.skeletonExercises.map(ex => ex.exerciseName).join(' / ')}
                      </p>
                    </div>
                  )}

                  {weeksOut > 4 && sw.targetIntensity && !sw.skeletonExercises?.length && (
                    <p className="text-[10px] text-gray-500">{sw.targetVolume} volume @ {sw.targetIntensity}</p>
                  )}
                </div>
              );
            })}

            {dayHistory.map(w => (
              <div key={w.id} className="rounded-lg border border-amber-700/50 bg-amber-900/30 p-3">
                <span className="text-xs font-semibold text-amber-300">Completed: {w.title}</span>
              </div>
            ))}
          </div>
        );
      })()}

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
