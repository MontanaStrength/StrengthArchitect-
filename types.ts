
// ===== CORE ENUMS =====

export enum ReadinessLevel {
  LOW = 'Low (Recovery Focus)',
  MEDIUM = 'Medium (Regular Training)',
  HIGH = 'High (Peak Performance)',
}

export enum TrainingExperience {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  ELITE = 'Elite',
}

export enum AvailableEquipment {
  BARBELL = 'Barbell',
  DUMBBELL = 'Dumbbell',
  KETTLEBELL = 'Kettlebell',
  CABLE = 'Cable Machine',
  MACHINE = 'Machine',
  BODYWEIGHT = 'Bodyweight',
  BANDS = 'Resistance Bands',
  SPECIALTY_BAR = 'Specialty Bar',
}

export enum MuscleGroup {
  CHEST = 'Chest',
  BACK = 'Back',
  SHOULDERS = 'Shoulders',
  BICEPS = 'Biceps',
  TRICEPS = 'Triceps',
  QUADS = 'Quads',
  HAMSTRINGS = 'Hamstrings',
  GLUTES = 'Glutes',
  CALVES = 'Calves',
  CORE = 'Core',
  FOREARMS = 'Forearms',
  TRAPS = 'Traps',
}

export enum MovementPattern {
  SQUAT = 'Squat',
  HINGE = 'Hinge',
  HORIZONTAL_PUSH = 'Horizontal Push',
  HORIZONTAL_PULL = 'Horizontal Pull',
  VERTICAL_PUSH = 'Vertical Push',
  VERTICAL_PULL = 'Vertical Pull',
  CARRY = 'Carry',
  CORE = 'Core',
  ISOLATION = 'Isolation',
}

// ===== EXERCISE LIBRARY =====

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: AvailableEquipment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompound: boolean;
  cues?: string[];
  videoUrl?: string;
}

// ===== WORKOUT DATA MODEL (SET-BASED) =====

export interface ExerciseBlock {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string; // "5", "8-12", "AMRAP", "5/3/1"
  weightLbs?: number;
  percentOf1RM?: number; // 0-100 (e.g. 75 = 75%)
  rpeTarget?: number; // 6-10
  rirTarget?: number; // 0-5 (reps in reserve)
  restSeconds: number;
  tempo?: string; // "3-1-2-0" (eccentric-pause-concentric-top)
  supersetGroup?: string; // group letter for supersets (A, B, C...)
  notes?: string;
  coachingCue?: string;
  isWarmupSet?: boolean;
}

export interface StrengthWorkoutPlan {
  archetypeId?: string;
  title: string;
  focus: string; // e.g., "Hypertrophy", "Strength", "Power", "Endurance", "Deload"
  totalDurationMin: number;
  difficulty: string;
  exercises: ExerciseBlock[];
  summary: string;
  whyThisWorkout?: string;
  physiologicalBenefits?: string[];
  coachingTips?: EducationalTip[];
  estimatedTonnage?: number; // total lbs moved
  movementPatternsCovered?: string[];
  muscleGroupsCovered?: string[];
}

export interface EducationalTip {
  title: string;
  explanation: string;
}

// ===== COMPLETED WORKOUT =====

export interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightLbs: number;
  rpe?: number;
  timestamp: number;
}

export interface FeedbackData {
  rating: 'up' | 'down';
  comment: string;
}

export interface SavedWorkout extends StrengthWorkoutPlan {
  id: string;
  timestamp: number;
  feedback?: FeedbackData;
  completedSets?: CompletedSet[];
  actualTonnage?: number; // sum of reps * weight across all sets
  sessionRPE?: number; // overall session RPE 1-10
}

// ===== SESSION STRUCTURE =====

export type SessionStructure = 'one-lift' | 'main-plus-accessory' | 'standard' | 'high-variety';

export interface SessionStructurePreset {
  id: SessionStructure;
  label: string;
  shortLabel: string;
  exerciseRange: { min: number; max: number };
  description: string;
  promptGuidance: string;
}

