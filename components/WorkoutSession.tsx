import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SavedWorkout, CompletedSet, GymSetup, ExerciseBlock } from '../shared/types';
import { formatTime, formatPlateLoading, estimate1RM } from '../shared/utils';
import { playBeep, initAudio } from '../shared/utils/audioManager';
import { calculatePlateLoading } from '../shared/utils/plateCalculator';
import { Play, Pause, SkipForward, Check, Volume2, VolumeX, X } from 'lucide-react';

interface Props {
  workout: SavedWorkout;
  gymSetup?: GymSetup;
  audioMuted?: boolean;
  onAudioMutedChange?: (muted: boolean) => void;
  /** When true, after each set the app prompts for set RPE and may suggest reducing weight for remaining sets. */
  intraSessionAutoregulation?: boolean;
  onComplete: (sets: CompletedSet[], sessionRPE: number) => void;
  onCancel: () => void;
}

interface SetEntry {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: string;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
  rpe?: number;
  completed: boolean;
  /** Myo-Rep role: 'activation' for the initial high-rep set, 'mini' for follow-up mini-sets */
  myoRepRole?: 'activation' | 'mini';
}

const WorkoutSession: React.FC<Props> = ({
  workout, gymSetup, audioMuted, onAudioMutedChange,
  intraSessionAutoregulation = false,
  onComplete, onCancel,
}) => {
  const barWeight = gymSetup?.barbellWeightLbs || 45;

  // Build flat list of all sets from exercises
  // Myo-Rep exercises expand into 1 activation set + up to 5 mini-sets
  const allSets = React.useMemo(() => {
    const sets: SetEntry[] = [];
    for (const ex of workout.exercises) {
      if (ex.setProtocol === 'myo-reps') {
        // Activation set: use the reps field (e.g. "12-15 + up to 5x3-5")
        // Extract just the activation portion for the target
        const activationTarget = ex.reps.split('+')[0]?.trim() || ex.reps;
        sets.push({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          setNumber: 1,
          targetReps: activationTarget,
          targetWeight: ex.weightLbs || 0,
          actualReps: 0,
          actualWeight: ex.weightLbs || 0,
          rpe: undefined,
          completed: false,
          myoRepRole: 'activation',
        });
        // Mini-sets: 5 slots (user can finish early if reps drop)
        for (let m = 1; m <= 5; m++) {
          sets.push({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            setNumber: m + 1,
            targetReps: '3-5',
            targetWeight: ex.weightLbs || 0,
            actualReps: 0,
            actualWeight: ex.weightLbs || 0,
            rpe: undefined,
            completed: false,
            myoRepRole: 'mini',
          });
        }
      } else {
        for (let s = 1; s <= ex.sets; s++) {
          sets.push({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            setNumber: s,
            targetReps: ex.reps,
            targetWeight: ex.weightLbs || 0,
            actualReps: 0,
            actualWeight: ex.weightLbs || 0,
            rpe: undefined,
            completed: false,
          });
        }
      }
    }
    return sets;
  }, [workout]);

  const [sets, setSets] = useState<SetEntry[]>(allSets);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [sessionRPE, setSessionRPE] = useState(7);
  const [showFinish, setShowFinish] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFinishEarlyConfirm, setShowFinishEarlyConfirm] = useState(false);
  const [showSetRPEPrompt, setShowSetRPEPrompt] = useState(false);
  const [autoregSuggestion, setAutoregSuggestion] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const muted = audioMuted ?? false;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Rest timer
  useEffect(() => {
    if (!restTimerActive || restTimeRemaining <= 0) {
      if (restTimerActive && restTimeRemaining <= 0) {
        if (!muted) {
          playBeep(880, 'sine', 0.3);
          setTimeout(() => playBeep(880, 'sine', 0.3), 400);
        }
        setRestTimerActive(false);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          setRestTimerActive(false);
          return 0;
        }
        // Beep at 3, 2, 1
        if (prev <= 4 && !muted) {
          playBeep(660, 'sine', 0.1);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restTimerActive, restTimeRemaining, muted]);

  // Get current exercise for rest time
  const getCurrentExercise = (): ExerciseBlock | undefined => {
    const currentSet = sets[currentSetIndex];
    if (!currentSet) return undefined;
    return workout.exercises.find(e => e.exerciseId === currentSet.exerciseId);
  };

  const proceedAfterSetComplete = useCallback(() => {
    const currentSet = sets[currentSetIndex];
    const exercise = currentSet ? workout.exercises.find(e => e.exerciseId === currentSet.exerciseId) : undefined;
    if (exercise && currentSetIndex < sets.length - 1) {
      setRestTimeRemaining(exercise.restSeconds || 90);
      setRestTimerActive(true);
      if (!muted) playBeep(440, 'sine', 0.15);
    }
    if (currentSetIndex < sets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      setShowFinish(true);
    }
  }, [currentSetIndex, sets, sets.length, muted, workout.exercises]);

  const handleCompleteSet = useCallback(() => {
    const updated = [...sets];
    const current = updated[currentSetIndex];
    if (!current) return;

    current.completed = true;
    if (current.actualReps === 0) {
      const targetNum = parseInt(current.targetReps) || 5;
      current.actualReps = targetNum;
    }
    setSets(updated);

    if (!intraSessionAutoregulation) {
      proceedAfterSetComplete();
      return;
    }
    setShowSetRPEPrompt(true);
  }, [currentSetIndex, sets, muted, intraSessionAutoregulation, proceedAfterSetComplete]);

  const handleSetRPE = useCallback((rpe: number) => {
    const updated = [...sets];
    const current = updated[currentSetIndex];
    if (current) {
      current.rpe = rpe;
      setSets(updated);
    }
    setShowSetRPEPrompt(false);
    if (rpe >= 8.5) {
      setAutoregSuggestion(`That was heavy (RPE ${rpe}) — consider reducing weight by ~5% for remaining sets of ${current?.exerciseName ?? 'this exercise'}.`);
    } else {
      proceedAfterSetComplete();
    }
  }, [currentSetIndex, sets, proceedAfterSetComplete]);

  const handleSkipSetRPE = useCallback(() => {
    setShowSetRPEPrompt(false);
    proceedAfterSetComplete();
  }, [proceedAfterSetComplete]);

  const handleDismissAutoregSuggestion = useCallback(() => {
    setAutoregSuggestion(null);
    proceedAfterSetComplete();
  }, [proceedAfterSetComplete]);

  const handleFinish = () => {
    const completedSets: CompletedSet[] = sets
      .filter(s => s.completed)
      .map(s => ({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        reps: s.actualReps,
        weightLbs: s.actualWeight,
        rpe: s.rpe,
        timestamp: Date.now(),
      }));
    onComplete(completedSets, sessionRPE);
  };

  const currentSet = sets[currentSetIndex];
  const completedCount = sets.filter(s => s.completed).length;
  const totalTonnage = sets.filter(s => s.completed).reduce((sum, s) => sum + s.actualWeight * s.actualReps, 0);

  // Group sets by exercise for overview
  const exerciseGroups = React.useMemo(() => {
    const groups: { exerciseId: string; exerciseName: string; sets: SetEntry[] }[] = [];
    for (const set of sets) {
      const last = groups[groups.length - 1];
      if (last && last.exerciseId === set.exerciseId) {
        last.sets.push(set);
      } else {
        groups.push({ exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [set] });
      }
    }
    return groups;
  }, [sets]);

  if (showFinish) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">🎉 Session Complete!</h2>
          <p className="text-gray-400">Time: {formatTime(elapsed)} • Sets: {completedCount}/{sets.length} • Tonnage: {totalTonnage.toLocaleString()} lbs</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Session RPE (1-10)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => setSessionRPE(n)}
                className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                  sessionRPE === n
                    ? 'bg-amber-500 text-black'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleFinish}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-lg transition-all"
        >
          Save & Finish
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Session Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">{workout.title}</h2>
            <p className="text-xs text-gray-400">Set {completedCount + 1} of {sets.length} • {formatTime(elapsed)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAudioMutedChange?.(!muted)}
              className="p-2 text-gray-400 hover:text-white"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={() => setShowCancelConfirm(true)} className="p-2 text-gray-400 hover:text-amber-400" aria-label="Cancel session">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(completedCount / sets.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {restTimerActive && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6 text-center">
          <p className="text-blue-300 text-sm font-semibold mb-1">REST</p>
          <p className="text-5xl font-bold text-blue-400 tabular-nums">{formatTime(restTimeRemaining)}</p>
          <button
            onClick={() => { setRestTimerActive(false); setRestTimeRemaining(0); }}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
          >
            <SkipForward size={14} className="inline mr-1" /> Skip Rest
          </button>
        </div>
      )}

      {/* Intra-session: Set RPE prompt (after completing a set) */}
      {showSetRPEPrompt && currentSet && (
        <div className="bg-amber-950/50 border border-amber-700 rounded-xl p-5">
          <p className="text-amber-200 text-sm font-semibold mb-3">How did that set feel?</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => handleSetRPE(n)}
                className="w-12 h-12 rounded-lg bg-neutral-800 hover:bg-amber-600 text-white font-bold text-sm transition-all"
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleSkipSetRPE}
            className="text-gray-400 hover:text-white text-sm"
          >
            Skip
          </button>
        </div>
      )}

      {/* Intra-session: Suggestion (e.g. reduce weight for remaining sets) */}
      {autoregSuggestion && (
        <div className="bg-amber-950/50 border border-amber-600 rounded-xl p-5">
          <p className="text-amber-100 text-sm mb-3">{autoregSuggestion}</p>
          <button
            onClick={handleDismissAutoregSuggestion}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg text-sm"
          >
            Got it
          </button>
        </div>
      )}

      {/* Current Set (hidden while autoreg RPE prompt or suggestion is shown) */}
      {currentSet && !showSetRPEPrompt && !autoregSuggestion && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{currentSet.exerciseName}</h3>
                {currentSet.myoRepRole && (
                  <span className="text-[10px] font-bold bg-purple-500/80 text-white px-1.5 py-0.5 rounded tracking-wide uppercase">
                    Myo-Rep
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {currentSet.myoRepRole === 'activation'
                  ? `Activation Set • Target: ${currentSet.targetReps} reps @ RPE 8`
                  : currentSet.myoRepRole === 'mini'
                    ? `Mini-Set ${currentSet.setNumber - 1} of 5 • Target: ${currentSet.targetReps} reps (${getCurrentExercise()?.restSeconds || 15}s rest)`
                    : `Set ${currentSet.setNumber} • Target: ${currentSet.targetReps} reps`
                }
              </p>
            </div>
          </div>

          {/* Weight & Plate Loading */}
          {currentSet.targetWeight > 0 && (
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <p className="text-white font-bold text-2xl">{currentSet.actualWeight} lbs</p>
              {currentSet.actualWeight > barWeight && (
                <p className="text-gray-400 text-xs mt-1">🏋️ {formatPlateLoading(currentSet.actualWeight, barWeight)}</p>
              )}
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Weight (lbs)</label>
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].actualWeight = Math.max(0, u[currentSetIndex].actualWeight - 5); setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Decrease weight"
                >−</button>
                <input
                  type="number"
                  value={currentSet.actualWeight || ''}
                  onChange={e => {
                    const updated = [...sets];
                    updated[currentSetIndex].actualWeight = Number(e.target.value);
                    setSets(updated);
                  }}
                  className="flex-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center min-w-0"
                  aria-label="Weight in pounds"
                />
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].actualWeight += 5; setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Increase weight"
                >+</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">Reps</label>
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].actualReps = Math.max(0, u[currentSetIndex].actualReps - 1); setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Decrease reps"
                >−</button>
                <input
                  type="number"
                  value={currentSet.actualReps || ''}
                  onChange={e => {
                    const updated = [...sets];
                    updated[currentSetIndex].actualReps = Number(e.target.value);
                    setSets(updated);
                  }}
                  className="flex-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center min-w-0"
                  placeholder={currentSet.targetReps}
                  aria-label="Reps completed"
                />
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].actualReps += 1; setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Increase reps"
                >+</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">RPE</label>
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].rpe = Math.max(1, (u[currentSetIndex].rpe || 7) - 0.5); setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Decrease RPE"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={currentSet.rpe || ''}
                  onChange={e => {
                    const updated = [...sets];
                    updated[currentSetIndex].rpe = Number(e.target.value);
                    setSets(updated);
                  }}
                  className="flex-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center min-w-0"
                  placeholder="RPE"
                  aria-label="Rate of perceived exertion"
                />
                <button
                  onClick={() => { const u = [...sets]; u[currentSetIndex].rpe = Math.min(10, (u[currentSetIndex].rpe || 7) + 0.5); setSets(u); }}
                  className="w-8 h-9 rounded bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-lg font-bold flex items-center justify-center transition-all"
                  aria-label="Increase RPE"
                >+</button>
              </div>
            </div>
          </div>

          {/* Complete Set Button */}
          <button
            onClick={handleCompleteSet}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Complete Set
          </button>
        </div>
      )}

      {/* Tonnage Running Total */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">Session Tonnage</span>
        <span className="text-sm font-bold text-amber-400">{totalTonnage.toLocaleString()} lbs</span>
      </div>

      {/* Exercise Overview */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Session Overview</h4>
        <div className="space-y-2">
          {exerciseGroups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-32 truncate">{group.exerciseName}</span>
              <div className="flex gap-1">
                {group.sets.map((s, si) => (
                  <div
                    key={si}
                    className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                      s.completed
                        ? 'bg-green-600 text-white'
                        : sets.indexOf(s) === currentSetIndex
                        ? 'bg-amber-500 text-black animate-pulse'
                        : 'bg-neutral-800 text-gray-500'
                    }`}
                  >
                    {s.setNumber}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Finish Early */}
      <button
        onClick={() => setShowFinishEarlyConfirm(true)}
        className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-400 text-sm rounded-xl transition-all"
      >
        Finish Early
      </button>

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-bold text-white">Abandon Session?</h3>
            <p className="text-sm text-gray-400">
              You've completed <span className="text-white font-semibold">{completedCount} of {sets.length}</span> sets
              ({totalTonnage.toLocaleString()} lbs logged). This data will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
              >
                Keep Training
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Finish Early Confirmation Modal ── */}
      {showFinishEarlyConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="text-3xl">🏁</div>
            <h3 className="text-lg font-bold text-white">Finish Early?</h3>
            <p className="text-sm text-gray-400">
              You've completed <span className="text-white font-semibold">{completedCount} of {sets.length}</span> sets
              ({Math.round(completedCount / sets.length * 100)}% of session) with{' '}
              <span className="text-amber-400 font-semibold">{totalTonnage.toLocaleString()} lbs</span> of tonnage.
            </p>
            <p className="text-xs text-gray-500">Your completed sets will be saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishEarlyConfirm(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={() => { setShowFinishEarlyConfirm(false); setShowFinish(true); }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all"
              >
                Finish & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutSession;
