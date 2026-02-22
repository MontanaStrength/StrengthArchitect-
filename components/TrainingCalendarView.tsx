import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScheduledWorkout, SavedWorkout, TrainingGoalFocus, ScheduledWorkoutStatus, TrainingPhase, SkeletonExercise, MovementPattern } from '../shared/types';
import { Calendar, Plus, X, Search, Dumbbell, ChevronUp, ChevronDown, ChevronLeft, Zap, RefreshCw, CheckCircle } from 'lucide-react';
import { getAllExercises } from '../shared/services/exerciseLibrary';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, EventDropArg, EventContentArg } from '@fullcalendar/core';
import type { BatchGenerateProgress } from './BatchGenerateModal';

interface Props {
  scheduled: ScheduledWorkout[];
  history: SavedWorkout[];
  onSave: (sw: ScheduledWorkout) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  onBatchGenerate?: (sessionIds: string[]) => void;
  onRefineSession?: (sessionId: string) => void;
  batchProgress?: BatchGenerateProgress | null;
}

// Phase → hex color for FullCalendar events (darker variants for event backgrounds)
const PHASE_HEX: Record<string, string> = {
  [TrainingPhase.GPP]:             '#0c4a6e',
  [TrainingPhase.HYPERTROPHY]:     '#1e1b4b',
  [TrainingPhase.ACCUMULATION]:    '#172554',
  [TrainingPhase.STRENGTH]:        '#2e1065',
  [TrainingPhase.INTENSIFICATION]: '#3b0764',
  [TrainingPhase.POWER]:           '#4a044e',
  [TrainingPhase.REALIZATION]:     '#500724',
  [TrainingPhase.PEAKING]:         '#4c0519',
  [TrainingPhase.DELOAD]:          '#1e293b',
};
const DEFAULT_HEX = '#1e1b4b';

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  [TrainingPhase.GPP]:             { bg: 'bg-sky-900/50',    text: 'text-sky-300',    border: 'border-sky-700/50' },
  [TrainingPhase.HYPERTROPHY]:     { bg: 'bg-indigo-900/50', text: 'text-indigo-300', border: 'border-indigo-700/50' },
  [TrainingPhase.ACCUMULATION]:    { bg: 'bg-blue-900/50',   text: 'text-blue-300',   border: 'border-blue-700/50' },
  [TrainingPhase.STRENGTH]:        { bg: 'bg-violet-900/50', text: 'text-violet-300', border: 'border-violet-700/50' },
  [TrainingPhase.INTENSIFICATION]: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700/50' },
  [TrainingPhase.POWER]:           { bg: 'bg-fuchsia-900/50',text: 'text-fuchsia-300',border: 'border-fuchsia-700/50' },
  [TrainingPhase.REALIZATION]:     { bg: 'bg-pink-900/50',   text: 'text-pink-300',   border: 'border-pink-700/50' },
  [TrainingPhase.PEAKING]:         { bg: 'bg-rose-900/50',   text: 'text-rose-300',   border: 'border-rose-700/50' },
  [TrainingPhase.DELOAD]:          { bg: 'bg-slate-800/50',  text: 'text-slate-300',  border: 'border-slate-600/50' },
};
const DEFAULT_PHASE_COLOR = { bg: 'bg-indigo-900/50', text: 'text-indigo-300', border: 'border-indigo-700/50' };

function getWeeksFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return (date.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000);
}

const TIER_OPTIONS: SkeletonExercise['tier'][] = ['primary', 'secondary', 'tertiary', 'accessory'];
const TIER_COLORS: Record<string, string> = {
  primary: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  secondary: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  tertiary: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  accessory: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
};

const PATTERN_FILTERS: { label: string; pattern: MovementPattern | 'all' | 'compound' }[] = [
  { label: 'All', pattern: 'all' },
  { label: 'Squat', pattern: MovementPattern.SQUAT },
  { label: 'Hinge', pattern: MovementPattern.HINGE },
  { label: 'Push', pattern: MovementPattern.HORIZONTAL_PUSH },
  { label: 'Pull', pattern: MovementPattern.HORIZONTAL_PULL },
  { label: 'V. Push', pattern: MovementPattern.VERTICAL_PUSH },
  { label: 'V. Pull', pattern: MovementPattern.VERTICAL_PULL },
  { label: 'Core', pattern: MovementPattern.CORE },
  { label: 'Isolation', pattern: MovementPattern.ISOLATION },
];

