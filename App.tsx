import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReadinessLevel, TrainingExperience, AvailableEquipment, TrainingGoalFocus,
  FormData, StrengthWorkoutPlan, SavedWorkout, CompletedSet, FeedbackData,
  TrainingBlock, TrainingBlockPhase, TrainingPhase, LiftRecord, BodyCompEntry,
  ScheduledWorkout, SleepEntry, TrainingGoal, CustomTemplate, StrengthTestResult,
  GymSetup, DEFAULT_GYM_SETUP, OptimizerConfig, DEFAULT_OPTIMIZER_CONFIG,
  OptimizerRecommendations, Achievement,
} from './types';
import {
  supabase, syncWorkoutToCloud, fetchWorkoutsFromCloud, deleteWorkoutFromCloud,
  syncTrainingBlockToCloud, fetchTrainingBlocksFromCloud, deleteTrainingBlockFromCloud,
  syncLiftRecordToCloud, fetchLiftRecordsFromCloud, deleteLiftRecordFromCloud,
  syncBodyCompToCloud, fetchBodyCompFromCloud, deleteBodyCompFromCloud,
  syncScheduledWorkoutToCloud, fetchScheduledWorkoutsFromCloud, deleteScheduledWorkoutFromCloud,
  syncSleepEntryToCloud, fetchSleepEntriesFromCloud, deleteSleepEntryFromCloud,
  syncGoalToCloud, fetchGoalsFromCloud, deleteGoalFromCloud,
  syncStrengthTestToCloud, fetchStrengthTestsFromCloud,
  syncCustomTemplateToCloud, fetchCustomTemplatesFromCloud, deleteCustomTemplateFromCloud,
  syncUserPreferencesToCloud, fetchUserPreferencesFromCloud,
  syncDismissedAlertsToCloud, fetchDismissedAlertsFromCloud, UserPreferences,
} from './services/supabaseService';
import { generateWorkout, TrainingContext } from './services/geminiService';
import { estimate1RM } from './utils';
import { initAudio } from './utils/audioManager';

// Component imports
import AuthView from './components/AuthView';
import LoadingView from './components/LoadingView';
import DashboardView from './components/DashboardView';
import WorkoutCard from './components/WorkoutCard';
import WorkoutSession from './components/WorkoutSession';
import HistoryView from './components/HistoryView';
import FeedbackSection from './components/FeedbackSection';
import TrainingBlockView from './components/TrainingBlockView';
import LiftRecordsView from './components/LiftRecordsView';
import BodyCompTrackerView from './components/BodyCompTrackerView';
import RecoveryAdvisorView from './components/RecoveryAdvisorView';
import TrainingCalendarView from './components/TrainingCalendarView';
import AchievementsView from './components/AchievementsView';
import SleepJournalView from './components/SleepJournalView';
import GoalSettingView from './components/GoalSettingView';
import StrengthTestView from './components/StrengthTestView';
import ExportView from './components/ExportView';
import CustomTemplateBuilder from './components/CustomTemplateBuilder';
import GymSetupView from './components/GymSetupView';
import OptimizerView from './components/OptimizerView';
import TrainingLoadView from './components/TrainingLoadView';
import WarmupCooldownView from './components/WarmupCooldownView';
import RPECalibrationView from './components/RPECalibrationView';
import PlateCalculatorView from './components/PlateCalculatorView';
import NotificationCenterView from './components/NotificationCenterView';
import ReportCardsView from './components/ReportCardsView';
import ExerciseLibraryView from './components/ExerciseLibraryView';
import SupersetBuilderView from './components/SupersetBuilderView';

import { Dumbbell, History, BarChart3, Calendar, Moon, Target, Trophy, Activity, Settings, Bell, FileText, ChevronLeft, LogOut, Wrench, Calculator, BookOpen, Layers, LayoutList, Heart, Zap, ClipboardList, Sparkles } from 'lucide-react';

