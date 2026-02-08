import React, { useState, useMemo } from 'react';
import { TrainingBlock, ExerciseSlot, ExercisePreferences, MovementPattern } from '../types';
import { EXERCISE_LIBRARY } from '../services/exerciseLibrary';
import { Layers, Calendar, Dumbbell, ChevronRight, Check, CheckCircle2, ArrowRight } from 'lucide-react';

interface EstimatedMaxes {
  squat1RM?: number;
  benchPress1RM?: number;
  deadlift1RM?: number;
  overheadPress1RM?: number;
}

interface Props {
  block: TrainingBlock | null;
  onSave: (block: TrainingBlock) => void;
  estimatedMaxes: EstimatedMaxes;
  onMaxesChange: (maxes: EstimatedMaxes) => void;
  onNavigateToLift?: () => void;
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

const MAXES_CONFIG: { key: keyof EstimatedMaxes; label: string }[] = [
  { key: 'squat1RM', label: 'Squat' },
  { key: 'benchPress1RM', label: 'Bench Press' },
  { key: 'deadlift1RM', label: 'Deadlift' },
  { key: 'overheadPress1RM', label: 'Overhead Press' },
];

const BIAS_LABELS: Record<string, string> = {
  hypertrophy: 'Hypertrophy',
  'hypertrophy-plus': 'Size + Strength',
  balanced: 'Balanced',
  'strength-plus': 'Strength + Size',
  strength: 'Strength',
};

const getBiasKey = (v: number) =>
  v < 20 ? 'hypertrophy' : v < 40 ? 'hypertrophy-plus' : v < 60 ? 'balanced' : v < 80 ? 'strength-plus' : 'strength';

const PlanView: React.FC<Props> = ({ block, onSave, estimatedMaxes, onMaxesChange, onNavigateToLift }) => {
  const [subTab, setSubTab] = useState<SubTab>('block');

  // Local state — initialized from block or sensible defaults
  const [name, setName] = useState(block?.name || '');
  const [lengthWeeks, setLengthWeeks] = useState(block?.lengthWeeks || 8);
  const [goalBias, setGoalBias] = useState(block?.goalBias ?? 50);
  const [trainingDays, setTrainingDays] = useState<number[]>(block?.trainingDays || []);
  const [slots, setSlots] = useState<ExerciseSlot[]>(
    block?.exercisePreferences?.slots || [...DEFAULT_SLOTS]
  );

  // Confirmation overlay state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedBlock, setSavedBlock] = useState<TrainingBlock | null>(null);

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
      goalBias,
      trainingDays,
      exercisePreferences: { slots },
    };
    onSave(updated);
    setSavedBlock(updated);
    setShowConfirmation(true);
  };

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'block', label: 'Block', icon: <Layers size={16} /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar size={16} /> },
    { id: 'exercises', label: 'Exercises', icon: <Dumbbell size={16} /> },
  ];

  // Confirmation overlay
  if (showConfirmation && savedBlock) {
    const isNew = !block;
    const dayNames = savedBlock.trainingDays
      .sort((a, b) => a - b)
      .map(d => DAY_LABELS[d]);
    const biasLabel = BIAS_LABELS[getBiasKey(savedBlock.goalBias ?? 50)];
    const filledSlots = savedBlock.exercisePreferences?.slots?.filter(s => s.exerciseId).length || 0;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Animated container */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800" style={{ animation: 'confirmFadeIn 0.5s ease-out' }}>
          {/* Subtle amber glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative px-8 pt-10 pb-8 text-center">
            {/* Animated checkmark */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 mb-6" style={{ animation: 'confirmScaleIn 0.6s ease-out' }}>
              <CheckCircle2 size={36} className="text-amber-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {isNew ? 'Block Created' : 'Block Updated'}
            </h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              {isNew
                ? "You just made a commitment. Every session from here is one step closer."
                : "Your plan has been refined. The work continues."}
            </p>

            {/* Block summary card */}
            <div className="mt-8 bg-neutral-800/60 rounded-xl p-5 text-left space-y-3 border border-neutral-700/50">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{savedBlock.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-900/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{savedBlock.lengthWeeks}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Weeks</div>
                </div>
                <div className="bg-neutral-900/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{dayNames.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Days/Week</div>
                </div>
                <div className="bg-neutral-900/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{filledSlots}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Exercises</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Schedule</span>
                <span className="text-gray-300 font-medium">{dayNames.join(' · ') || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Focus</span>
                <span className="text-gray-300 font-medium">{biasLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total sessions</span>
                <span className="text-gray-300 font-medium">~{savedBlock.lengthWeeks * dayNames.length}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              {onNavigateToLift && (
                <button
                  onClick={() => { setShowConfirmation(false); onNavigateToLift(); }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black py-3.5 rounded-xl text-sm font-bold transition-all"
                >
                  Start Training <ArrowRight size={16} />
                </button>
              )}
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-full py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-neutral-800 transition-all"
              >
                Review Plan
              </button>
            </div>
          </div>
        </div>

        {/* Keyframe styles */}
        <style>{`
          @keyframes confirmFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes confirmScaleIn {
            0% { opacity: 0; transform: scale(0.5); }
            60% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

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
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={lengthWeeks}
                  onChange={e => setLengthWeeks(Number(e.target.value))}
                  className="w-full accent-amber-500"
                  list="weeks-ticks"
                />
                <datalist id="weeks-ticks">
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n} />)}
                </datalist>
                <div className="flex justify-between px-0.5 -mt-1">
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <span key={n} className={`text-[10px] ${n === lengthWeeks ? 'text-amber-400 font-bold' : 'text-gray-600'}`}>{n}</span>
                  ))}
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-400 w-24 text-right">{lengthWeeks} wk{lengthWeeks !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Goal Bias */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Focus</label>
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goalBias}
                onChange={e => setGoalBias(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between items-center text-xs">
                <span className={goalBias < 30 ? 'text-amber-400 font-bold' : 'text-gray-500'}>💪 Hypertrophy</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  goalBias < 30 ? 'bg-purple-500/20 text-purple-300' :
                  goalBias > 70 ? 'bg-red-500/20 text-red-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {goalBias < 20 ? 'Size' :
                   goalBias < 40 ? 'Size + Strength' :
                   goalBias < 60 ? 'Balanced' :
                   goalBias < 80 ? 'Strength + Size' :
                   'Strength'}
                </span>
                <span className={goalBias > 70 ? 'text-amber-400 font-bold' : 'text-gray-500'}>🏋️ Strength</span>
              </div>
            </div>
          </div>

          {/* Estimated 1RMs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Estimated 1-Rep Maxes <span className="text-gray-500 font-normal">(lbs)</span></label>
            <p className="text-xs text-gray-500 mb-3">Used to calculate working weights. Leave blank if unsure — AI will use RPE instead.</p>
            <div className="grid grid-cols-2 gap-3">
              {MAXES_CONFIG.map(({ key, label }) => (
                <div key={key} className="relative">
                  <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type="number"
                    value={estimatedMaxes[key] || ''}
                    onChange={e => onMaxesChange({ ...estimatedMaxes, [key]: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="—"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              ))}
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

          {/* Save button pinned at end of exercises list */}
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
      )}

      {/* ===== SAVE BUTTON (Block & Schedule tabs) ===== */}
      {subTab !== 'exercises' && (
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
      )}
    </div>
  );
};

export default PlanView;