export const SESSION_STRUCTURE_PRESETS: SessionStructurePreset[] = [
  {
    id: 'one-lift',
    label: 'One Lift a Day',
    shortLabel: '1 Lift',
    exerciseRange: { min: 1, max: 1 },
    description: 'Single main lift with deep volume. Perfect for high-frequency training (5-7 days/week).',
    promptGuidance: `SESSION STRUCTURE: "One Lift a Day" — This athlete trains with HIGH FREQUENCY (5-7 days/week) using a single-lift-per-session approach.
    RULES:
    - Prescribe EXACTLY 1 working exercise for this session.
    - Concentrate ALL volume on that single lift (6-10+ working sets).
    - Include 2-3 progressive warmup sets before working weight.
    - Vary the stimulus across sessions via set/rep schemes (heavy singles one day, volume sets another).
    - NO accessories, NO secondary exercises. Every set is devoted to the one lift.
    - This is NOT a minimalist workout — it's a FOCUSED, high-volume session on one movement pattern.`,
  },
  {
    id: 'main-plus-accessory',
    label: 'Main + Accessory',
    shortLabel: '1+1',
    exerciseRange: { min: 2, max: 2 },
    description: 'One main compound lift plus one targeted accessory. Great for focused sessions.',
    promptGuidance: `SESSION STRUCTURE: "Main Lift + Accessory" — This athlete prefers focused 2-exercise sessions.
    RULES:
    - Prescribe EXACTLY 2 working exercises: 1 main compound lift and 1 accessory.
    - The main lift gets the majority of volume (4-6+ working sets).
    - The accessory targets a supporting muscle group or addresses a weakness (2-4 sets).
    - Include warmup sets for the main compound lift.
    - The accessory should complement the main lift (e.g., main: squat, accessory: RDL or leg curl).
    - Do NOT add extra exercises. Keep it to exactly 2.`,
  },
  {
    id: 'standard',
    label: 'Standard Session',
    shortLabel: 'Standard',
    exerciseRange: { min: 4, max: 7 },
    description: 'Traditional 4-7 exercise session with compounds and accessories. The classic approach.',
    promptGuidance: '', // Empty = use existing NSCA defaults, no override needed
  },
  {
    id: 'high-variety',
    label: 'High Variety',
    shortLabel: 'High Vol',
    exerciseRange: { min: 6, max: 10 },
    description: 'More exercises with distributed volume. Covers many muscle groups per session.',
    promptGuidance: `SESSION STRUCTURE: "High Variety" — This athlete prefers sessions with more exercises and distributed volume.
    RULES:
    - Prescribe 6-10 exercises to cover multiple movement patterns and muscle groups.
    - Distribute volume across exercises (2-4 sets each) rather than concentrating on fewer lifts.
    - Include a mix of compounds and isolation work.
    - Supersets are encouraged to manage session duration.
    - Ensure broad coverage of movement patterns (push, pull, hinge, squat, core).`,
  },
];

export const DEFAULT_SESSION_STRUCTURE: SessionStructure = 'standard';

// ===== USER FORM =====

// ===== PRE-WORKOUT CHECK-IN =====

export type MoodLevel = 'poor' | 'okay' | 'good' | 'great';
export type SorenessLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type NutritionQuality = 'poor' | 'fair' | 'good' | 'dialed';

export interface PreWorkoutCheckIn {
  mood?: MoodLevel;
  soreness?: SorenessLevel;
  nutrition?: NutritionQuality;
}

export interface FormData {
  duration: number; // session length in minutes
  readiness: ReadinessLevel;
  trainingExperience: TrainingExperience;
  availableEquipment: AvailableEquipment[];
  weightLbs: number;
  age: number;
  gender: 'male' | 'female';
  trainingGoalFocus: TrainingGoalFocus;
  // Lift PRs for AI scaling
  benchPress1RM?: number;
  squat1RM?: number;
  deadlift1RM?: number;
  overheadPress1RM?: number;
  // Session structure preference
  sessionStructure?: SessionStructure;
  // Pre-workout check-in
  preWorkoutCheckIn?: PreWorkoutCheckIn;
}

