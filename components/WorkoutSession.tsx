import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SavedWorkout, CompletedSet, GymSetup, ExerciseBlock } from '../types';
import { formatTime, formatPlateLoading, estimate1RM } from '../utils';
import { playBeep, initAudio } from '../utils/audioManager';
import { calculatePlateLoading } from '../utils/plateCalculator';
import { Play, Pause, SkipForward, Check, Volume2, VolumeX, X } from 'lucide-react';

interface Props {
  workout: SavedWorkout;
  gymSetup?: GymSetup;
  audioMuted?: boolean;
  onAudioMutedChange?: (muted: boolean) => void;
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
}

const WorkoutSession: React.FC<Props> = ({ workout, gymSetup, audioMuted, onAudioMutedChange, onComplete, onCancel }) => {
  const barWeight = gymSetup?.barbellWeightLbs || 45;

  // Build flat list of all sets from exercises
  const allSets = React.useMemo(() => {
    const sets: SetEntry[] = [];
    for (const ex of workout.exercises) {
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
    return sets;
  }, [workout]);

  const [sets, setSets] = useState<SetEntry[]>(allSets);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [sessionRPE, setSessionRPE] = useState(7);
  const [showFinish, setShowFinish] = useState(false);
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

  const handleCompleteSet = useCallback(() => {
    const updated = [...sets];
    const current = updated[currentSetIndex];
    if (!current) return;

    current.completed = true;
    if (current.actualReps === 0) {
      // Default to target reps
      const targetNum = parseInt(current.targetReps) || 5;
      current.actualReps = targetNum;
    }
    setSets(updated);

    // Start rest timer
    const exercise = getCurrentExercise();
    if (exercise && currentSetIndex < sets.length - 1) {
      setRestTimeRemaining(exercise.restSeconds || 90);
      setRestTimerActive(true);
      if (!muted) playBeep(440, 'sine', 0.15);
    }

    // Move to next set
    if (currentSetIndex < sets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    } else {
      setShowFinish(true);
    }
  }, [currentSetIndex, sets, muted]);

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
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={onCancel} className="p-2 text-gray-400 hover:text-amber-400">
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

      {/* Current Set */}
      {currentSet && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-white">{currentSet.exerciseName}</h3>
              <p className="text-sm text-gray-400">Set {currentSet.setNumber} • Target: {currentSet.targetReps} reps</p>
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
              <input
                type="number"
                value={currentSet.actualWeight || ''}
                onChange={e => {
                  const updated = [...sets];
                  updated[currentSetIndex].actualWeight = Number(e.target.value);
                  setSets(updated);
                }}
                className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Reps</label>
              <input
                type="number"
                value={currentSet.actualReps || ''}
                onChange={e => {
                  const updated = [...sets];
                  updated[currentSetIndex].actualReps = Number(e.target.value);
                  setSets(updated);
                }}
                className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center"
                placeholder={currentSet.targetReps}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">RPE</label>
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
                className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm text-center"
                placeholder="RPE"
              />
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
        onClick={() => setShowFinish(true)}
        className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-400 text-sm rounded-xl transition-all"
      >
        Finish Early
      </button>
    </div>
  );
};

export default WorkoutSession;
