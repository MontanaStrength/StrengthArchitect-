// Utility: Logical exercise sorting by slot context
function sortExercisesForSlot(category: string, tier: string, exercises: typeof EXERCISE_LIBRARY) {
  // ── Primary = big bilateral compounds. Secondary = supplemental variations.
  // ── Tertiary = unilateral, machine, and lighter accessory work.
  const PRIORITY: Record<string, Record<string, string[]>> = {
    squat: {
      primary: [
        'back_squat', 'high_bar_squat', 'low_bar_squat', 'front_squat',
        'safety_bar_squat', 'box_squat', 'pause_squat', 'tempo_squat',
        'pin_squat', 'anderson_squat', 'zercher_squat', 'overhead_squat',
      ],
      secondary: [
        'front_squat', 'safety_bar_squat', 'box_squat', 'pause_squat',
        'tempo_squat', 'leg_press', 'hack_squat', 'belt_squat',
        'goblet_squat', 'zercher_squat', 'pin_squat',
        'bulgarian_split_squat', 'rfess', 'walking_lunge', 'reverse_lunge',
      ],
      tertiary: [
        'bulgarian_split_squat', 'rfess', 'walking_lunge', 'reverse_lunge',
        'split_squat', 'step_up', 'lateral_lunge', 'cossack_squat',
        'pistol_squat', 'single_leg_leg_press',
        'goblet_squat', 'leg_press', 'hack_squat', 'belt_squat',
      ],
    },
    bench: {
      primary: [
        'bench_press', 'pause_bench', 'close_grip_bench',
        'incline_bench_press', 'tempo_bench', 'larsen_press',
        'spoto_press', 'floor_press',
      ],
      secondary: [
        'incline_bench_press', 'close_grip_bench', 'pause_bench',
        'db_bench_press', 'incline_db_press', 'floor_press',
        'tempo_bench', 'spoto_press', 'larsen_press', 'decline_bench',
        'dip',
      ],
      tertiary: [
        'db_bench_press', 'incline_db_press', 'dip', 'pushup',
        'cable_fly', 'decline_bench', 'floor_press',
      ],
    },
    deadlift: {
      primary: [
        'conventional_deadlift', 'sumo_deadlift', 'trap_bar_deadlift',
        'pause_deadlift', 'tempo_deadlift', 'deficit_deadlift',
        'snatch_grip_deadlift', 'block_pull',
      ],
      secondary: [
        'romanian_deadlift', 'stiff_leg_deadlift', 'trap_bar_deadlift',
        'deficit_deadlift', 'snatch_grip_deadlift', 'pause_deadlift',
        'block_pull', 'good_morning', 'hip_thrust',
      ],
      tertiary: [
        'single_leg_rdl', 'good_morning', 'hip_thrust',
        'kettlebell_swing', 'cable_pull_through', 'reverse_hyper',
        'nordic_curl', 'romanian_deadlift', 'stiff_leg_deadlift',
      ],
    },
    ohp: {
      primary: [
        'overhead_press', 'push_press', 'z_press',
        'seated_dumbbell_press', 'db_overhead_press',
      ],
      secondary: [
        'push_press', 'seated_dumbbell_press', 'db_overhead_press',
        'z_press', 'arnold_press', 'landmine_press',
      ],
      tertiary: [
        'arnold_press', 'landmine_press', 'lateral_raise',
        'db_overhead_press', 'seated_dumbbell_press',
      ],
    },
    // ── Core: sort by slot type (anti-flexion / anti-extension / anti-rotation)
    core: {
      'anti-extension': [
        'plank', 'ab_wheel', 'dead_bug', 'dragon_flag',
        'hanging_leg_raise', 'farmers_carry',
      ],
      'anti-flexion': [
        'good_morning', 'farmers_carry', 'suitcase_carry', 'overhead_carry',
        'turkish_getup', 'copenhagen_plank',
      ],
      'anti-rotation': [
        'pallof_press', 'cable_woodchop', 'suitcase_carry',
        'turkish_getup', 'dead_bug', 'copenhagen_plank',
      ],
    },
    accessory: {},
  };

  if (category === 'accessory') {
    return { recommended: [], others: [...exercises].sort((a, b) => a.name.localeCompare(b.name)) };
  }
  const priority = PRIORITY[category]?.[tier] || [];
  if (priority.length === 0) {
    return { recommended: [], others: [...exercises].sort((a, b) => a.name.localeCompare(b.name)) };
  }
  const recommended = priority
    .map(id => exercises.find(e => e.id === id))
    .filter(Boolean) as typeof exercises;
  const others = exercises
    .filter(e => !priority.includes(e.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { recommended, others };
}
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingBlock, TrainingBlockPhase, TrainingPhase, PHASE_PRESETS, ExerciseSlot, ExercisePreferences, MovementPattern, SessionStructure, SESSION_STRUCTURE_PRESETS, DEFAULT_SESSION_STRUCTURE, ScheduledWorkout, SavedWorkout } from '../shared/types';
import { EXERCISE_LIBRARY } from '../shared/services/exerciseLibrary';
import { Layers, Calendar, Dumbbell, ChevronRight, Check, CheckCircle2, ArrowRight, Rocket } from 'lucide-react';
import BlockPhaseSlider from './BlockPhaseSlider';
import TrainingCalendarView from './TrainingCalendarView';

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
  scheduledWorkouts: ScheduledWorkout[];
  workoutHistory: SavedWorkout[];
  onScheduledSave: (sw: ScheduledWorkout) => void;
  onScheduledDelete: (id: string) => void;
}