export type TrainingGoalFocus = 'strength' | 'hypertrophy' | 'power' | 'endurance' | 'general';

// ===== OPTIMIZER (feeds into AI prompt) =====

export interface OptimizerConfig {
  enabled: boolean;
  // Volume optimization
  targetSetsPerMuscleGroup?: Partial<Record<MuscleGroup, number>>; // weekly target
  maxSetsPerSession?: number;
  // Rep optimization
  repRangePreference?: 'low' | 'moderate' | 'high' | 'auto';
  // Fatigue management
  autoDeload?: boolean;
  deloadFrequencyWeeks?: number; // e.g., every 4 weeks
  // Computed recommendations (populated by optimizer logic — added later)
  recommendations?: OptimizerRecommendations;
}

export interface OptimizerRecommendations {
  sessionVolume: number; // recommended total working sets for this session
  repScheme: string; // e.g., "5x5", "4x8-12", "3x3"
  intensityRange: { min: number; max: number }; // %1RM
  restRange: { min: number; max: number }; // seconds
  exerciseCount: { min: number; max: number };
  rationale: string; // human-readable explanation
  muscleGroupPriorities?: Partial<Record<MuscleGroup, 'increase' | 'maintain' | 'decrease'>>;
  suggestedFocus?: TrainingGoalFocus;
  weeklyVolumeStatus?: Partial<Record<MuscleGroup, { current: number; target: number; status: 'under' | 'on-track' | 'over' }>>;
  // Frederick metabolic stress — prescriptive per exercise for hypertrophy
  metabolicLoadTarget?: { min: number; max: number }; // target per-exercise load range
  metabolicLoadZone?: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme';
  metabolicLoadPerSet?: number; // estimated load per working set at recommended intensity/reps/RPE
  metabolicSetsPerExercise?: { min: number; max: number }; // sets per exercise to hit metabolic target
  // Hanley Fatigue Metric — prescriptive total reps per exercise
  fatigueScoreTarget?: { min: number; max: number }; // target per-exercise fatigue zone
  fatigueScoreZone?: 'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme';
  targetRepsPerExercise?: number; // total reps per exercise at recommended intensity
  // Peak Force Drop-Off — strength/power set division
  peakForceDropRep?: number; // rep at which peak force starts to decline
  strengthSetDivision?: { sets: number; repsPerSet: number; restSeconds: number }; // strength-optimised scheme
}

export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
  enabled: true,
  maxSetsPerSession: 25,
  repRangePreference: 'auto',
  autoDeload: true,
  deloadFrequencyWeeks: 4,
};

// ===== LIFT RECORDS (replaces Power Curve) =====

export interface LiftRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number; // lbs
  reps: number;
  estimated1RM: number; // Epley/Brzycki formula
  date: number; // timestamp
  rpe?: number;
  notes?: string;
}

export interface LiftProfile {
  records: LiftRecord[];
  benchPress1RM?: number;
  squat1RM?: number;
  deadlift1RM?: number;
  overheadPress1RM?: number;
}

// ===== ACHIEVEMENTS =====

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (history: SavedWorkout[], liftRecords?: LiftRecord[]) => boolean;
  unlocked: boolean;
}

// ===== PERIODIZATION =====

export enum TrainingPhase {
  ACCUMULATION = 'Accumulation',
  INTENSIFICATION = 'Intensification',
  REALIZATION = 'Realization',
  DELOAD = 'Deload',
  HYPERTROPHY = 'Hypertrophy',
  STRENGTH = 'Strength',
  PEAKING = 'Peaking',
}

