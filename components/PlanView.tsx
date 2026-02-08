import React, { useState, useMemo } from 'react';
import { TrainingBlock, ExerciseSlot, ExercisePreferences, MovementPattern } from '../types';
import { EXERCISE_LIBRARY } from '../services/exerciseLibrary';
import { Layers, Calendar, Dumbbell, ChevronRight, Check } from 'lucide-react';

interface Props {
  block: TrainingBlock | null;
  onSave: (block: TrainingBlock) => void;
}

type SubTab = 'block' | 'schedule' | 'exercises';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ===== DEFAULT 18 EXERCISE SLOTS =====
const DEFAULT_SLOTS: ExerciseSlot[] = [
  // Squat
  { category: 'squat', tier: 'primary', exerciseId: null },
  { category: 'squat', tier: 'secondary', exerciseId: null },
  { category: 'squat', tier: 'tertiary', exerciseId: null },
  // Bench
  { category: 'bench', tier: 'primary', exerciseId: null },
  { category: 'bench', tier: 'secondary', exerciseId: null },
  { category: 'bench', tier: 'tertiary', exerciseId: null },
  // Deadlift
  { category: 'deadlift', tier: 'primary', exerciseId: null },
  { category: 'deadlift', tier: 'secondary', exerciseId: null },
  { category: 'deadlift', tier: 'tertiary', exerciseId: null },
  // OHP
  { category: 'ohp', tier: 'primary', exerciseId: null },
  { category: 'ohp', tier: 'secondary', exerciseId: null },
  { category: 'ohp', tier: 'tertiary', exerciseId: null },
  // Core
  { category: 'core', tier: 'anti-flexion', exerciseId: null },
  { category: 'core', tier: 'anti-extension', exerciseId: null },
  { category: 'core', tier: 'anti-rotation', exerciseId: null },
  // Accessories
  { category: 'accessory', tier: 'slot-1', exerciseId: null },
  { category: 'accessory', tier: 'slot-2', exerciseId: null },
  { category: 'accessory', tier: 'slot-3', exerciseId: null },
];

// Map categories to which exercises should appear in their dropdowns
const CATEGORY_FILTERS: Record<string, (ex: typeof EXERCISE_LIBRARY[0]) => boolean> = {
  squat: (ex) => ex.movementPattern === MovementPattern.SQUAT,
  bench: (ex) => ex.movementPattern === MovementPattern.HORIZONTAL_PUSH,
  deadlift: (ex) => ex.movementPattern === MovementPattern.HINGE,
  ohp: (ex) => ex.movementPattern === MovementPattern.VERTICAL_PUSH,
  core: (ex) => ex.movementPattern === MovementPattern.CORE || ex.movementPattern === MovementPattern.CARRY,
  accessory: () => true, // all exercises available
};

const CATEGORY_LABELS: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
  core: 'Core',
  accessory: 'Accessory',
};

const TIER_LABELS: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  'anti-flexion': 'Anti-Flexion',
  'anti-extension': 'Anti-Extension',
  'anti-rotation': 'Anti-Rotation',
  'slot-1': 'Slot 1',
  'slot-2': 'Slot 2',
  'slot-3': 'Slot 3',
};

const CATEGORY_COLORS: Record<string, string> = {
  squat: 'border-amber-700/50',
  bench: 'border-blue-700/50',
  deadlift: 'border-red-700/50',
  ohp: 'border-green-700/50',
  core: 'border-purple-700/50',
  accessory: 'border-neutral-700/50',
};

