import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReadinessLevel, TrainingExperience, AvailableEquipment, TrainingGoalFocus,
  FormData, StrengthWorkoutPlan, SavedWorkout, CompletedSet, FeedbackData,
  TrainingBlock, TrainingBlockPhase, TrainingPhase, LiftRecord, BodyCompEntry,
  ScheduledWorkout, SleepEntry, TrainingGoal, CustomTemplate, StrengthTestResult,
  GymSetup, DEFAULT_GYM_SETUP, OptimizerConfig, DEFAULT_OPTIMIZER_CONFIG,
  OptimizerRecommendations, Achievement, AppMode, CoachClient,
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
  syncCoachClientToCloud, fetchCoachClientsFromCloud, deleteCoachClientFromCloud,
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
import TrainingCalendarView from './components/TrainingCalendarView';
import GoalSettingView from './components/GoalSettingView';
import StrengthTestView from './components/StrengthTestView';
import CustomTemplateBuilder from './components/CustomTemplateBuilder';
import GymSetupView from './components/GymSetupView';
import PlateCalculatorView from './components/PlateCalculatorView';
import ExerciseLibraryView from './components/ExerciseLibraryView';
import TrackingView from './components/TrackingView';
import NotificationCenterView from './components/NotificationCenterView';
import PlanView from './components/PlanView';
import LiftView from './components/LiftView';
import { WorkoutWizard } from './components/wizard';
import { BlockWizard } from './components/block-wizard';
import OnboardingView from './components/OnboardingView';
import SessionRecapView from './components/SessionRecapView';
import ModeSelectionView from './components/ModeSelectionView';
import ClientRosterView from './components/ClientRosterView';
import ClientFormModal from './components/ClientFormModal';
import { computeOptimizerRecommendations } from './services/optimizerEngine';

import ErrorBoundary from './components/ErrorBoundary';

import { Dumbbell, BarChart3, Calendar, Target, Activity, Bell, ChevronLeft, LogOut, Wrench, Calculator, BookOpen, Layers, LayoutList, Plus, Users } from 'lucide-react';

type ViewState =
  | 'form'
  | 'loading'
  | 'result'
  | 'session'
  | 'session-recap'
  | 'history'
  | 'dashboard'
  | 'training-blocks'
  | 'lift-records'
  | 'calendar'
  | 'goals'
  | 'strength-test'
  | 'custom-templates'
  | 'gym-setup'
  | 'plate-calculator'
  | 'exercise-library'
  | 'tracking'
  | 'notifications'
  | 'block-wizard'
  | 'plan'
  | 'lift'
  | 'analyze';