export interface TrainingBlock {
  id: string;
  name: string;
  startDate: number;
  phases: TrainingBlockPhase[];
  goalEvent?: string; // e.g., "Powerlifting Meet", "Body Recomp"
  goalDate?: number;
  isActive: boolean;
  /** How many weeks this block runs */
  lengthWeeks?: number;
  /** Days of the week the user lifts (0=Sun, 1=Mon, ..., 6=Sat) */
  trainingDays?: number[];
  /** Exercise selection preferences */
  exercisePreferences?: ExercisePreferences;
  /** 0 = pure hypertrophy, 50 = balanced, 100 = pure strength */
  goalBias?: number;
  /** 1 = conservative, 3 = moderate (default), 5 = high capacity */
  volumeTolerance?: number;
  /** Session structure preset: how many lifts per session */
  sessionStructure?: SessionStructure;
}

// ===== EXERCISE PREFERENCES (18-slot selection) =====

export type ExerciseSlotCategory = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'core' | 'accessory';
export type ExerciseTier = 'primary' | 'secondary' | 'tertiary';
export type CoreSlotType = 'anti-flexion' | 'anti-extension' | 'anti-rotation';

export interface ExerciseSlot {
  category: ExerciseSlotCategory;
  tier: ExerciseTier | CoreSlotType | 'slot-1' | 'slot-2' | 'slot-3';
  exerciseId: string | null; // null = not yet chosen
}

export interface ExercisePreferences {
  slots: ExerciseSlot[];
}

export type SplitPattern =
  | 'full-body'
  | 'upper-lower'
  | 'push-pull-legs'
  | 'squat-bench-deadlift'
  | 'custom';

export const SPLIT_PATTERNS: { value: SplitPattern; label: string; minDays: number; maxDays: number; desc: string }[] = [
  { value: 'full-body',            label: 'Full Body',       minDays: 2, maxDays: 4, desc: 'Hit every muscle group each session' },
  { value: 'upper-lower',          label: 'Upper / Lower',   minDays: 3, maxDays: 5, desc: 'Alternate upper- and lower-body days' },
  { value: 'push-pull-legs',       label: 'Push / Pull / Legs', minDays: 3, maxDays: 6, desc: 'Classic 3-way split, can be run 1–2×' },
  { value: 'squat-bench-deadlift', label: 'SBD (Powerlifting)', minDays: 3, maxDays: 5, desc: 'Organize around the competition lifts' },
  { value: 'custom',               label: 'Custom',          minDays: 1, maxDays: 7, desc: 'Define your own split pattern' },
];

export interface TrainingBlockPhase {
  phase: TrainingPhase;
  weekCount: number;
  sessionsPerWeek: number;
  splitPattern: SplitPattern;
  intensityFocus: 'low' | 'moderate' | 'high' | 'very-high' | 'minimal';
  volumeFocus: 'low' | 'moderate' | 'high' | 'very-high' | 'minimal';
  primaryArchetypes: string[];
  description: string;
}