// ─── Exercise Editor Modal ──────────────────────────────────────
const ExerciseEditorModal: React.FC<{
  session: ScheduledWorkout;
  onSave: (sw: ScheduledWorkout) => void;
  onClose: () => void;
}> = ({ session, onSave, onClose }) => {
  const [search, setSearch] = useState('');
  const [patternFilter, setPatternFilter] = useState<MovementPattern | 'all' | 'compound'>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const allExercises = useMemo(() => getAllExercises(), []);
  const exercises = session.skeletonExercises || [];

  const filteredExercises = useMemo(() => {
    let list = allExercises;
    if (patternFilter === 'compound') {
      list = list.filter(e => e.isCompound);
    } else if (patternFilter !== 'all') {
      list = list.filter(e => e.movementPattern === patternFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some(m => m.toLowerCase().includes(q))
      );
    }
    const limit = search.trim() || patternFilter !== 'all' ? 30 : 15;
    return list.slice(0, limit);
  }, [search, patternFilter, allExercises]);

  const addExercise = (exerciseId: string, exerciseName: string) => {
    if (exercises.some(e => e.exerciseId === exerciseId)) return;
    const tier: SkeletonExercise['tier'] =
      exercises.length === 0 ? 'primary' : exercises.length <= 1 ? 'secondary' : 'accessory';
    onSave({
      ...session,
      skeletonExercises: [...exercises, { exerciseId, exerciseName, tier }],
    });
  };

  const removeExercise = (exerciseId: string) => {
    onSave({
      ...session,
      skeletonExercises: exercises.filter(e => e.exerciseId !== exerciseId),
    });
  };

  const cycleTier = (exerciseId: string) => {
    onSave({
      ...session,
      skeletonExercises: exercises.map(e => {
        if (e.exerciseId !== exerciseId) return e;
        const idx = TIER_OPTIONS.indexOf(e.tier);
        return { ...e, tier: TIER_OPTIONS[(idx + 1) % TIER_OPTIONS.length] };
      }),
    });
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    const updated = [...exercises];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onSave({ ...session, skeletonExercises: updated });
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchRef.current?.focus(), 100);
    return () => { document.body.style.overflow = ''; };
  }, []);

  const phaseColor = session.phase ? (PHASE_COLORS[session.phase] || DEFAULT_PHASE_COLOR) : DEFAULT_PHASE_COLOR;
  const dateLabel = new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex flex-col w-full max-w-lg mx-auto my-4 sm:my-8 bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden flex-1 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-neutral-800 ${phaseColor.bg}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-white">Edit Exercises</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className={`text-sm ${phaseColor.text}`}>{session.label} — {dateLabel}</p>
          {(session.targetRepRange || session.targetIntensity) && (
            <p className="text-xs text-gray-400 mt-1">
              {session.targetRepRange && `${session.targetRepRange} reps`}
              {session.targetRepRange && session.targetIntensity && ' · '}
              {session.targetIntensity}
            </p>
          )}
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
              <Dumbbell size={32} className="text-gray-700 mb-2" />
              <p className="text-gray-400 text-sm font-medium">No exercises yet</p>
              <p className="text-gray-600 text-xs mt-1">Tap an exercise below to add it</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {exercises.map((ex, i) => (
                <div key={ex.exerciseId} className="flex items-center gap-3 px-4 py-3 group">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveExercise(i, -1)}
                      disabled={i === 0}
                      className="text-gray-600 hover:text-white disabled:opacity-20 disabled:hover:text-gray-600 transition-colors p-0.5"
                    ><ChevronUp size={14} /></button>
                    <button
                      onClick={() => moveExercise(i, 1)}
                      disabled={i === exercises.length - 1}
                      className="text-gray-600 hover:text-white disabled:opacity-20 disabled:hover:text-gray-600 transition-colors p-0.5"
                    ><ChevronDown size={14} /></button>
                  </div>
                  <span className="text-gray-600 text-xs font-mono w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{ex.exerciseName}</p>
                  </div>
                  <button
                    onClick={() => cycleTier(ex.exerciseId)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${TIER_COLORS[ex.tier]}`}
                  >{ex.tier}</button>
                  <button
                    onClick={() => removeExercise(ex.exerciseId)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  ><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search + browse panel (pinned to bottom) */}
        <div className="border-t border-neutral-800 bg-neutral-950">
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises by name, muscle, or pattern..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Pattern filter tabs */}
          <div className="px-4 pb-2 overflow-x-auto">
            <div className="flex gap-1.5">
              {PATTERN_FILTERS.map(f => (
                <button
                  key={f.label}
                  onClick={() => setPatternFilter(f.pattern)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    patternFilter === f.pattern
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-neutral-800 text-gray-400 border border-transparent hover:text-white hover:bg-neutral-700'
                  }`}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Exercise browser */}
          <div className="max-h-56 overflow-y-auto border-t border-neutral-800">
            {filteredExercises.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-4">No exercises found</p>
            ) : (
              filteredExercises.map(ex => {
                const added = exercises.some(s => s.exerciseId === ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => { if (!added) addExercise(ex.id, ex.name); }}
                    disabled={added}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-neutral-800/50 last:border-0 transition-colors ${
                      added ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-800 active:bg-neutral-750'
                    }`}
                  >
                    <Plus size={16} className={added ? 'text-gray-700' : 'text-amber-500'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${added ? 'text-gray-600' : 'text-white'}`}>{ex.name}</p>
                      <p className="text-xs text-gray-500">{ex.movementPattern} · {ex.primaryMuscles.join(', ')}</p>
                    </div>
                    {ex.isCompound && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">compound</span>
                    )}
                    {added && <span className="text-xs text-gray-600">added</span>}
                  </button>
                );
              })
            )}
          </div>

          {/* Done button */}
          <div className="px-4 py-3 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded-lg transition-colors"
            >
              Done — {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Custom Event Content ───────────────────────────────────────

const renderEventContent = (arg: EventContentArg) => {
  const ext = arg.event.extendedProps;
  if (ext.type === 'history') {
    return (
      <div className="truncate text-[10px] leading-tight px-1 py-0.5">
        <span className="opacity-80">&#10003;</span> {arg.event.title}
      </div>
    );
  }

  const sw = ext.workout as ScheduledWorkout;
  const weeksOut = getWeeksFromToday(sw.date);
  const exerciseHint = sw.skeletonExercises && weeksOut <= 2 && sw.status === 'planned'
    ? sw.skeletonExercises.filter(e => e.tier === 'primary').map(e => e.exerciseName).join(', ')
    : undefined;

  const hasGeneratedPlan = !!sw.generatedPlan;

  return (
    <div className="truncate leading-tight px-1 py-0.5">
      <div className="text-[10px] font-medium truncate flex items-center gap-0.5">
        {hasGeneratedPlan && <span className="text-green-400 flex-shrink-0">●</span>}
        {arg.event.title}
      </div>
      {exerciseHint && (
        <div className="text-[8px] opacity-60 truncate">{exerciseHint}</div>
      )}
    </div>
  );
};

// ─── Main Calendar Component ────────────────────────────────────

const TrainingCalendarView: React.FC<Props> = ({ scheduled, history, onSave, onDelete, onBack, onBatchGenerate, batchProgress, onRefineSession }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addFocus, setAddFocus] = useState<TrainingGoalFocus>('strength');
  const [addIntensity, setAddIntensity] = useState<'low' | 'moderate' | 'high' | 'rest'>('moderate');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ScheduledWorkout | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Upcoming sessions eligible for batch generation (next 2 weeks, planned, have skeleton)
  const batchEligibleSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    return scheduled.filter(sw =>
      sw.status === 'planned' &&
      sw.sessionFocus &&
      !sw.generatedPlan &&
      new Date(sw.date + 'T00:00:00') >= today &&
      new Date(sw.date + 'T00:00:00') <= twoWeeksOut
    );
  }, [scheduled]);

  const handleBuildUpcoming = useCallback(() => {
    if (onBatchGenerate && batchEligibleSessions.length > 0) {
      onBatchGenerate(batchEligibleSessions.map(s => s.id));
    }
  }, [onBatchGenerate, batchEligibleSessions]);

  // Map ScheduledWorkout[] + SavedWorkout[] → FullCalendar EventInput[]
  const events: EventInput[] = useMemo(() => {
    const scheduledEvents: EventInput[] = scheduled.map(sw => {
      const title = sw.sessionFocus || sw.label;
      const hex = sw.phase ? (PHASE_HEX[sw.phase] || DEFAULT_HEX) : DEFAULT_HEX;

      const classNames: string[] = [];
      if (sw.status === 'completed') classNames.push('fc-event-completed');
      if (sw.status === 'skipped') classNames.push('fc-event-skipped');

      return {
        id: sw.id,
        title,
        start: sw.date,
        allDay: true,
        extendedProps: { type: 'scheduled', workout: sw },
        backgroundColor: hex,
        borderColor: 'transparent',
        classNames,
        editable: sw.status === 'planned',
      };
    });

    const historyEvents: EventInput[] = history.map(w => ({
      id: `hist-${w.id}`,
      title: w.title,
      start: new Date(w.timestamp).toISOString().split('T')[0],
      allDay: true,
      extendedProps: { type: 'history', workout: w },
      editable: false,
      classNames: ['fc-event-history'],
    }));

    return [...scheduledEvents, ...historyEvents];
  }, [scheduled, history]);

  // Click on a day → select it (and optionally open the add form)
  const handleDateClick = useCallback((info: DateClickArg) => {
    const dateStr = info.dateStr;
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }, []);

  // Click on an event → select the day, show detail
  const handleEventClick = useCallback((info: EventClickArg) => {
    const ext = info.event.extendedProps;
    const dateStr = info.event.startStr;
    setSelectedDate(dateStr);

    if (ext.type === 'scheduled') {
      const sw = ext.workout as ScheduledWorkout;
      const weeksOut = getWeeksFromToday(sw.date);
      if (sw.status === 'planned' && weeksOut <= 4) {
        setEditingSession(sw);
      }
    }
  }, []);

  // Drag-and-drop → update the workout date
  const handleEventDrop = useCallback((info: EventDropArg) => {
    const ext = info.event.extendedProps;
    if (ext.type !== 'scheduled') {
      info.revert();
      return;
    }
    const sw = ext.workout as ScheduledWorkout;
    if (sw.status !== 'planned') {
      info.revert();
      return;
    }
    const newDate = info.event.start ? formatDateISO(info.event.start) : sw.date;
    onSave({ ...sw, date: newDate });
  }, [onSave]);

  // Add session form
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

  // Selected day detail data
  const selectedDayWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return scheduled.filter(s => s.date === selectedDate);
  }, [selectedDate, scheduled]);

  const selectedDayHistory = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate + 'T00:00:00');
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    return history.filter(w => w.timestamp >= dayStart && w.timestamp < dayEnd);
  }, [selectedDate, history]);

  const weeksOut = selectedDate ? getWeeksFromToday(selectedDate) : 0;
  const dateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="w-full px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar size={24} className="text-amber-500" /> Training Calendar
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onBatchGenerate && batchEligibleSessions.length > 0 && (
            <button
              onClick={handleBuildUpcoming}
              disabled={!!batchProgress}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Zap size={16} />
              Build {batchEligibleSessions.length} Session{batchEligibleSessions.length !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => { setShowAdd(!showAdd); setAddDate(selectedDate || new Date().toISOString().split('T')[0]); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg"
          >
            <Plus size={16} /> Schedule
          </button>
        </div>
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

      {/* FullCalendar */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          events={events}
          editable={true}
          droppable={false}
          eventStartEditable={true}
          eventDurationEditable={false}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          dayMaxEvents={5}
          height="auto"
          fixedWeekCount={true}
          firstDay={0}
          eventOrder="start"
        />
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDate && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">{dateLabel}</h4>
            <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>

          {selectedDayWorkouts.length === 0 && selectedDayHistory.length === 0 && (
            <p className="text-xs text-gray-500">No sessions scheduled.</p>
          )}

          {selectedDayWorkouts.map(sw => {
            const phaseColor = sw.phase ? (PHASE_COLORS[sw.phase] || DEFAULT_PHASE_COLOR) : DEFAULT_PHASE_COLOR;
            return (
              <div key={sw.id} className={`rounded-lg border p-3 space-y-2 ${phaseColor.border} ${phaseColor.bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${phaseColor.text}`}>{sw.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(sw)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                        sw.status === 'completed' ? 'bg-green-900/60 text-green-300' :
                        sw.status === 'skipped' ? 'bg-neutral-700 text-gray-400' :
                        'bg-blue-900/60 text-blue-300'
                      }`}
                    >{sw.status}</button>
                    <button
                      onClick={() => onDelete(sw.id)}
                      className="text-gray-600 hover:text-red-400 text-[10px]"
                    >delete</button>
                  </div>
                </div>

                {/* Exercise list + edit button */}
                {sw.status === 'planned' && weeksOut <= 4 && (
                  <div className="space-y-2">
                    {(sw.skeletonExercises || []).length > 0 ? (
                      <div className="space-y-1">
                        {(sw.skeletonExercises || []).map((ex, i) => (
                          <div key={ex.exerciseId} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 text-xs font-mono w-4 text-right">{i + 1}.</span>
                            <span className="text-gray-200 flex-1 truncate">{ex.exerciseName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIER_COLORS[ex.tier]}`}>{ex.tier}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">No exercises assigned</p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSession(sw); }}
                      className="w-full py-2 rounded-lg border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Dumbbell size={14} />
                      {(sw.skeletonExercises || []).length > 0 ? 'Edit Exercises' : 'Add Exercises'}
                    </button>
                    {(sw.targetRepRange || sw.targetIntensity) && (
                      <p className="text-xs text-gray-500">
                        {sw.targetRepRange && `${sw.targetRepRange} reps`}
                        {sw.targetRepRange && sw.targetIntensity && ' · '}
                        {sw.targetIntensity}
                      </p>
                    )}
                  </div>
                )}

                {/* Generated Plan Preview */}
                {sw.generatedPlan && sw.status === 'planned' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={12} className="text-green-400" />
                        <span className="text-[10px] font-medium text-green-400">AI Session Built</span>
                      </div>
                      {sw.generatedAt && (
                        <span className="text-[10px] text-gray-600">
                          {new Date(sw.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2.5 space-y-1">
                      <p className="text-xs font-medium text-white truncate">{sw.generatedPlan.title}</p>
                      <p className="text-[10px] text-gray-400">{sw.generatedPlan.focus} · {sw.generatedPlan.totalDurationMin} min · {sw.generatedPlan.exercises.length} exercises</p>
                      <div className="space-y-0.5 mt-1">
                        {sw.generatedPlan.exercises.slice(0, 5).map((ex, i) => (
                          <p key={i} className="text-[10px] text-gray-300 truncate">
                            {ex.exerciseName}: {ex.sets}×{ex.reps}{ex.percentOf1RM ? ` @${ex.percentOf1RM}%` : ''}
                          </p>
                        ))}
                        {sw.generatedPlan.exercises.length > 5 && (
                          <p className="text-[10px] text-gray-500">+{sw.generatedPlan.exercises.length - 5} more</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {onRefineSession && (
                        <button
                          onClick={() => onRefineSession(sw.id)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <RefreshCw size={10} />
                          Refine
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const cleared = { ...sw, generatedPlan: undefined, generatedAt: undefined };
                          onSave(cleared);
                        }}
                        className="flex-1 py-1.5 rounded-lg border border-dashed border-gray-600/50 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <X size={10} />
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Read-only for completed/skipped or >4 weeks out */}
                {(sw.status !== 'planned' || weeksOut > 4) && sw.skeletonExercises && sw.skeletonExercises.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">
                      {sw.skeletonExercises.map(ex => ex.exerciseName).join(' / ')}
                    </p>
                  </div>
                )}

                {weeksOut > 4 && sw.targetIntensity && !sw.skeletonExercises?.length && (
                  <p className="text-xs text-gray-500">{sw.targetVolume} volume @ {sw.targetIntensity}</p>
                )}
              </div>
            );
          })}

          {selectedDayHistory.map(w => (
            <div key={w.id} className="rounded-lg border border-amber-700/50 bg-amber-900/30 p-3">
              <span className="text-xs font-semibold text-amber-300">Completed: {w.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Planned</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Logged Session</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Skipped</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> AI Built</span>
      </div>

      {/* Exercise Editor Modal */}
      {editingSession && (
        <ExerciseEditorModal
          session={scheduled.find(s => s.id === editingSession.id) || editingSession}
          onSave={(updated) => { onSave(updated); }}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  );
};

export default TrainingCalendarView;