const App: React.FC = () => {
  // ===== AUTH =====
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ===== VIEW =====
  const [view, setView] = useState<ViewState>('lift');

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavedWorkout[]>([]);
  const [error, setError] = useState<string>('');
  const [lastSessionPRs, setLastSessionPRs] = useState<LiftRecord[]>([]);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);

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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ===== COACH MODE STATE =====
  const [appMode, setAppMode] = useState<AppMode | null>(() => {
    const stored = localStorage.getItem('sa_app_mode');
    return stored === 'lifter' || stored === 'coach' ? stored : null;
  });
  const [coachClients, setCoachClients] = useState<CoachClient[]>([]);
  const [activeClient, setActiveClient] = useState<CoachClient | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<CoachClient | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Effective client ID for all scoped data operations
  const cid = useMemo(() =>
    appMode === 'coach' && activeClient ? activeClient.id : undefined,
    [appMode, activeClient]
  );

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

  // ===== PHASE 1: LOAD USER PREFERENCES =====
  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      try {
        const [prefs, dismissed] = await Promise.all([
          fetchUserPreferencesFromCloud(user.id),
          fetchDismissedAlertsFromCloud(user.id),
        ]);
        if (prefs.gymSetup) setGymSetup(prefs.gymSetup);
        if (prefs.optimizerConfig) setOptimizerConfig(prefs.optimizerConfig);
        if (prefs.audioMuted !== undefined) setAudioMuted(prefs.audioMuted);
        // Restore saved mode if localStorage is empty
        if (!appMode && prefs.appMode) {
          setAppMode(prefs.appMode as AppMode);
          localStorage.setItem('sa_app_mode', prefs.appMode);
        }
        setDismissedAlertIds(dismissed);

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
        setPrefsLoaded(true);
      } catch (err) {
        console.error('Error loading preferences:', err);
        setPrefsLoaded(true);
      }
    };
    loadPrefs();
  }, [user]);

  // ===== PHASE 2: LOAD COACH CLIENTS (coach mode only) =====
  useEffect(() => {
    if (!user || appMode !== 'coach') return;
    setClientsLoading(true);
    fetchCoachClientsFromCloud(user.id)
      .then(setCoachClients)
      .catch(console.error)
      .finally(() => setClientsLoading(false));
  }, [user, appMode]);

  // ===== PHASE 3: LOAD TRAINING DATA (scoped by client in coach mode) =====
  useEffect(() => {
    if (!user || !prefsLoaded) return;
    if (appMode === null) return;
    if (appMode === 'coach' && !activeClient) return;

    const clientId = appMode === 'coach' ? activeClient!.id : undefined;

    const loadTrainingData = async () => {
      try {
        const [
          workouts, blocks, lifts, bodyComp, scheduled, sleep, goalsData,
          tests, templates,
        ] = await Promise.all([
          fetchWorkoutsFromCloud(user.id, clientId),
          fetchTrainingBlocksFromCloud(user.id, clientId),
          fetchLiftRecordsFromCloud(user.id, clientId),
          fetchBodyCompFromCloud(user.id, clientId),
          fetchScheduledWorkoutsFromCloud(user.id, clientId),
          fetchSleepEntriesFromCloud(user.id, clientId),
          fetchGoalsFromCloud(user.id, clientId),
          fetchStrengthTestsFromCloud(user.id, clientId),
          fetchCustomTemplatesFromCloud(user.id, clientId),
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

        // In coach mode, populate form data from client profile
        if (appMode === 'coach' && activeClient) {
          setFormData(prev => ({
            ...prev,
            weightLbs: activeClient.weightLbs,
            age: activeClient.age,
            gender: activeClient.gender,
            trainingExperience: activeClient.experience,
            availableEquipment: activeClient.equipment,
          }));
        }

        // Show onboarding for empty data scopes
        if (blocks.length === 0 && workouts.length === 0) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('Error loading training data:', err);
      }
    };
    loadTrainingData();
  }, [user, prefsLoaded, appMode, activeClient?.id]);

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
    setIsGenerating(true);
    setCurrentPlan(null);
    initAudio();

    try {
      // Get active block context
      const activeBlock = trainingBlocks.find(b => b.isActive);
      const exercisePrefs = activeBlock?.exercisePreferences || null;

      // Map goalBias (0=hypertrophy, 100=strength) to trainingGoalFocus
      const bias = activeBlock?.goalBias ?? 50;
      const biasGoal: typeof formData.trainingGoalFocus =
        bias < 30 ? 'hypertrophy' :
        bias > 70 ? 'strength' : 'general';
      const biasedFormData = { ...formData, trainingGoalFocus: biasGoal };

      // Optimizer always active — computes volume, intensity, fatigue, metabolic stress
      const volTol = activeBlock?.volumeTolerance ?? 3;
      const optimizerRecs = computeOptimizerRecommendations(
        optimizerConfig,
        biasedFormData,
        history,
        trainingContext,
        volTol,
      );

      const plan = await generateWorkout(biasedFormData, history, trainingContext, optimizerRecs, exercisePrefs, bias, volTol);
      setCurrentPlan(plan);

      const saved: SavedWorkout = {
        ...plan,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      const newHistory = [saved, ...history];
      setHistory(newHistory);

      if (user) {
        syncWorkoutToCloud(saved, user.id, cid).catch(console.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate workout.');
    } finally {
      setIsGenerating(false);
    }
  }, [formData, history, trainingContext, optimizerConfig, user, trainingBlocks, cid]);

  // ===== SAVE FEEDBACK =====
  const handleSaveFeedback = useCallback(async (workoutId: string, feedback: FeedbackData) => {
    const updated = history.map(w =>
      w.id === workoutId ? { ...w, feedback } : w
    );
    setHistory(updated);

    if (user) {
      const workout = updated.find(w => w.id === workoutId);
      if (workout) syncWorkoutToCloud(workout, user.id, cid).catch(console.error);
    }
  }, [history, user, cid]);

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
          syncLiftRecordToCloud(r, user.id, cid).catch(console.error);
        }
      }
    }

    if (user) {
      const workout = updated.find(w => w.id === workoutId);
      if (workout) syncWorkoutToCloud(workout, user.id, cid).catch(console.error);
    }

    // Navigate to session recap
    setLastSessionPRs(newRecords);
    setLastSessionDuration(Math.round((Date.now() - (completedSets[0]?.timestamp || Date.now())) / 1000) || 0);
    setView('session-recap');
  }, [history, liftRecords, user, cid]);

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
      syncUserPreferencesToCloud({ gymSetup: setup, optimizerConfig, audioMuted, appMode: appMode || undefined }, user.id).catch(console.error);
    }
  }, [user, optimizerConfig, audioMuted, appMode]);

  const handleOptimizerConfigChange = useCallback(async (config: OptimizerConfig) => {
    setOptimizerConfig(config);
    if (user) {
      syncUserPreferencesToCloud({ gymSetup, optimizerConfig: config, audioMuted, appMode: appMode || undefined }, user.id).catch(console.error);
    }
  }, [user, gymSetup, audioMuted, appMode]);

  const handleAudioMutedChange = useCallback(async (muted: boolean) => {
    setAudioMuted(muted);
    if (user) {
      syncUserPreferencesToCloud({ gymSetup, optimizerConfig, audioMuted: muted, appMode: appMode || undefined }, user.id).catch(console.error);
    }
  }, [user, gymSetup, optimizerConfig, appMode]);

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
    setTrainingBlocks([]);
    setLiftRecords([]);
    setBodyCompEntries([]);
    setScheduledWorkouts([]);
    setSleepEntries([]);
    setGoals([]);
    setStrengthTests([]);
    setCustomTemplates([]);
    setCurrentPlan(null);
    setDataLoaded(false);
    setPrefsLoaded(false);
    setShowOnboarding(false);
    setAppMode(null);
    setCoachClients([]);
    setActiveClient(null);
    localStorage.removeItem('sa_app_mode');
    setView('lift');
  };

  // ===== COACH MODE HANDLERS =====
  const handleSelectMode = useCallback((mode: AppMode) => {
    setAppMode(mode);
    localStorage.setItem('sa_app_mode', mode);
    if (user) {
      syncUserPreferencesToCloud({ gymSetup, optimizerConfig, audioMuted, appMode: mode }, user.id).catch(console.error);
    }
  }, [user, gymSetup, optimizerConfig, audioMuted]);

  const handleSelectClient = useCallback((client: CoachClient) => {
    // Clear stale data before loading new client
    setHistory([]);
    setTrainingBlocks([]);
    setLiftRecords([]);
    setBodyCompEntries([]);
    setScheduledWorkouts([]);
    setSleepEntries([]);
    setGoals([]);
    setStrengthTests([]);
    setCustomTemplates([]);
    setCurrentPlan(null);
    setDataLoaded(false);
    setShowOnboarding(false);
    setActiveClient(client);
    setView('lift');
  }, []);

  const handleBackToRoster = useCallback(() => {
    setHistory([]);
    setTrainingBlocks([]);
    setLiftRecords([]);
    setBodyCompEntries([]);
    setScheduledWorkouts([]);
    setSleepEntries([]);
    setGoals([]);
    setStrengthTests([]);
    setCustomTemplates([]);
    setCurrentPlan(null);
    setDataLoaded(false);
    setShowOnboarding(false);
    setActiveClient(null);
    setView('lift');
  }, []);

  const handleSaveClient = useCallback(async (client: CoachClient) => {
    const exists = coachClients.find(c => c.id === client.id);
    if (exists) {
      setCoachClients(prev => prev.map(c => c.id === client.id ? client : c));
    } else {
      setCoachClients(prev => [...prev, client]);
    }
    if (user) {
      syncCoachClientToCloud(client, user.id).catch(console.error);
    }
    setShowClientForm(false);
    setEditingClient(null);
    // Update active client if editing the current one
    if (activeClient?.id === client.id) setActiveClient(client);
  }, [coachClients, user, activeClient]);

  const handleDeleteClient = useCallback(async (id: string) => {
    setCoachClients(prev => prev.filter(c => c.id !== id));
    if (user) deleteCoachClientFromCloud(id, user.id).catch(console.error);
    if (activeClient?.id === id) handleBackToRoster();
    setShowClientForm(false);
    setEditingClient(null);
  }, [user, activeClient, handleBackToRoster]);

  // ===== AUTH GATE =====
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <Dumbbell size={28} className="text-amber-500" />
          <span className="text-xl font-bold text-white">Strength <span className="text-amber-500">Architect</span></span>
        </div>
        <div className="space-y-3 w-64">
          <div className="h-3 bg-neutral-800 rounded-full animate-pulse" />
          <div className="h-3 bg-neutral-800 rounded-full animate-pulse w-4/5" />
          <div className="h-3 bg-neutral-800 rounded-full animate-pulse w-3/5" />
        </div>
        <p className="text-xs text-gray-500">Loading your training data…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // ===== MODE SELECTION GATE =====
  if (!prefsLoaded) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <Dumbbell size={28} className="text-amber-500" />
          <span className="text-xl font-bold text-white">Strength <span className="text-amber-500">Architect</span></span>
        </div>
        <div className="space-y-3 w-64">
          <div className="h-3 bg-neutral-800 rounded-full animate-pulse" />
          <div className="h-3 bg-neutral-800 rounded-full animate-pulse w-4/5" />
        </div>
      </div>
    );
  }
  if (appMode === null) {
    return <ModeSelectionView onSelectMode={handleSelectMode} />;
  }

  // ===== COACH: CLIENT ROSTER GATE =====
  if (appMode === 'coach' && !activeClient) {
    return (
      <>
        <ClientRosterView
          clients={coachClients}
          clientsLoading={clientsLoading}
          onSelectClient={handleSelectClient}
          onAddClient={() => { setEditingClient(null); setShowClientForm(true); }}
          onEditClient={(c) => { setEditingClient(c); setShowClientForm(true); }}
          onDeleteClient={handleDeleteClient}
          onSwitchMode={() => handleSelectMode('lifter')}
          onSignOut={handleSignOut}
        />
        {showClientForm && (
          <ClientFormModal
            client={editingClient}
            onSave={handleSaveClient}
            onClose={() => { setShowClientForm(false); setEditingClient(null); }}
            onDelete={handleDeleteClient}
          />
        )}
      </>
    );
  }

  // ===== ONBOARDING GATE =====
  if (showOnboarding && dataLoaded) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center px-4 py-12">
        <OnboardingView
          onComplete={async (data) => {
            setFormData(prev => ({
              ...prev,
              trainingExperience: data.experience,
              availableEquipment: data.equipment,
              weightLbs: data.weightLbs,
              age: data.age,
              gender: data.gender,
            }));
            setGymSetup(prev => ({ ...prev, availableEquipment: data.equipment }));

            // Save the block
            setTrainingBlocks([data.block]);
            if (user) {
              syncTrainingBlockToCloud(data.block, user.id, cid).catch(console.error);
              syncUserPreferencesToCloud({
                gymSetup: { ...gymSetup, availableEquipment: data.equipment },
                optimizerConfig,
                audioMuted,
                appMode: appMode || undefined,
              }, user.id).catch(console.error);
              if (appMode !== 'coach') {
                supabase.auth.updateUser({
                  data: { weightLbs: data.weightLbs, age: data.age, gender: data.gender },
                }).catch(console.error);
              }
            }

            setShowOnboarding(false);
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  // ===== LATEST WORKOUT =====
  const latestWorkout = history[0] || null;
  const currentSavedWorkout = latestWorkout && currentPlan && latestWorkout.title === currentPlan.title ? latestWorkout : null;

  // ===== NAV — 3 primary tabs =====
  type PrimaryTab = 'plan' | 'lift' | 'analyze';

  /** Which tab owns each sub-view */
  const tabForView: Record<ViewState, PrimaryTab> = {
    // PLAN
    'block-wizard': 'plan', 'training-blocks': 'plan', 'custom-templates': 'plan',
    'goals': 'plan', 'gym-setup': 'plan', 'calendar': 'plan',
    // LIFT
    'form': 'lift', 'loading': 'lift', 'result': 'lift', 'session': 'lift', 'session-recap': 'lift',
    'plate-calculator': 'lift', 'exercise-library': 'lift', 'strength-test': 'lift',
    // ANALYZE
    'dashboard': 'analyze', 'history': 'analyze', 'lift-records': 'analyze',
    'tracking': 'analyze', 'notifications': 'analyze',
    // Hubs
    'plan': 'plan', 'lift': 'lift', 'analyze': 'analyze',
  };

  const activeTab: PrimaryTab = tabForView[view] || 'lift';

  const primaryTabs: { id: PrimaryTab; label: string; icon: React.ReactNode; defaultView: ViewState }[] = [
    { id: 'plan',    label: 'Plan',    icon: <Layers size={18} />,   defaultView: 'plan' },
    { id: 'lift',    label: 'Lift',    icon: <Dumbbell size={18} />, defaultView: 'lift' },
    { id: 'analyze', label: 'Analyze', icon: <BarChart3 size={18} />, defaultView: 'analyze' },
  ];

  /** Secondary links shown below PlanView */
  const planSecondaryItems: { label: string; view: ViewState; icon: React.ReactNode }[] = [
    { label: 'My Blocks',        view: 'training-blocks', icon: <Layers size={16} /> },
    { label: 'Calendar',         view: 'calendar',        icon: <Calendar size={16} /> },
    { label: 'Goals',            view: 'goals',           icon: <Target size={16} /> },
    { label: 'Gym Setup',        view: 'gym-setup',       icon: <Wrench size={16} /> },
  ];

  const analyzeSubItems: { label: string; view: ViewState; icon: React.ReactNode }[] = [
    { label: 'Dashboard',      view: 'dashboard',     icon: <BarChart3 size={16} /> },
    { label: 'History',         view: 'history',        icon: <Activity size={16} /> },
    { label: 'Lift Records',    view: 'lift-records',   icon: <Dumbbell size={16} /> },
    { label: 'Tracking',        view: 'tracking',       icon: <Target size={16} /> },
  ];

  const subItemsForTab: Record<PrimaryTab, typeof analyzeSubItems> = {
    plan: planSecondaryItems,
    lift: [],
    analyze: analyzeSubItems,
  };

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!['plan', 'lift', 'analyze'].includes(view) && (
              <button
                onClick={() => {
                  const hub = activeTab;
                  setView(hub as ViewState);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Dumbbell size={22} className="text-amber-500" />
              <span className="text-white">Strength</span>
              <span className="text-amber-500">Architect</span>
            </h1>
            {appMode === 'coach' && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">Coach</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('notifications')} className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={18} />
            </button>
            <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-amber-400 transition-colors" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Coach: Client Banner */}
      {appMode === 'coach' && activeClient && (
        <div className="bg-blue-500/5 border-b border-blue-500/20">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: (activeClient.avatarColor || '#3b82f6') + '20',
                  color: activeClient.avatarColor || '#3b82f6',
                }}
              >
                {activeClient.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-blue-300">
                Training: <span className="text-white">{activeClient.name}</span>
              </span>
            </div>
            <button
              onClick={handleBackToRoster}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              ← All Athletes
            </button>
          </div>
        </div>
      )}

      {/* 3-Tab Nav Bar */}
      <nav className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 flex justify-around">
          {primaryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.defaultView)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ErrorBoundary>

        {/* ── HUB VIEWS ─────────────────────────────────────── */}
        {/* PLAN tab — PlanView inline + secondary links */}
        {view === 'plan' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <PlanView
              block={trainingBlocks.find(b => b.isActive) || null}
              estimatedMaxes={{
                squat1RM: formData.squat1RM,
                benchPress1RM: formData.benchPress1RM,
                deadlift1RM: formData.deadlift1RM,
                overheadPress1RM: formData.overheadPress1RM,
              }}
              onMaxesChange={(maxes) => {
                setFormData(prev => ({ ...prev, ...maxes }));
                if (user && appMode !== 'coach') {
                  supabase.auth.updateUser({ data: maxes }).catch(console.error);
                }
              }}
              onSave={async (block) => {
                const exists = trainingBlocks.find(b => b.id === block.id);
                const updated = exists
                  ? trainingBlocks.map(b => b.id === block.id ? block : b)
                  : [...trainingBlocks, block];
                const final = block.isActive
                  ? updated.map(b => b.id === block.id ? b : { ...b, isActive: false })
                  : updated;
                setTrainingBlocks(final);
                if (user) {
                  for (const b of final) syncTrainingBlockToCloud(b, user.id, cid).catch(console.error);
                }
              }}
              onNavigateToLift={() => setView('lift')}
            />
            {/* Secondary links */}
            <div className="border-t border-neutral-800 pt-6">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">More</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {planSecondaryItems.map(item => (
                  <button
                    key={item.view}
                    onClick={() => setView(item.view)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-amber-500/50 hover:bg-neutral-800 transition-all text-gray-400 hover:text-amber-400 text-xs font-medium"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIFT tab — LiftView inline + secondary links */}
        {view === 'lift' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <LiftView
              activeBlock={trainingBlocks.find(b => b.isActive) || null}
              currentPlan={currentPlan}
              currentWorkout={currentSavedWorkout}
              gymSetup={gymSetup}
              readiness={formData.readiness}
              isGenerating={isGenerating}
              error={error}
              onReadinessChange={(r) => setFormData(prev => ({ ...prev, readiness: r }))}
              onGenerate={handleGenerate}
              onStartSession={() => setView('session')}
              onNewWorkout={() => setCurrentPlan(null)}
              onSaveFeedback={handleSaveFeedback}
              onNavigatePlan={() => setView('plan')}
            />
          </div>
        )}

        {/* ANALYZE hub — inline stats + sub-links */}
        {view === 'analyze' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Analyze</h2>
              <p className="text-sm text-gray-400 mb-5">Review progress, records, and analytics.</p>
            </div>

            {/* Quick stats bar */}
            {(() => {
              const now = Date.now();
              const weekAgo = now - 7 * 86400000;
              const monthAgo = now - 30 * 86400000;
              const thisWeek = history.filter(w => w.timestamp > weekAgo);
              const thisMonth = history.filter(w => w.timestamp > monthAgo);
              const weekTonnage = thisWeek.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
              const topLifts: Record<string, number> = {};
              for (const r of liftRecords) {
                if (!topLifts[r.exerciseId] || r.estimated1RM > topLifts[r.exerciseId]) topLifts[r.exerciseId] = r.estimated1RM;
              }
              const bigFourTotal = (topLifts['back_squat'] || 0) + (topLifts['bench_press'] || 0) + (topLifts['conventional_deadlift'] || 0) + (topLifts['overhead_press'] || 0);

              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{thisWeek.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Sessions/wk</p>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{weekTonnage > 0 ? (weekTonnage / 1000).toFixed(0) + 'k' : '0'}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Wk Tonnage</p>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{bigFourTotal > 0 ? Math.round(bigFourTotal) : '—'}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Est. Total</p>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analyzeSubItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-amber-500/50 hover:bg-neutral-800 transition-all text-gray-400 hover:text-amber-400 group"
                >
                  <span className="p-2.5 rounded-lg bg-neutral-700/50 group-hover:bg-amber-500/10 transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SUB-VIEWS ─────────────────────────────────────── */}
        {view === 'form' && (
          <WorkoutWizard
            formData={formData}
            setFormData={setFormData}
            trainingContext={trainingContext}
            optimizerConfig={optimizerConfig}
            onGenerate={handleGenerate}
            isGenerating={view === 'loading'}
            error={error}
          />
        )}

        {view === 'block-wizard' && (
          <BlockWizard
            existingBlocks={trainingBlocks}
            onCreateBlock={async (block) => {
              const updated = block.isActive
                ? [...trainingBlocks.map(b => ({ ...b, isActive: false })), block]
                : [...trainingBlocks, block];
              setTrainingBlocks(updated);
              if (user) {
                for (const b of updated) syncTrainingBlockToCloud(b, user.id, cid).catch(console.error);
              }
            }}
            onScheduleWorkouts={async (workouts) => {
              setScheduledWorkouts(prev => [...prev, ...workouts]);
              if (user) {
                for (const w of workouts) syncScheduledWorkoutToCloud(w, user.id, cid).catch(console.error);
              }
            }}
            onComplete={() => setView('training-blocks')}
            onCancel={() => setView('plan')}
          />
        )}

        {view === 'loading' && <LoadingView />}

        {view === 'result' && currentPlan && (
          <div className="space-y-6">
            <WorkoutCard plan={currentPlan} gymSetup={gymSetup} />
            <div className="flex gap-3">
              <button
                onClick={() => setView('session')}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all"
              >
                🏋️ Start Session
              </button>
              <button
                onClick={() => setView('lift')}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
              >
                Back to Lift
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
            onCancel={() => setView('lift')}
          />
        )}

        {view === 'session-recap' && currentSavedWorkout && (
          <ErrorBoundary fallbackMessage="Could not display session recap.">
            <SessionRecapView
              workout={currentSavedWorkout}
              newPRs={lastSessionPRs}
              sessionDurationSec={lastSessionDuration}
              onContinue={() => { setCurrentPlan(null); setView('lift'); }}
              onViewHistory={() => setView('history')}
            />
          </ErrorBoundary>
        )}

        {view === 'history' && (
          <HistoryView
            history={history}
            onDelete={handleDeleteWorkout}
            onSelect={(workout) => { setCurrentPlan(workout); setView('result'); }}
          />
        )}

        {view === 'dashboard' && (
          <DashboardView history={history} liftRecords={liftRecords} goals={goals} sleepEntries={sleepEntries} dismissedAlertIds={dismissedAlertIds} onDismissAlert={handleDismissAlert} />
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
                for (const b of final) syncTrainingBlockToCloud(b, user.id, cid).catch(console.error);
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
              if (user) syncLiftRecordToCloud(record, user.id, cid).catch(console.error);
            }}
            onDelete={async (id) => {
              setLiftRecords(prev => prev.filter(r => r.id !== id));
              if (user) deleteLiftRecordFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'calendar' && (
          <TrainingCalendarView
            scheduled={scheduledWorkouts}
            history={history}
            onSave={async (sw) => {
              const exists = scheduledWorkouts.find(s => s.id === sw.id);
              setScheduledWorkouts(prev => exists ? prev.map(s => s.id === sw.id ? sw : s) : [...prev, sw]);
              if (user) syncScheduledWorkoutToCloud(sw, user.id, cid).catch(console.error);
            }}
            onDelete={async (id) => {
              setScheduledWorkouts(prev => prev.filter(s => s.id !== id));
              if (user) deleteScheduledWorkoutFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}

        {view === 'goals' && (
          <GoalSettingView
            goals={goals}
            onSave={async (goal) => {
              const exists = goals.find(g => g.id === goal.id);
              setGoals(prev => exists ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]);
              if (user) syncGoalToCloud(goal, user.id, cid).catch(console.error);
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
              const exerciseIdTo1RMKey: Record<string, keyof FormData> = {
                'back_squat': 'squat1RM',
                'bench_press': 'benchPress1RM',
                'conventional_deadlift': 'deadlift1RM',
                'overhead_press': 'overheadPress1RM',
              };
              const key = exerciseIdTo1RMKey[result.exerciseId];
              if (key) {
                setFormData(prev => ({ ...prev, [key]: result.estimated1RM }));
                if (user && appMode !== 'coach') {
                  supabase.auth.updateUser({ data: { [key]: result.estimated1RM } }).catch(console.error);
                }
              }
              if (user) syncStrengthTestToCloud(result, user.id, cid).catch(console.error);
            }}
          />
        )}
        {view === 'custom-templates' && (
          <CustomTemplateBuilder
            templates={customTemplates}
            onSave={async (template) => {
              const exists = customTemplates.find(t => t.id === template.id);
              setCustomTemplates(prev => exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template]);
              if (user) syncCustomTemplateToCloud(template, user.id, cid).catch(console.error);
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
        {view === 'plate-calculator' && <PlateCalculatorView gymSetup={gymSetup} />}
        {view === 'exercise-library' && <ExerciseLibraryView />}
        {view === 'tracking' && (
          <TrackingView
            sleepEntries={sleepEntries}
            onSaveSleep={async (entry) => {
              setSleepEntries(prev => [entry, ...prev]);
              if (user) syncSleepEntryToCloud(entry, user.id, cid).catch(console.error);
            }}
            onDeleteSleep={async (id) => {
              setSleepEntries(prev => prev.filter(e => e.id !== id));
              if (user) deleteSleepEntryFromCloud(id, user.id).catch(console.error);
            }}
            bodyCompEntries={bodyCompEntries}
            onSaveBodyComp={async (entry) => {
              setBodyCompEntries(prev => [entry, ...prev]);
              if (user) syncBodyCompToCloud(entry, user.id, cid).catch(console.error);
            }}
            onDeleteBodyComp={async (id) => {
              setBodyCompEntries(prev => prev.filter(e => e.id !== id));
              if (user) deleteBodyCompFromCloud(id, user.id).catch(console.error);
            }}
          />
        )}
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
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default App;