/** Pre-built phase configs for quick setup */
export const PHASE_PRESETS: Record<TrainingPhase, Omit<TrainingBlockPhase, 'weekCount' | 'sessionsPerWeek' | 'splitPattern'>> = {
  [TrainingPhase.HYPERTROPHY]:     { phase: TrainingPhase.HYPERTROPHY,     intensityFocus: 'moderate',  volumeFocus: 'high',      primaryArchetypes: ['hyp_ppl', 'hyp_upper_lower', 'gvt'],                  description: 'High volume, moderate loads. Build muscle mass.' },
  [TrainingPhase.ACCUMULATION]:    { phase: TrainingPhase.ACCUMULATION,    intensityFocus: 'moderate',  volumeFocus: 'very-high',  primaryArchetypes: ['hyp_ppl', 'dup_3day', 'hyp_upper_lower'],             description: 'Build work capacity with high volume.' },
  [TrainingPhase.STRENGTH]:        { phase: TrainingPhase.STRENGTH,        intensityFocus: 'high',      volumeFocus: 'moderate',   primaryArchetypes: ['str_5x5', 'str_531', 'str_texas'],                    description: 'Increase intensity, reduce volume. Build raw strength.' },
  [TrainingPhase.INTENSIFICATION]: { phase: TrainingPhase.INTENSIFICATION, intensityFocus: 'high',      volumeFocus: 'moderate',   primaryArchetypes: ['str_531', 'str_texas', 'conjugate_me'],               description: 'Progressive overload on competition lifts.' },
  [TrainingPhase.REALIZATION]:     { phase: TrainingPhase.REALIZATION,     intensityFocus: 'very-high', volumeFocus: 'low',        primaryArchetypes: ['str_heavy_singles', 'str_cluster', 'str_531'],        description: 'Peak intensity, minimal volume. Heavy singles & doubles.' },
  [TrainingPhase.PEAKING]:         { phase: TrainingPhase.PEAKING,         intensityFocus: 'very-high', volumeFocus: 'low',        primaryArchetypes: ['str_heavy_singles', 'str_cluster'],                   description: 'Test new maxes. Minimal fatigue, maximal expression.' },
  [TrainingPhase.DELOAD]:          { phase: TrainingPhase.DELOAD,          intensityFocus: 'low',       volumeFocus: 'minimal',    primaryArchetypes: ['deload_light', 'deload_movement'],                    description: 'Active recovery. 50-60% loads, movement quality focus.' },
};

export const PERIODIZATION_TEMPLATES: Record<string, Omit<TrainingBlock, 'id' | 'startDate' | 'isActive'>> = {
  'linear-8-week': {
    name: '8-Week Linear Progression',
    phases: [
      { phase: TrainingPhase.HYPERTROPHY, weekCount: 3, sessionsPerWeek: 4, splitPattern: 'upper-lower', intensityFocus: 'moderate', volumeFocus: 'high', primaryArchetypes: ['hyp_ppl', 'hyp_upper_lower', 'gvt'], description: 'High volume hypertrophy. Build muscle mass with moderate loads.' },
      { phase: TrainingPhase.STRENGTH, weekCount: 3, sessionsPerWeek: 4, splitPattern: 'upper-lower', intensityFocus: 'high', volumeFocus: 'moderate', primaryArchetypes: ['str_5x5', 'str_531', 'str_texas'], description: 'Increase intensity, reduce volume. Build raw strength.' },
      { phase: TrainingPhase.PEAKING, weekCount: 1, sessionsPerWeek: 3, splitPattern: 'squat-bench-deadlift', intensityFocus: 'very-high', volumeFocus: 'low', primaryArchetypes: ['str_heavy_singles', 'str_cluster'], description: 'Peak intensity, minimal volume. Test new maxes.' },
      { phase: TrainingPhase.DELOAD, weekCount: 1, sessionsPerWeek: 3, splitPattern: 'full-body', intensityFocus: 'low', volumeFocus: 'minimal', primaryArchetypes: ['deload_light', 'deload_movement'], description: 'Active recovery. 50-60% loads, focus on movement quality.' },
    ],
  },
  'powerlifting-12-week': {
    name: '12-Week Powerlifting Prep',
    phases: [
      { phase: TrainingPhase.ACCUMULATION, weekCount: 4, sessionsPerWeek: 4, splitPattern: 'upper-lower', intensityFocus: 'moderate', volumeFocus: 'very-high', primaryArchetypes: ['hyp_ppl', 'dup_3day', 'hyp_upper_lower'], description: 'Build work capacity. High volume, moderate intensity.' },
      { phase: TrainingPhase.INTENSIFICATION, weekCount: 4, sessionsPerWeek: 4, splitPattern: 'squat-bench-deadlift', intensityFocus: 'high', volumeFocus: 'moderate', primaryArchetypes: ['str_531', 'str_texas', 'conjugate_me'], description: 'Increase loads progressively. Competition lift focus.' },
      { phase: TrainingPhase.REALIZATION, weekCount: 3, sessionsPerWeek: 3, splitPattern: 'squat-bench-deadlift', intensityFocus: 'very-high', volumeFocus: 'low', primaryArchetypes: ['str_heavy_singles', 'str_cluster', 'str_531'], description: 'Peak for meet. Heavy singles and doubles.' },
      { phase: TrainingPhase.DELOAD, weekCount: 1, sessionsPerWeek: 2, splitPattern: 'full-body', intensityFocus: 'minimal', volumeFocus: 'minimal', primaryArchetypes: ['deload_light'], description: 'Meet week. Openers only, rest and recover.' },
    ],
  },
  'hypertrophy-6-week': {
    name: '6-Week Hypertrophy Block',
    phases: [
      { phase: TrainingPhase.ACCUMULATION, weekCount: 2, sessionsPerWeek: 4, splitPattern: 'push-pull-legs', intensityFocus: 'moderate', volumeFocus: 'high', primaryArchetypes: ['hyp_ppl', 'hyp_upper_lower', 'hyp_bro_split'], description: 'Progressive volume increase. 3-4 sets per exercise.' },
      { phase: TrainingPhase.HYPERTROPHY, weekCount: 3, sessionsPerWeek: 5, splitPattern: 'push-pull-legs', intensityFocus: 'moderate', volumeFocus: 'very-high', primaryArchetypes: ['gvt', 'hyp_ppl', 'hyp_arnold'], description: 'Peak volume phase. Mechanical tension and metabolic stress.' },
      { phase: TrainingPhase.DELOAD, weekCount: 1, sessionsPerWeek: 3, splitPattern: 'full-body', intensityFocus: 'low', volumeFocus: 'low', primaryArchetypes: ['deload_light', 'deload_movement'], description: 'Recover and grow. Reduce volume 40-50%.' },
    ],
  },
};