type ViewState =
  | 'form'
  | 'loading'
  | 'result'
  | 'session'
  | 'history'
  | 'dashboard'
  | 'training-blocks'
  | 'lift-records'
  | 'body-comp'
  | 'recovery'
  | 'calendar'
  | 'achievements'
  | 'sleep'
  | 'goals'
  | 'strength-test'
  | 'export'
  | 'custom-templates'
  | 'gym-setup'
  | 'optimizer'
  | 'training-load'
  | 'warmup-cooldown'
  | 'rpe-calibration'
  | 'plate-calculator'
  | 'notifications'
  | 'report-cards'
  | 'exercise-library'
  | 'superset-builder';

const App: React.FC = () => {
  // ===== AUTH =====
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ===== VIEW =====
  const [view, setView] = useState<ViewState>('form');

  // ===== FORM STATE =====
  const [formData, setFormData] = useState<FormData>({
    duration: 60,
    readiness: ReadinessLevel.MEDIUM,
    trainingExperience: TrainingExperience.INTERMEDIATE,
    availableEquipment: [AvailableEquipment.BARBELL, AvailableEquipment.DUMBBELL],
    weightLbs: 180,
    age: 30,
    gender: 'male',
    trainingGoalFocus: 'strength',
  });

  // ===== WORKOUT STATE =====
  const [currentPlan, setCurrentPlan] = useState<StrengthWorkoutPlan | null>(null);
  const [history, setHistory] = useState<SavedWorkout[]>([]);
  const [error, setError] = useState<string>('');

  // ===== FEATURE STATE =====
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [liftRecords, setLiftRecords] = useState<LiftRecord[]>([]);
  const [bodyCompEntries, setBodyCompEntries] = useState<BodyCompEntry[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [strengthTests, setStrengthTests] = useState<StrengthTestResult[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  // ===== PREFERENCES STATE =====
  const [gymSetup, setGymSetup] = useState<GymSetup>(DEFAULT_GYM_SETUP);
  const [optimizerConfig, setOptimizerConfig] = useState<OptimizerConfig>(DEFAULT_OPTIMIZER_CONFIG);
  const [audioMuted, setAudioMuted] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // ===== AUTH LISTENER =====
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setAuthLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===== LOAD DATA ON LOGIN =====
  useEffect(() => {
    if (!user) return;
    const loadAllData = async () => {
      try {
        const [
          workouts, blocks, lifts, bodyComp, scheduled, sleep, goalsData,
          tests, templates, prefs, dismissed
        ] = await Promise.all([
          fetchWorkoutsFromCloud(user.id),
          fetchTrainingBlocksFromCloud(user.id),
          fetchLiftRecordsFromCloud(user.id),
          fetchBodyCompFromCloud(user.id),
          fetchScheduledWorkoutsFromCloud(user.id),
          fetchSleepEntriesFromCloud(user.id),
          fetchGoalsFromCloud(user.id),
          fetchStrengthTestsFromCloud(user.id),
          fetchCustomTemplatesFromCloud(user.id),
          fetchUserPreferencesFromCloud(user.id),
          fetchDismissedAlertsFromCloud(user.id),
        ]);

        setHistory(workouts);
        setTrainingBlocks(blocks);
        setLiftRecords(lifts);
        setBodyCompEntries(bodyComp);
        setScheduledWorkouts(scheduled);
        setSleepEntries(sleep);
        setGoals(goalsData);
        setStrengthTests(tests);
        setCustomTemplates(templates);
        setDismissedAlertIds(dismissed);

        if (prefs.gymSetup) setGymSetup(prefs.gymSetup);
        if (prefs.optimizerConfig) setOptimizerConfig(prefs.optimizerConfig);
        if (prefs.audioMuted !== undefined) setAudioMuted(prefs.audioMuted);

        // Restore 1RM data from user metadata
        const meta = user.user_metadata || {};
        if (meta.squat1RM || meta.benchPress1RM || meta.deadlift1RM || meta.overheadPress1RM) {
          setFormData(prev => ({
            ...prev,
            squat1RM: meta.squat1RM || prev.squat1RM,
            benchPress1RM: meta.benchPress1RM || prev.benchPress1RM,
            deadlift1RM: meta.deadlift1RM || prev.deadlift1RM,
            overheadPress1RM: meta.overheadPress1RM || prev.overheadPress1RM,
            weightLbs: meta.weightLbs || prev.weightLbs,
            age: meta.age || prev.age,
            gender: meta.gender || prev.gender,
          }));
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadAllData();
  }, [user]);

  // ===== TRAINING CONTEXT (from active block) =====
  const trainingContext = useMemo<TrainingContext | null>(() => {
    const activeBlock = trainingBlocks.find(b => b.isActive);
    if (!activeBlock) return null;

    const now = Date.now();
    const blockStartMs = activeBlock.startDate;
    const elapsedWeeks = Math.floor((now - blockStartMs) / (7 * 24 * 60 * 60 * 1000));

    let cumWeeks = 0;
    let currentPhase: TrainingBlockPhase | null = null;
    let weekInPhase = 1;
    let totalWeeksInPhase = 1;

    for (const phase of activeBlock.phases) {
      if (elapsedWeeks < cumWeeks + phase.weekCount) {
        currentPhase = phase;
        weekInPhase = elapsedWeeks - cumWeeks + 1;
        totalWeeksInPhase = phase.weekCount;
        break;
      }
      cumWeeks += phase.weekCount;
    }

    if (!currentPhase) return null;

    return {
      phaseName: currentPhase.phase,
      intensityFocus: currentPhase.intensityFocus,
      volumeFocus: currentPhase.volumeFocus,
      primaryArchetypes: currentPhase.primaryArchetypes,
      weekInPhase,
      totalWeeksInPhase,
      blockName: activeBlock.name,
      goalEvent: activeBlock.goalEvent,
    };
  }, [trainingBlocks]);

  // ===== GENERATE WORKOUT =====
  const handleGenerate = useCallback(async () => {
    setError('');
    setView('loading');
    initAudio();

    try {
      // Build optimizer recommendations if enabled
      let optimizerRecs: OptimizerRecommendations | null = null;
      if (optimizerConfig.enabled && optimizerConfig.recommendations) {
        optimizerRecs = optimizerConfig.recommendations;
      }

      const plan = await generateWorkout(formData, history, trainingContext, optimizerRecs);
      setCurrentPlan(plan);

      const saved: SavedWorkout = {
        ...plan,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      const newHistory = [saved, ...history];
      setHistory(newHistory);
      setView('result');

      if (user) {
        syncWorkoutToCloud(saved, user.id).catch(console.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate workout.');
      setView('form');
    }
  }, [formData, history, trainingContext, optimizerConfig, user]);

  // ===== SAVE FEEDBACK =====
  const handleSaveFeedback = useCallback(async (workoutId: string, feedback: FeedbackData) => {
    const updated = history.map(w =>
      w.id === workoutId ? { ...w, feedback } : w
    );
    setHistory(updated);

    if (user) {
      const workout = updated.find(w => w.id === workoutId);
      if (workout) syncWorkoutToCloud(workout, user.id).catch(console.error);
    }
  }, [history, user]);

  // ===== SAVE COMPLETED SETS =====
  const handleSaveSession = useCallback(async (workoutId: string, completedSets: CompletedSet[], sessionRPE: number) => {
    const tonnage = completedSets.reduce((sum, s) => sum + s.weightLbs * s.reps, 0);
    const updated = history.map(w =>
      w.id === workoutId ? { ...w, completedSets, sessionRPE, actualTonnage: tonnage } : w
    );
    setHistory(updated);

    // Auto-update lift records from completed sets
    const newRecords: LiftRecord[] = [];
    for (const set of completedSets) {
      if (set.weightLbs > 0 && set.reps > 0) {
        const est = estimate1RM(set.weightLbs, set.reps);
        const existingBest = liftRecords.find(r => r.exerciseId === set.exerciseId);
        if (!existingBest || est > existingBest.estimated1RM) {
          const record: LiftRecord = {
            id: crypto.randomUUID(),
            exerciseId: set.exerciseId,
            exerciseName: set.exerciseName,
            weight: set.weightLbs,
            reps: set.reps,
            estimated1RM: est,
            date: Date.now(),
            rpe: set.rpe,
          };
          newRecords.push(record);
        }
      }
    }

    if (newRecords.length > 0) {
      setLiftRecords(prev => [...newRecords, ...prev]);
      if (user) {
        for (const r of newRecords) {
          syncLiftRecordToCloud(r, user.id).catch(console.error);
        }
      }
    }

    if (user) {
      const workout = updated.find(w => w.id === workoutId);
      if (workout) syncWorkoutToCloud(workout, user.id).catch(console.error);
    }

    setView('result');
  }, [history, liftRecords, user]);

  // ===== DELETE WORKOUT =====
  const handleDeleteWorkout = useCallback(async (id: string) => {
    setHistory(prev => prev.filter(w => w.id !== id));
    if (user) deleteWorkoutFromCloud(id, user.id).catch(console.error);
  }, [user]);

  // ===== PREFERENCES HANDLERS =====
  const handleGymSetupChange = useCallback(async (setup: GymSetup) => {
    setGymSetup(setup);
    setFormData(prev => ({ ...prev, availableEquipment: setup.availableEquipment }));
    if (user) {
      syncUserPreferencesToCloud({ gymSetup: setup, optimizerConfig, audioMuted }, user.id).catch(console.error);
    }
  }, [user, optimizerConfig, audioMuted]);

  const handleOptimizerConfigChange = useCallback(async (config: OptimizerConfig) => {
    setOptimizerConfig(config);
    if (user) {
      syncUserPreferencesToCloud({ gymSetup, optimizerConfig: config, audioMuted }, user.id).catch(console.error);
    }
  }, [user, gymSetup, audioMuted]);

  const handleAudioMutedChange = useCallback(async (muted: boolean) => {
    setAudioMuted(muted);
    if (user) {
      syncUserPreferencesToCloud({ gymSetup, optimizerConfig, audioMuted: muted }, user.id).catch(console.error);
    }
  }, [user, gymSetup, optimizerConfig]);

  const handleDismissAlert = useCallback(async (alertId: string) => {
    const updated = [...dismissedAlertIds, alertId];
    setDismissedAlertIds(updated);
    if (user) syncDismissedAlertsToCloud(updated, user.id).catch(console.error);
  }, [dismissedAlertIds, user]);

  const handleClearDismissed = useCallback(async () => {
    setDismissedAlertIds([]);
    if (user) syncDismissedAlertsToCloud([], user.id).catch(console.error);
  }, [user]);

  // ===== SIGN OUT =====
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHistory([]);
    setView('form');
  };

  // ===== AUTH GATE =====
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div></div>;
  }

  if (!user) {
    return <AuthView />;
  }

  // ===== LATEST WORKOUT =====
  const latestWorkout = history[0] || null;
  const currentSavedWorkout = latestWorkout && currentPlan && latestWorkout.title === currentPlan.title ? latestWorkout : null;

  // ===== NAV =====
  const navItems: { label: string; view: ViewState; icon: React.ReactNode }[] = [
    { label: 'Generate', view: 'form', icon: <Dumbbell size={18} /> },
    { label: 'Dashboard', view: 'dashboard', icon: <BarChart3 size={18} /> },
    { label: 'History', view: 'history', icon: <History size={18} /> },
    { label: 'Lift Records', view: 'lift-records', icon: <Trophy size={18} /> },
    { label: 'Calendar', view: 'calendar', icon: <Calendar size={18} /> },
    { label: 'Optimizer', view: 'optimizer', icon: <Sparkles size={18} /> },
  ];

  const moreItems: { label: string; view: ViewState; icon: React.ReactNode }[] = [
    { label: 'Training Blocks', view: 'training-blocks', icon: <Layers size={18} /> },
    { label: 'Training Load', view: 'training-load', icon: <Activity size={18} /> },
    { label: 'Strength Tests', view: 'strength-test', icon: <ClipboardList size={18} /> },
    { label: 'Recovery', view: 'recovery', icon: <Heart size={18} /> },
    { label: 'Body Comp', view: 'body-comp', icon: <BarChart3 size={18} /> },
    { label: 'Sleep', view: 'sleep', icon: <Moon size={18} /> },
    { label: 'Goals', view: 'goals', icon: <Target size={18} /> },
    { label: 'Achievements', view: 'achievements', icon: <Trophy size={18} /> },
    { label: 'Report Cards', view: 'report-cards', icon: <FileText size={18} /> },
    { label: 'Exercise Library', view: 'exercise-library', icon: <BookOpen size={18} /> },
    { label: 'Plate Calculator', view: 'plate-calculator', icon: <Calculator size={18} /> },
    { label: 'Superset Builder', view: 'superset-builder', icon: <Zap size={18} /> },
    { label: 'Warmup/Cooldown', view: 'warmup-cooldown', icon: <Activity size={18} /> },
    { label: 'RPE Calibration', view: 'rpe-calibration', icon: <Settings size={18} /> },
    { label: 'Custom Templates', view: 'custom-templates', icon: <LayoutList size={18} /> },
    { label: 'Gym Setup', view: 'gym-setup', icon: <Wrench size={18} /> },
    { label: 'Notifications', view: 'notifications', icon: <Bell size={18} /> },
    { label: 'Export', view: 'export', icon: <FileText size={18} /> },
  ];

  // ===== FORM RENDER =====
  const renderForm = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Training Goal Focus */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Training Focus</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(['strength', 'hypertrophy', 'power', 'endurance', 'general'] as TrainingGoalFocus[]).map(focus => (
            <button
              key={focus}
              onClick={() => setFormData(prev => ({ ...prev, trainingGoalFocus: focus }))}
              className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${
                formData.trainingGoalFocus === focus
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:border-red-500'
              }`}
            >
              {focus}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Session Duration</label>
        <div className="flex flex-wrap gap-2">
          {[30, 45, 60, 75, 90].map(d => (
            <button
              key={d}
              onClick={() => setFormData(prev => ({ ...prev, duration: d }))}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                formData.duration === d
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:border-red-500'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Readiness */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Readiness</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(ReadinessLevel).map(r => (
            <button
              key={r}
              onClick={() => setFormData(prev => ({ ...prev, readiness: r }))}
              className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                formData.readiness === r
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:border-red-500'
              }`}
            >
              {r.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Training Experience</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(TrainingExperience).map(exp => (
            <button
              key={exp}
              onClick={() => setFormData(prev => ({ ...prev, trainingExperience: exp }))}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                formData.trainingExperience === exp
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:border-red-500'
              }`}
            >
              {exp}
            </button>
          ))}
        </div>
      </div>

      {/* 1RM Inputs */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Known 1RMs (optional, lbs)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'squat1RM' as const, label: 'Squat' },
            { key: 'benchPress1RM' as const, label: 'Bench Press' },
            { key: 'deadlift1RM' as const, label: 'Deadlift' },
            { key: 'overheadPress1RM' as const, label: 'OHP' },
          ].map(lift => (
            <div key={lift.key}>
              <label className="text-xs text-gray-400">{lift.label}</label>
              <input
                type="number"
                value={formData[lift.key] || ''}
                onChange={e => setFormData(prev => ({ ...prev, [lift.key]: Number(e.target.value) || undefined }))}
                className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
                placeholder="lbs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Profile Row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400">Weight (lbs)</label>
          <input
            type="number"
            value={formData.weightLbs}
            onChange={e => setFormData(prev => ({ ...prev, weightLbs: Number(e.target.value) }))}
            className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={e => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))}
            className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Gender</label>
          <select
            value={formData.gender}
            onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
            className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Optimizer Badge */}
      {optimizerConfig.enabled && optimizerConfig.recommendations && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold">
            <Sparkles size={16} />
            Optimizer Active
          </div>
          <p className="text-xs text-purple-400 mt-1">
            {optimizerConfig.recommendations.rationale}
          </p>
          <p className="text-xs text-purple-300 mt-1">
            Target: {optimizerConfig.recommendations.sessionVolume} sets • {optimizerConfig.recommendations.repScheme} • {optimizerConfig.recommendations.intensityRange.min}-{optimizerConfig.recommendations.intensityRange.max}% 1RM
          </p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-red-600/25"
      >
        🏋️ Generate Workout
      </button>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Active Block Indicator */}
      {trainingContext && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm">
          <span className="text-blue-300 font-semibold">📋 Active Block:</span>{' '}
          <span className="text-blue-200">{trainingContext.blockName} — {trainingContext.phaseName} (Week {trainingContext.weekInPhase}/{trainingContext.totalWeeksInPhase})</span>
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Tools & Features</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {moreItems.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 hover:border-red-500/50 hover:bg-neutral-800 transition-all text-gray-400 hover:text-red-400"
            >
              {item.icon}
              <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'form' && (
              <button onClick={() => setView('form')} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Dumbbell size={22} className="text-red-500" />
              <span className="text-white">Strength</span>
              <span className="text-red-500">Architect</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('notifications')} className="p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={18} />
            </button>
            <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Nav Bar */}
      <nav className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                view === item.view
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === 'form' && renderForm()}

        {view === 'loading' && <LoadingView />}

        {view === 'result' && currentPlan && (
          <div className="space-y-6">
            <WorkoutCard plan={currentPlan} gymSetup={gymSetup} />
            <div className="flex gap-3">
              <button
                onClick={() => setView('session')}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
              >
                🏋️ Start Session
              </button>
              <button
                onClick={() => setView('form')}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
              >
                New Workout
              </button>
            </div>
            {currentSavedWorkout && (
              <FeedbackSection
                workoutId={currentSavedWorkout.id}
                existingFeedback={currentSavedWorkout.feedback}
                onSaveFeedback={handleSaveFeedback}
              />
            )}
          </div>
        )}

        {view === 'session' && currentSavedWorkout && (
          <WorkoutSession
            workout={currentSavedWorkout}
            gymSetup={gymSetup}
            audioMuted={audioMuted}
            onAudioMutedChange={handleAudioMutedChange}
            onComplete={(sets, rpe) => handleSaveSession(currentSavedWorkout.id, sets, rpe)}
            onCancel={() => setView('result')}
          />
        )}

        {view === 'history' && (
          <HistoryView
            history={history}
            onDelete={handleDeleteWorkout}
            onSelect={(workout) => { setCurrentPlan(workout); setView('result'); }}
          />
        )}

        {view === 'dashboard' && (
          <DashboardView history={history} liftRecords={liftRecords} goals={goals} sleepEntries={sleepEntries} />
        )}

        {view === 'training-blocks' && (
          <TrainingBlockView
            blocks={trainingBlocks}
            onSave={async (block) => {
              const exists = trainingBlocks.find(b => b.id === block.id);
              const updated = exists
                ? trainingBlocks.map(b => b.id === block.id ? block : b)
                : [...trainingBlocks, block];
              // Deactivate others if this one is active
              const final = block.isActive
                ? updated.map(b => b.id === block.id ? b : { ...b, isActive: false })
                : updated;
              setTrainingBlocks(final);
              if (user) {
                for (const b of final) syncTrainingBlockToCloud(b, user.id).catch(console.error);
              }
            }}
            onDelete={async (id) => {
              setTrainingBlocks(prev => prev.filter(b => b.id !== id));
              if (user) deleteTrainingBlockFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'lift-records' && (
          <LiftRecordsView
            records={liftRecords}
            onSave={async (record) => {
              setLiftRecords(prev => [record, ...prev]);
              if (user) syncLiftRecordToCloud(record, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setLiftRecords(prev => prev.filter(r => r.id !== id));
              if (user) deleteLiftRecordFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'body-comp' && (
          <BodyCompTrackerView
            entries={bodyCompEntries}
            onSave={async (entry) => {
              setBodyCompEntries(prev => [entry, ...prev]);
              if (user) syncBodyCompToCloud(entry, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setBodyCompEntries(prev => prev.filter(e => e.id !== id));
              if (user) deleteBodyCompFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'recovery' && (
          <RecoveryAdvisorView history={history} sleepEntries={sleepEntries} />
        )}

        {view === 'calendar' && (
          <TrainingCalendarView
            scheduled={scheduledWorkouts}
            history={history}
            onSave={async (sw) => {
              const exists = scheduledWorkouts.find(s => s.id === sw.id);
              setScheduledWorkouts(prev => exists ? prev.map(s => s.id === sw.id ? sw : s) : [...prev, sw]);
              if (user) syncScheduledWorkoutToCloud(sw, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setScheduledWorkouts(prev => prev.filter(s => s.id !== id));
              if (user) deleteScheduledWorkoutFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'achievements' && <AchievementsView history={history} liftRecords={liftRecords} />}
        {view === 'sleep' && (
          <SleepJournalView
            entries={sleepEntries}
            onSave={async (entry) => {
              setSleepEntries(prev => [entry, ...prev]);
              if (user) syncSleepEntryToCloud(entry, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setSleepEntries(prev => prev.filter(e => e.id !== id));
              if (user) deleteSleepEntryFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}
        {view === 'goals' && (
          <GoalSettingView
            goals={goals}
            onSave={async (goal) => {
              const exists = goals.find(g => g.id === goal.id);
              setGoals(prev => exists ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]);
              if (user) syncGoalToCloud(goal, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setGoals(prev => prev.filter(g => g.id !== id));
              if (user) deleteGoalFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}
        {view === 'strength-test' && (
          <StrengthTestView
            tests={strengthTests}
            weightLbs={formData.weightLbs}
            onSave={async (result) => {
              setStrengthTests(prev => [result, ...prev]);
              // Update 1RMs in form data
              const exerciseIdTo1RMKey: Record<string, keyof FormData> = {
                'back_squat': 'squat1RM',
                'bench_press': 'benchPress1RM',
                'conventional_deadlift': 'deadlift1RM',
                'overhead_press': 'overheadPress1RM',
              };
              const key = exerciseIdTo1RMKey[result.exerciseId];
              if (key) {
                setFormData(prev => ({ ...prev, [key]: result.estimated1RM }));
                // Persist to user metadata
                if (user) {
                  supabase.auth.updateUser({ data: { [key]: result.estimated1RM } }).catch(console.error);
                }
              }
              if (user) syncStrengthTestToCloud(result, user.id).catch(console.error);
            }}
          />
        )}
        {view === 'export' && <ExportView history={history} />}
        {view === 'custom-templates' && (
          <CustomTemplateBuilder
            templates={customTemplates}
            onSave={async (template) => {
              const exists = customTemplates.find(t => t.id === template.id);
              setCustomTemplates(prev => exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template]);
              if (user) syncCustomTemplateToCloud(template, user.id).catch(console.error);
            }}
            onDelete={async (id) => {
              setCustomTemplates(prev => prev.filter(t => t.id !== id));
              if (user) deleteCustomTemplateFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}
        {view === 'gym-setup' && (
          <GymSetupView gymSetup={gymSetup} onSave={handleGymSetupChange} />
        )}
        {view === 'optimizer' && (
          <OptimizerView
            config={optimizerConfig}
            onChange={handleOptimizerConfigChange}
            history={history}
            liftRecords={liftRecords}
          />
        )}
        {view === 'training-load' && <TrainingLoadView history={history} />}
        {view === 'warmup-cooldown' && <WarmupCooldownView />}
        {view === 'rpe-calibration' && <RPECalibrationView />}
        {view === 'plate-calculator' && <PlateCalculatorView gymSetup={gymSetup} />}
        {view === 'notifications' && (
          <NotificationCenterView
            history={history}
            liftRecords={liftRecords}
            sleepEntries={sleepEntries}
            goals={goals}
            dismissedAlertIds={dismissedAlertIds}
            onDismissAlert={handleDismissAlert}
            onClearDismissed={handleClearDismissed}
          />
        )}
        {view === 'report-cards' && <ReportCardsView history={history} liftRecords={liftRecords} goals={goals} />}
        {view === 'exercise-library' && <ExerciseLibraryView />}
        {view === 'superset-builder' && <SupersetBuilderView />}
      </main>
    </div>
  );
};

export default App;