type SubTab = 'block' | 'schedule' | 'exercises' | 'calendar';

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

/** Readable group headers for <optgroup> inside exercise dropdowns */
const OPTGROUP_LABELS: Record<string, Record<string, string>> = {
  squat:    { primary: 'Primary Squat Movements', secondary: 'Supplemental Squat Variations', tertiary: 'Unilateral / Machine / Accessory' },
  bench:    { primary: 'Primary Bench Movements', secondary: 'Supplemental Press Variations', tertiary: 'Dumbbell / Isolation / Accessory' },
  deadlift: { primary: 'Primary Deadlift Movements', secondary: 'Supplemental Hinge Variations', tertiary: 'Unilateral / Machine / Accessory' },
  ohp:      { primary: 'Primary Overhead Movements', secondary: 'Supplemental Overhead Variations', tertiary: 'Dumbbell / Isolation' },
  core:     { 'anti-extension': 'Anti-Extension', 'anti-flexion': 'Anti-Flexion / Loaded Carry', 'anti-rotation': 'Anti-Rotation' },
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

/** Build default phase breakpoints from block length or existing phases. Returns [endWeekPhase1, endWeekPhase2]. */
function defaultPhaseBreakpoints(lengthWeeks: number, existingPhases?: TrainingBlockPhase[]): [number, number] {
  if (existingPhases?.length === 3 &&
      existingPhases[0].phase === TrainingPhase.HYPERTROPHY &&
      existingPhases[1].phase === TrainingPhase.STRENGTH &&
      existingPhases[2].phase === TrainingPhase.PEAKING) {
    const b1 = existingPhases[0].weekCount;
    const b2 = b1 + existingPhases[1].weekCount;
    return [b1, b2];
  }
  if (lengthWeeks < 3) return [1, 2];
  if (lengthWeeks === 8) return [3, 6]; // common 3-3-2 split
  if (lengthWeeks === 16) return [6, 12]; // 6 hyp, 6 strength, 4 peaking
  const third = Math.max(1, Math.floor(lengthWeeks / 3));
  return [third, lengthWeeks - Math.max(1, Math.floor((lengthWeeks - third) / 2))];
}

/** Build 3-phase array (Hypertrophy -> Strength -> Peaking) from breakpoints and block length. */
function buildPhasesFromBreakpoints(
  breakpoint1: number,
  breakpoint2: number,
  lengthWeeks: number,
  daysPerWeek: number,
): TrainingBlockPhase[] {
  const w1 = breakpoint1;
  const w2 = breakpoint2 - breakpoint1;
  const w3 = lengthWeeks - breakpoint2;
  const hyp = PHASE_PRESETS[TrainingPhase.HYPERTROPHY];
  const str = PHASE_PRESETS[TrainingPhase.STRENGTH];
  const peak = PHASE_PRESETS[TrainingPhase.PEAKING];
  const peakDays = Math.max(3, daysPerWeek - 1);
  return [
    { ...hyp, weekCount: w1, sessionsPerWeek: daysPerWeek, splitPattern: 'upper-lower', description: hyp.description },
    { ...str, weekCount: w2, sessionsPerWeek: daysPerWeek, splitPattern: 'upper-lower', description: str.description },
    { ...peak, weekCount: w3, sessionsPerWeek: peakDays, splitPattern: 'squat-bench-deadlift', description: peak.description },
  ];
}

const PlanView: React.FC<Props> = ({ block, onSave, estimatedMaxes, onMaxesChange, onNavigateToLift, scheduledWorkouts, workoutHistory, onScheduledSave, onScheduledDelete }) => {
  const [subTab, setSubTab] = useState<SubTab>(() => {
    const saved = localStorage.getItem('sa-plan-subtab');
    return (saved === 'block' || saved === 'schedule' || saved === 'exercises' || saved === 'calendar') ? saved : 'block';
  });

  const changeSubTab = (tab: SubTab) => {
    setSubTab(tab);
    localStorage.setItem('sa-plan-subtab', tab);
  };

  // Local state — initialized from block or sensible defaults
  const [name, setName] = useState(block?.name || '');
  const [lengthWeeks, setLengthWeeks] = useState(block?.lengthWeeks || 8);
  const [goalBias, setGoalBias] = useState(block?.goalBias ?? 50);
  const [phaseBreakpoint1, setPhaseBreakpoint1] = useState(() =>
    defaultPhaseBreakpoints(block?.lengthWeeks || 8, block?.phases)[0]
  );
  const [phaseBreakpoint2, setPhaseBreakpoint2] = useState(() =>
    defaultPhaseBreakpoints(block?.lengthWeeks || 8, block?.phases)[1]
  );
  const [volumeTolerance, setVolumeTolerance] = useState(block?.volumeTolerance ?? 3);
  useEffect(() => {
    if (!block) return;
    const len = block.lengthWeeks ?? 8;
    const [b1, b2] = defaultPhaseBreakpoints(len, block.phases);
    setPhaseBreakpoint1(b1);
    setPhaseBreakpoint2(b2);
  }, [block?.id]); // sync breakpoints when switching to a different block
  const [trainingDays, setTrainingDays] = useState<number[]>(block?.trainingDays || []);
  const [sessionStructure, setSessionStructure] = useState<SessionStructure>(block?.sessionStructure || DEFAULT_SESSION_STRUCTURE);
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
  const isComplete = name.trim().length > 0;

  const handleSave = () => {
    if (!isComplete) return;
    const phases =
      lengthWeeks >= 3
        ? buildPhasesFromBreakpoints(phaseBreakpoint1, phaseBreakpoint2, lengthWeeks, Math.max(trainingDays.length, 3))
        : block?.phases || [];
    const phasesChanged =
      (block?.phases?.length ?? 0) !== phases.length ||
      (block?.phases ?? []).some((p, i) => phases[i]?.weekCount !== p.weekCount || phases[i]?.phase !== p.phase);
    const lengthChanged = block?.lengthWeeks !== lengthWeeks;
    const structureChanged = lengthChanged || phasesChanged;
    // When block structure (length or phases) changes, reset start date so "Week 1" lines up with first sessions
    const startDate =
      block && structureChanged ? Date.now() : (block?.startDate || Date.now());
    const updated: TrainingBlock = {
      id: block?.id || crypto.randomUUID(),
      name: name.trim(),
      startDate,
      phases,
      goalEvent: block?.goalEvent,
      isActive: block?.isActive ?? true,
      lengthWeeks,
      goalBias,
      volumeTolerance,
      trainingDays,
      sessionStructure,
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
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
  ];

  // Confirmation overlay
  if (showConfirmation && savedBlock) {
    const isNew = !block;
    const dayNames = savedBlock.trainingDays
      .sort((a, b) => a - b)
      .map(d => DAY_LABELS[d]);
    const biasLabel = BIAS_LABELS[getBiasKey(savedBlock.goalBias ?? 50)];
    const phaseSummary =
      savedBlock.phases?.length === 3
        ? savedBlock.phases
            .map((p) => `${p.phase} ${p.weekCount}w`)
            .join(' → ')
        : null;
    const filledSlots = savedBlock.exercisePreferences?.slots?.filter(s => s.exerciseId).length || 0;

    return (
      <div className="max-w-2xl mx-auto relative">
        {/* Full-screen amber pulse — one warm breath, then gone */}
        <div className="fixed inset-0 pointer-events-none z-50" style={{ animation: 'screenPulse 1.8s ease-out forwards' }}>
          <div className="absolute inset-0 bg-amber-500/0" style={{ animation: 'screenGlow 1.8s ease-out forwards' }} />
          {/* Radial light from center */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)', animation: 'screenGlow 1.8s ease-out forwards' }} />
        </div>

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
                <span className="text-gray-500">Session Style</span>
                <span className="text-gray-300 font-medium">
                  {SESSION_STRUCTURE_PRESETS.find(p => p.id === (savedBlock.sessionStructure || DEFAULT_SESSION_STRUCTURE))?.label || 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Focus</span>
                <span className="text-gray-300 font-medium">{phaseSummary ?? biasLabel}</span>
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
          @keyframes screenGlow {
            0% { opacity: 0; }
            25% { opacity: 1; }
            100% { opacity: 0; }
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
            onClick={() => changeSubTab(tab.id)}
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
          <div className={`rounded-xl p-4 border-2 transition-all ${
            name.trim()
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 animate-[pulse_4s_ease-in-out_infinite]'
          }`}>
            <label className="block text-base font-bold text-amber-400 mb-2">
              🏷️ Name Your Block {!name.trim() && <span className="text-amber-500 text-sm font-medium ml-1">(required)</span>}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring Strength Block"
              autoFocus
              className={`w-full bg-neutral-900 rounded-xl px-4 py-3.5 text-white text-lg font-semibold placeholder-gray-600 placeholder:font-normal placeholder:text-sm focus:outline-none transition-all border-2 ${
                name.trim()
                  ? 'border-neutral-700 focus:border-amber-500'
                  : 'border-amber-500/60 focus:border-amber-500'
              }`}
            />
            {!name.trim() && (
              <p className="text-xs text-amber-400/70 mt-2">Give your block a name so you can find it later!</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Length</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={lengthWeeks}
                  onChange={e => setLengthWeeks(Number(e.target.value))}
                  className="w-full accent-amber-500"
                  list="weeks-ticks"
                />
                <datalist id="weeks-ticks">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(n => <option key={n} value={n} />)}
                </datalist>
                <div className="flex justify-between px-0.5 -mt-1">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                    <span key={n} className={`text-[9px] ${n === lengthWeeks ? 'text-amber-400 font-bold' : 'text-gray-600'}`}>{n}</span>
                  ))}
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-400 w-24 text-right">{lengthWeeks} wk{lengthWeeks !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Phase sequence: Hypertrophy → Strength → Peaking (multi-point slider) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Focus</label>
            {lengthWeeks >= 3 ? (
              <BlockPhaseSlider
                lengthWeeks={lengthWeeks}
                breakpoint1={phaseBreakpoint1}
                breakpoint2={phaseBreakpoint2}
                onChange={(b1, b2) => {
                  setPhaseBreakpoint1(b1);
                  setPhaseBreakpoint2(b2);
                }}
                className="mt-1"
              />
            ) : (
              <p className="text-xs text-gray-500 py-2">Set block length to 3+ weeks to use phase planning (Hypertrophy → Strength → Peaking).</p>
            )}
          </div>

          {/* Volume Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Volume Tolerance</label>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-mono text-gray-500">Level {volumeTolerance}/5</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  volumeTolerance <= 1 ? 'bg-blue-500/20 text-blue-300' :
                  volumeTolerance <= 2 ? 'bg-cyan-500/20 text-cyan-300' :
                  volumeTolerance <= 3 ? 'bg-amber-500/20 text-amber-300' :
                  volumeTolerance <= 4 ? 'bg-orange-500/20 text-orange-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {volumeTolerance <= 1 ? 'Conservative' :
                   volumeTolerance <= 2 ? 'Below Average' :
                   volumeTolerance <= 3 ? 'Moderate' :
                   volumeTolerance <= 4 ? 'Above Average' :
                   'High Capacity'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={volumeTolerance}
                onChange={e => setVolumeTolerance(Number(e.target.value))}
                className="w-full accent-amber-500"
                list="vol-ticks"
              />
              <datalist id="vol-ticks">
                {[1,2,3,4,5].map(n => <option key={n} value={n} />)}
              </datalist>
              <div className="flex justify-between px-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-[10px] ${n === volumeTolerance ? 'text-amber-400 font-bold' : 'text-gray-600'}`}>{n}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-600">
                How much training volume can you recover from? Higher = more sets per exercise (e.g., 5×10 vs 3×10).
              </p>
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

          {/* Create / Update Block */}
          <div className="relative">
            {isComplete && <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-lg pointer-events-none" style={{ animation: 'ctaPulse 2s ease-in-out infinite' }} />}
            <button
              onClick={handleSave}
              disabled={!isComplete}
              className={`relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold tracking-wide transition-all ${
                isComplete
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Rocket size={18} />
              {block ? 'Update Block' : 'Create Block'}
            </button>
            {!isComplete && (
              <p className="text-center text-xs text-gray-600 mt-2">Enter a block name to get started</p>
            )}
          </div>
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

          {/* Session Structure */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Session Structure</label>
            <p className="text-xs text-gray-500 mb-3">How many lifts per session? This controls the AI's exercise count.</p>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_STRUCTURE_PRESETS.map(preset => {
                const active = sessionStructure === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSessionStructure(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${active ? 'text-amber-400' : 'text-gray-300'}`}>
                        {preset.label}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-gray-500'}`}>
                        {preset.exerciseRange.min === preset.exerciseRange.max
                          ? `${preset.exerciseRange.min} lift${preset.exerciseRange.min > 1 ? 's' : ''}`
                          : `${preset.exerciseRange.min}-${preset.exerciseRange.max} lifts`}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create / Update Block */}
          <div className="relative">
            {isComplete && <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-lg pointer-events-none" style={{ animation: 'ctaPulse 2s ease-in-out infinite' }} />}
            <button
              onClick={handleSave}
              disabled={!isComplete}
              className={`relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold tracking-wide transition-all ${
                isComplete
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Rocket size={18} />
              {block ? 'Update Block' : 'Create Block'}
            </button>
          </div>
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

            // Sort exercises logically for this slot
            const exercises = exercisesByCategory[category] || [];

            return (
              <div key={category} className={`border ${CATEGORY_COLORS[category]} rounded-xl overflow-hidden`}>
                <div className="bg-neutral-900 px-4 py-2.5">
                  <h3 className="text-sm font-bold text-gray-200">{CATEGORY_LABELS[category]}</h3>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {categorySlots.map(slot => {
                    const { recommended, others } = sortExercisesForSlot(category, slot.tier, exercises);
                    const recLabel = OPTGROUP_LABELS[category]?.[slot.tier] || 'Recommended';
                    return (
                      <div key={slot.index} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xs text-gray-500 w-28 shrink-0 font-medium">{TIER_LABELS[slot.tier]}</span>
                        <select
                          value={slot.exerciseId || ''}
                          onChange={e => updateSlot(slot.index, e.target.value || null)}
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="">— AI chooses —</option>
                          {recommended.length > 0 && (
                            <optgroup label={`★ ${recLabel}`}>
                              {recommended.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {others.length > 0 && (
                            <optgroup label={recommended.length > 0 ? 'Other Variations' : 'All Exercises'}>
                              {others.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {slot.exerciseId && (
                          <Check size={14} className="text-amber-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Save button pinned at end of exercises list */}
          <div className="relative">
            {isComplete && <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-lg pointer-events-none" style={{ animation: 'ctaPulse 2s ease-in-out infinite' }} />}
            <button
              onClick={handleSave}
              disabled={!isComplete}
              className={`relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold tracking-wide transition-all ${
                isComplete
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-neutral-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Rocket size={18} />
              {block ? 'Update Block' : 'Create Block'}
            </button>
          </div>
        </div>
      )}

      {/* ===== CALENDAR SUB-TAB ===== */}
      {subTab === 'calendar' && (
        <TrainingCalendarView
          scheduled={scheduledWorkouts}
          history={workoutHistory}
          onSave={onScheduledSave}
          onDelete={onScheduledDelete}
        />
      )}

      {/* Pulse animation for CTA glow */}
      <style>{`
        @keyframes ctaPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PlanView;