// ===== BODY COMP =====

export interface BodyCompEntry {
  id: string;
  date: number;
  weightLbs: number;
  bodyFatPct?: number;
  muscleMassLbs?: number;
  waistInches?: number;
  notes?: string;
}

// ===== RECOVERY =====

export type RecoveryScore = 'fully-recovered' | 'mostly-recovered' | 'moderate-fatigue' | 'high-fatigue' | 'overtrained';

export interface RecoveryAssessment {
  score: RecoveryScore;
  numericScore: number;
  trainingLoadLast3Days: number;
  trainingLoadLast7Days: number;
  hardSessionsLast3Days: number;
  hardSessionsLast7Days: number;
  daysSinceLastWorkout: number;
  totalTonnageLast7Days: number;
  recommendation: string;
  suggestedActivity: 'rest' | 'active-recovery' | 'light-training' | 'normal-training' | 'hard-training';
  protocols: RecoveryProtocol[];
}

export interface RecoveryProtocol {
  name: string;
  duration: string;
  description: string;
  category: 'mobility' | 'breathing' | 'nutrition' | 'sleep' | 'active-recovery';
}

// ===== CALENDAR =====

export type ScheduledWorkoutStatus = 'planned' | 'completed' | 'skipped';

export interface ScheduledWorkout {
  id: string;
  date: string; // ISO YYYY-MM-DD
  label: string;
  phase?: TrainingPhase;
  suggestedDuration?: number;
  suggestedReadiness?: 'Low' | 'Medium' | 'High';
  suggestedIntensity?: 'low' | 'moderate' | 'high' | 'rest';
  suggestedFocus?: TrainingGoalFocus;
  notes?: string;
  status: ScheduledWorkoutStatus;
  completedWorkoutId?: string;
  /** Links this session to a specific block / phase / week */
  trainingBlockId?: string;
  phaseIndex?: number;
  weekIndex?: number;
  dayIndex?: number;
}

// ===== SLEEP =====

export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';

export interface SleepEntry {
  id: string;
  date: string;
  hoursSlept: number;
  quality: SleepQuality;
  notes?: string;
  hrv?: number;
  restingHR?: number;
}

// ===== GOALS =====