const PlanView: React.FC<Props> = ({ block, onSave }) => {
  const [subTab, setSubTab] = useState<SubTab>('block');

  // Local state — initialized from block or sensible defaults
  const [name, setName] = useState(block?.name || '');
  const [lengthWeeks, setLengthWeeks] = useState(block?.lengthWeeks || 8);
  const [trainingDays, setTrainingDays] = useState<number[]>(block?.trainingDays || [1, 2, 4, 5]); // default Mon/Tue/Thu/Fri
  const [slots, setSlots] = useState<ExerciseSlot[]>(
    block?.exercisePreferences?.slots || [...DEFAULT_SLOTS]
  );

  // Exercises grouped by category filter (memoized)
  const exercisesByCategory = useMemo(() => {
    const result: Record<string, typeof EXERCISE_LIBRARY> = {};
    for (const cat of Object.keys(CATEGORY_FILTERS)) {
      result[cat] = EXERCISE_LIBRARY.filter(CATEGORY_FILTERS[cat]);
    }
    return result;
  }, []);

  const toggleDay = (day: number) => {
    setTrainingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const updateSlot = (index: number, exerciseId: string | null) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, exerciseId } : s));
  };

  const filledCount = slots.filter(s => s.exerciseId).length;
  const isComplete = name.trim().length > 0 && trainingDays.length > 0;

  const handleSave = () => {
    if (!isComplete) return;
    const updated: TrainingBlock = {
      id: block?.id || crypto.randomUUID(),
      name: name.trim(),
      startDate: block?.startDate || Date.now(),
      phases: block?.phases || [],
      goalEvent: block?.goalEvent,
      isActive: block?.isActive ?? true,
      lengthWeeks,
      trainingDays,
      exercisePreferences: { slots },
    };
    onSave(updated);
  };

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'block', label: 'Block', icon: <Layers size={16} /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar size={16} /> },
    { id: 'exercises', label: 'Exercises', icon: <Dumbbell size={16} /> },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-neutral-900 rounded-xl p-1">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              subTab === tab.id
                ? 'bg-amber-600 text-black'
                : 'text-gray-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== BLOCK SUB-TAB ===== */}
      {subTab === 'block' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring Strength Block"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Length</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={16}
                value={lengthWeeks}
                onChange={e => setLengthWeeks(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-2xl font-bold text-amber-400 w-24 text-right">{lengthWeeks} wk{lengthWeeks !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <button
            onClick={() => setSubTab('schedule')}
            className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl text-sm font-medium transition-all"
          >
            Next: Schedule <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ===== SCHEDULE SUB-TAB ===== */}
      {subTab === 'schedule' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Training Days</label>
            <p className="text-xs text-gray-500 mb-4">Tap the days you lift. ({trainingDays.length} day{trainingDays.length !== 1 ? 's' : ''}/week)</p>
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map((label, i) => {
                const active = trainingDays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      active
                        ? 'bg-amber-600 text-black ring-2 ring-amber-400'
                        : 'bg-neutral-900 text-gray-500 hover:bg-neutral-800 hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setSubTab('exercises')}
            className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl text-sm font-medium transition-all"
          >
            Next: Exercises <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ===== EXERCISES SUB-TAB ===== */}
      {subTab === 'exercises' && (
        <div className="space-y-6">
          <p className="text-xs text-gray-500">{filledCount}/18 slots filled — unfilled slots will be chosen by the AI.</p>

          {(['squat', 'bench', 'deadlift', 'ohp', 'core', 'accessory'] as const).map(category => {
            const categorySlots = slots
              .map((s, i) => ({ ...s, index: i }))
              .filter(s => s.category === category);
            const exercises = exercisesByCategory[category] || [];

            return (
              <div key={category} className={`border ${CATEGORY_COLORS[category]} rounded-xl overflow-hidden`}>
                <div className="bg-neutral-900 px-4 py-2.5">
                  <h3 className="text-sm font-bold text-gray-200">{CATEGORY_LABELS[category]}</h3>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {categorySlots.map(slot => (
                    <div key={slot.index} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-gray-500 w-28 shrink-0 font-medium">{TIER_LABELS[slot.tier]}</span>
                      <select
                        value={slot.exerciseId || ''}
                        onChange={e => updateSlot(slot.index, e.target.value || null)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">— AI chooses —</option>
                        {exercises.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                      </select>
                      {slot.exerciseId && (
                        <Check size={14} className="text-amber-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== SAVE BUTTON (always visible) ===== */}
      <button
        onClick={handleSave}
        disabled={!isComplete}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
          isComplete
            ? 'bg-amber-500 hover:bg-amber-600 text-black'
            : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        {block ? 'Update Block' : 'Create Block'}
      </button>
    </div>
  );
};

export default PlanView;