export type GoalCategory = 'strength-1rm' | 'weight' | 'body-comp' | 'frequency' | 'volume' | 'custom';

export interface TrainingGoal {
  id: string;
  category: GoalCategory;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: number;
  targetDate?: number;
  completedDate?: number;
}

// ===== CUSTOM TEMPLATES =====

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  exercises: CustomTemplateExercise[];
  defaultDurationMin: number;
  focusArea: TrainingGoalFocus;
  createdAt: number;
}

export interface CustomTemplateExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  percentOf1RM?: number;
  rpeTarget?: number;
  restSeconds: number;
  supersetGroup?: string;
}

// ===== GYM SETUP =====

export interface GymSetup {
  availableEquipment: AvailableEquipment[];
  barbellWeightLbs: number; // 45 for standard, 35 for women's, etc.
  availablePlatesLbs: number[]; // e.g., [2.5, 5, 10, 25, 35, 45]
  hasRack: boolean;
  hasPullUpBar: boolean;
  hasCableStack: boolean;
  notes?: string;
}

export const DEFAULT_GYM_SETUP: GymSetup = {
  availableEquipment: [AvailableEquipment.BARBELL, AvailableEquipment.DUMBBELL, AvailableEquipment.BODYWEIGHT],
  barbellWeightLbs: 45,
  availablePlatesLbs: [2.5, 5, 10, 25, 35, 45],
  hasRack: true,
  hasPullUpBar: true,
  hasCableStack: false,
};

// ===== STRENGTH TESTS =====

export type StrengthTestType = '1rm-test' | '3rm-test' | '5rm-test' | 'amrap-test';

export interface StrengthTestResult {
  id: string;
  testType: StrengthTestType;
  date: number;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  rpe?: number;
  notes?: string;
}

// ===== SUPERSET BUILDER =====

export interface SupersetConfig {
  id: string;
  name: string;
  description: string;
  exercisePairs: SupersetPair[];
  restBetweenSupersets: number; // seconds
  rounds: number;
}

export interface SupersetPair {
  exerciseA: { exerciseId: string; exerciseName: string; reps: string; };
  exerciseB: { exerciseId: string; exerciseName: string; reps: string; };
  restBetweenExercises: number; // seconds
}

// ===== WARMUP/COOLDOWN =====

export interface WarmupProtocol {
  name: string;
  steps: WarmupStep[];
  totalDurationMin: number;
}

export interface WarmupStep {
  description: string;
  durationSeconds: number;
  type: 'foam-roll' | 'dynamic-stretch' | 'activation' | 'ramp-up-set' | 'static-stretch' | 'breathing';
  notes?: string;
}

// ===== EXPORT =====

export type ExportFormat = 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeSets: boolean;
  includeRPE: boolean;
  includeTonnage: boolean;
}

// ===== RPE CALIBRATION =====

export interface RPECalibration {
  lastCalibrated?: number;
  calibrationMethod: 'self-assessment' | 'video-review' | 'bar-speed';
  notes?: string;
  // Map of RPE values to % of 1RM for the athlete (individual calibration)
  rpeToPercentMap?: Record<number, number>; // e.g., { 10: 100, 9: 95, 8: 90, 7: 85, 6: 80 }
}

export const DEFAULT_RPE_TO_PERCENT: Record<number, number> = {
  10: 100,
  9.5: 97.5,
  9: 95,
  8.5: 92.5,
  8: 90,
  7.5: 87.5,
  7: 85,
  6.5: 82.5,
  6: 80,
};

// ===== COACH MODE =====

export type AppMode = 'lifter' | 'coach';

export interface CoachClient {
  id: string;
  name: string;
  email?: string;
  weightLbs: number;
  age: number;
  gender: 'male' | 'female';
  experience: TrainingExperience;
  equipment: AvailableEquipment[];
  notes?: string;
  avatarColor: string;
  createdAt: number;
  /** Session structure preset: how many lifts per session */
  sessionStructure?: SessionStructure;
}
