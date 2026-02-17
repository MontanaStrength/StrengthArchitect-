import React, { useState, useMemo } from 'react';
import { StrengthWorkoutPlan, GymSetup, ExerciseBlock } from '../shared/types';
import { HEURISTIC_DRIFT_PER_SET } from '../shared/services/accruedFatigueModel';
import { getArchetypeNameById } from '../shared/services/strengthArchetypes';
import { getExerciseByIdOrName, getComplementaryPatterns, EXERCISE_LIBRARY } from '../shared/services/exerciseLibrary';
import { Dumbbell, Clock, BarChart3, Weight, Info, Lightbulb, ChevronDown, ChevronUp, Flame, Repeat2 } from 'lucide-react';

interface Props {
  plan: StrengthWorkoutPlan;
  gymSetup?: GymSetup;
  onSwapExercise?: (oldExerciseId: string, newExerciseId: string, newExerciseName: string) => void;
  /** Rebuild the full session with the chosen exercise (AI regenerates with this exercise locked in) */
  onSwapAndRebuild?: (oldExerciseId: string, newExerciseId: string, newExerciseName: string) => void;
}

const WorkoutCard: React.FC<Props> = ({ plan, onSwapExercise, onSwapAndRebuild }) => {
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [swapOpenId, setSwapOpenId] = useState<string | null>(null);

  const warmupExercises = plan.exercises.filter(e => e.isWarmupSet);
  const workingExercises = plan.exercises.filter(e => !e.isWarmupSet);
  const totalWorkingSets = workingExercises.reduce((sum, e) => sum + e.sets, 0);

  // Group exercises by superset
  const groupedExercises: { group: string | null; exercises: { exercise: ExerciseBlock; index: number }[] }[] = [];
  let exerciseNum = 0;
  for (const exercise of workingExercises) {
    exerciseNum++;
    const group = exercise.supersetGroup || null;
    const last = groupedExercises[groupedExercises.length - 1];
    if (group && last && last.group === group) {
      last.exercises.push({ exercise, index: exerciseNum });
    } else {
      groupedExercises.push({ group, exercises: [{ exercise, index: exerciseNum }] });
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Hero Header ── */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 px-5 pt-5 pb-4">
          <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            {plan.title}
          </h2>
          <p className="text-amber-100/80 text-sm font-medium mt-1">
            {plan.focus}{plan.difficulty ? ` \u00B7 ${plan.difficulty}` : ''}
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Clock size={13} className="opacity-80" />
              {plan.totalDurationMin} min
            </span>
            <span className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Dumbbell size={13} className="opacity-80" />
              {workingExercises.length} exercises
            </span>
            <span className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Flame size={13} className="opacity-80" />
              {totalWorkingSets} sets
            </span>
            {plan.estimatedTonnage ? (
              <span className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <BarChart3 size={13} className="opacity-80" />
                {plan.estimatedTonnage.toLocaleString()} lbs
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Why This Workout (concise, prominent) ── */}
      {plan.whyThisWorkout && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Info size={14} className="text-blue-400" />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{plan.whyThisWorkout}</p>
          </div>
        </div>
      )}

      {/* ── Warmup (collapsible, subtle) ── */}
      {warmupExercises.length > 0 && (
        <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Warm-up</p>
          <div className="space-y-1.5">
            {warmupExercises.map((ex, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <span className="text-sm text-gray-400">{ex.exerciseName}</span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {ex.sets} x {ex.reps}{ex.weightLbs ? ` @ ${ex.weightLbs} lbs` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Working Exercises ── */}
      <div className="space-y-3">
        {groupedExercises.map((group, gi) => {
          // Superset wrapper
          if (group.group) {
            return (
              <div key={gi} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                  <span className="text-[11px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-md tracking-wide">
                    SUPERSET {group.group}
                  </span>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {group.exercises.map(({ exercise, index }) => (
                    <ExerciseRow
                      key={index}
                      exercise={exercise}
                      index={index}
                      swapOpen={swapOpenId === exercise.exerciseId}
                      onToggleSwap={() => setSwapOpenId(swapOpenId === exercise.exerciseId ? null : exercise.exerciseId)}
                      onSwap={onSwapExercise ? (newId, newName) => onSwapExercise(exercise.exerciseId, newId, newName) : undefined}
                      onSwapAndRebuild={onSwapAndRebuild ? (newId, newName) => onSwapAndRebuild(exercise.exerciseId, newId, newName) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          }

          // Single exercise
          const { exercise, index } = group.exercises[0];
          return (
            <div key={gi} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <ExerciseRow
                exercise={exercise}
                index={index}
                swapOpen={swapOpenId === exercise.exerciseId}
                onToggleSwap={() => setSwapOpenId(swapOpenId === exercise.exerciseId ? null : exercise.exerciseId)}
                onSwap={onSwapExercise ? (newId, newName) => onSwapExercise(exercise.exerciseId, newId, newName) : undefined}
                onSwapAndRebuild={onSwapAndRebuild ? (newId, newName) => onSwapAndRebuild(exercise.exerciseId, newId, newName) : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* ── Summary ── */}
      {plan.summary && (
        <p className="text-sm text-gray-500 leading-relaxed px-1">{plan.summary}</p>
      )}

      {/* ── Coaching Tips (expandable) ── */}
      {plan.coachingTips && plan.coachingTips.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setTipsExpanded(!tipsExpanded)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-neutral-800/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Lightbulb size={14} className="text-yellow-400" />
              </div>
              <span className="text-sm font-semibold text-gray-200">
                Coaching Tips
              </span>
              <span className="text-xs text-gray-500">({plan.coachingTips.length})</span>
            </div>
            {tipsExpanded
              ? <ChevronUp size={16} className="text-gray-500" />
              : <ChevronDown size={16} className="text-gray-500" />
            }
          </button>
          {tipsExpanded && (
            <div className="px-5 pb-4 space-y-3 border-t border-neutral-800">
              {plan.coachingTips.map((tip, i) => (
                <div key={i} className="pt-3">
                  <p className="text-sm font-semibold text-yellow-400/90">{tip.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{tip.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Movement Patterns & Muscles ── */}
      {(plan.movementPatternsCovered || plan.muscleGroupsCovered) && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {plan.movementPatternsCovered?.map(p => (
            <span key={p} className="text-xs bg-neutral-800 text-gray-400 px-2.5 py-1 rounded-lg">{p}</span>
          ))}
          {plan.muscleGroupsCovered?.map(m => (
            <span key={m} className="text-xs bg-amber-900/30 text-amber-400/90 px-2.5 py-1 rounded-lg">{m}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Individual Exercise Row ── */
const ExerciseRow: React.FC<{
  exercise: ExerciseBlock;
  index: number;
  swapOpen: boolean;
  onToggleSwap: () => void;
  onSwap?: (newId: string, newName: string) => void;
  onSwapAndRebuild?: (newId: string, newName: string) => void;
}> = ({ exercise, index, swapOpen, onToggleSwap, onSwap, onSwapAndRebuild }) => {
  // Same-pattern alternatives (e.g. squat → other squats) and other-pattern alternatives (e.g. squat → hinges for less quad stress)
  const { samePattern, otherPatterns } = useMemo(() => {
    const def = getExerciseByIdOrName(exercise.exerciseId, exercise.exerciseName);
    if (!def) return { samePattern: [] as typeof EXERCISE_LIBRARY, otherPatterns: [] as typeof EXERCISE_LIBRARY };
    const same = EXERCISE_LIBRARY.filter(
      e =>
        e.id !== def.id &&
        e.movementPattern === def.movementPattern &&
        (e.difficulty !== 'advanced' || def.difficulty === 'advanced')
    ).slice(0, 8);
    const complementary = getComplementaryPatterns(def.movementPattern);
    const other = EXERCISE_LIBRARY.filter(
      e => complementary.includes(e.movementPattern) && (e.difficulty !== 'advanced' || def.difficulty === 'advanced')
    ).slice(0, 8);
    return { samePattern: same, otherPatterns: other };
  }, [exercise.exerciseId, exercise.exerciseName]);
  const hasSwap = onSwap || onSwapAndRebuild;
  const hasAnyAlternatives = samePattern.length > 0 || otherPatterns.length > 0;
  // Detect interleaved cluster-taper: reps contain "/" (e.g. "6/10") AND notes or reps mention alternating/interleaved
  const hasSlashReps = exercise.reps.includes('/');
  const mentionsInterleaved = [exercise.notes, exercise.reps].some(
    s => s && /interleav|alternat/i.test(s)
  );
  const isInterleaved = hasSlashReps && mentionsInterleaved;

  // Parse interleaved force/metabolic reps (e.g. "6/10 alternating" → forceReps=6, metabReps=10)
  const interleavedParts = isInterleaved ? (() => {
    const match = exercise.reps.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;
    const forceReps = parseInt(match[1], 10);
    const metabReps = parseInt(match[2], 10);
    // Parse force/metabolic rest and set counts from notes
    const forceRestMatch = exercise.notes?.match(/(\d+)-rep force[^(]*\((\d+[^)]*)\s*rest\)/i);
    const metabRestMatch = exercise.notes?.match(/(\d+)-rep metabolic[^(]*\((\d+[^)]*)\s*rest\)/i);
    const forceRest = forceRestMatch?.[2] || '2-3 min';
    const metabRest = metabRestMatch?.[2] || '1-2 min';
    // Estimate set counts: total sets / 2 for each, with remainder going to whichever has more
    const totalSets = exercise.sets || 5;
    const forceSets = Math.ceil(totalSets / 2);
    const metabSets = totalSets - forceSets;
    return { forceReps, metabReps, forceSets, metabSets, forceRest, metabRest };
  })() : null;

  // Build the prescription string (standard exercises only)
  const prescription: string[] = [];
  if (!isInterleaved) {
    prescription.push(`${exercise.sets} \u00D7 ${exercise.reps}`);
    if (exercise.weightLbs) prescription.push(`${exercise.weightLbs} lbs`);
    if (exercise.percentOf1RM) prescription.push(`${exercise.percentOf1RM}% 1RM`);
  }

  const intensityTag = (() => {
    if (isInterleaved) return null; // handled in the interleaved layout
    if (exercise.rpeTarget) {
      const startRPE = exercise.rpeTarget;
      const sets = exercise.sets ?? 1;
      if (sets > 1) {
        const endRPE = Math.min(10, startRPE + HEURISTIC_DRIFT_PER_SET * (sets - 1));
        const endRounded = Math.round(endRPE * 10) / 10;
        if (endRounded > startRPE + 0.3) {
          return `RPE ${startRPE}–${endRounded % 1 === 0 ? endRounded.toFixed(0) : endRounded.toFixed(1)}`;
        }
      }
      return `RPE ${startRPE}`;
    }
    if (exercise.rirTarget !== undefined) return `${exercise.rirTarget} RIR`;
    return null;
  })();

  return (
    <div className="px-5 py-4">
      {/* Top line: number + name */}
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-400">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white leading-snug">{exercise.exerciseName}</h4>
            {exercise.setProtocol === 'myo-reps' && (
              <span className="text-[10px] font-bold bg-purple-500/80 text-white px-1.5 py-0.5 rounded tracking-wide uppercase">
                Myo-Rep
              </span>
            )}
            {isInterleaved && (
              <span className="text-[10px] font-bold bg-gradient-to-r from-blue-500/80 to-orange-500/80 text-white px-1.5 py-0.5 rounded tracking-wide uppercase">
                Interleaved
              </span>
            )}
            {hasSwap && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSwap(); }}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${swapOpen ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:text-amber-400'}`}
                title="Swap exercise"
              >
                <Repeat2 size={14} />
                <span>Swap</span>
              </button>
            )}
          </div>

          {/* Swap dropdown — same movement + other patterns (e.g. hinge when quad is sore) */}
          {swapOpen && hasSwap && (
            <div className="mt-2 mb-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 space-y-2">
              {!hasAnyAlternatives ? (
                <p className="text-xs text-gray-500 py-1">No alternatives in library for this movement.</p>
              ) : (
                <>
                  {samePattern.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Same movement</p>
                      <div className="space-y-1">
                        {samePattern.map(alt => (
                          <div key={alt.id} className="flex items-center justify-between gap-2 flex-wrap rounded bg-neutral-700/50 px-2 py-1.5">
                            <span className="text-xs text-gray-200 flex-1 min-w-0">{alt.name}</span>
                            <div className="flex gap-1 shrink-0">
                              {onSwapAndRebuild && (
                                <button
                                  onClick={() => { onSwapAndRebuild(alt.id, alt.name); onToggleSwap(); }}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/25 text-amber-400 hover:bg-amber-500/35 transition-colors whitespace-nowrap"
                                >
                                  Rebuild session
                                </button>
                              )}
                              {onSwap && (
                                <button
                                  onClick={() => { onSwap(alt.id, alt.name); onToggleSwap(); }}
                                  className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-600 transition-colors"
                                >
                                  Just swap
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherPatterns.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                        Other options (e.g. hinge if quad is sore)
                      </p>
                      <div className="space-y-1">
                        {otherPatterns.map(alt => (
                          <div key={alt.id} className="flex items-center justify-between gap-2 flex-wrap rounded bg-neutral-700/50 px-2 py-1.5">
                            <span className="text-xs text-gray-200 flex-1 min-w-0">{alt.name}</span>
                            <span className="text-[9px] text-gray-500 shrink-0">{alt.movementPattern}</span>
                            <div className="flex gap-1 shrink-0 w-full sm:w-auto">
                              {onSwapAndRebuild && (
                                <button
                                  onClick={() => { onSwapAndRebuild(alt.id, alt.name); onToggleSwap(); }}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/25 text-amber-400 hover:bg-amber-500/35 transition-colors whitespace-nowrap"
                                >
                                  Rebuild session
                                </button>
                              )}
                              {onSwap && (
                                <button
                                  onClick={() => { onSwap(alt.id, alt.name); onToggleSwap(); }}
                                  className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-600 transition-colors"
                                >
                                  Just swap
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Interleaved cluster-taper: one rectangle per set */}
          {isInterleaved && interleavedParts ? (
            <div className="mt-2 space-y-1.5">
              {/* Weight line */}
              {(exercise.weightLbs || exercise.percentOf1RM) && (
                <p className="text-xs text-gray-400">
                  Same weight throughout: {exercise.weightLbs && `${exercise.weightLbs} lbs`}{exercise.weightLbs && exercise.percentOf1RM ? ' · ' : ''}{exercise.percentOf1RM && `${exercise.percentOf1RM}% 1RM`}
                </p>
              )}
              {/* Build interleaved set sequence: F-M-F-M... with extras appended */}
              {(() => {
                const sets: Array<{ type: 'force' | 'metabolic'; num: number }> = [];
                const maxPairs = Math.max(interleavedParts.forceSets, interleavedParts.metabSets);
                let fCount = 0;
                let mCount = 0;
                for (let i = 0; i < maxPairs; i++) {
                  if (fCount < interleavedParts.forceSets) { fCount++; sets.push({ type: 'force', num: fCount }); }
                  if (mCount < interleavedParts.metabSets) { mCount++; sets.push({ type: 'metabolic', num: mCount }); }
                }
                return sets.map((s, i) => {
                  const isForce = s.type === 'force';
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                        isForce
                          ? 'bg-blue-500/8 border-blue-500/20'
                          : 'bg-orange-500/8 border-orange-500/20'
                      }`}
                    >
                      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                        isForce ? 'bg-blue-500/80' : 'bg-orange-500/80'
                      }`}>
                        {isForce ? 'Force' : 'Metabolic'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">Set {s.num}</span>
                      <span className={`text-sm font-semibold tabular-nums ${isForce ? 'text-blue-300' : 'text-orange-300'}`}>
                        {isForce ? interleavedParts.forceReps : interleavedParts.metabReps} reps
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {isForce ? interleavedParts.forceRest : interleavedParts.metabRest} rest
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <>
              {/* Standard prescription chips */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm font-semibold text-amber-400 tabular-nums">
                  {prescription.join(' @ ')}
                </span>
                {intensityTag && (
                  <span className="text-xs font-medium text-gray-400 bg-neutral-800 px-2 py-0.5 rounded-md">
                    {intensityTag}
                  </span>
                )}
                {exercise.tempo && (
                  <span className="text-xs font-medium text-gray-500 bg-neutral-800/60 px-2 py-0.5 rounded-md">
                    Tempo {exercise.tempo}
                  </span>
                )}
              </div>

              {/* Rest period */}
              {exercise.restSeconds > 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  {exercise.setProtocol === 'myo-reps'
                    ? `${exercise.restSeconds}s between mini-sets`
                    : `Rest ${exercise.restSeconds >= 60
                        ? `${Math.floor(exercise.restSeconds / 60)}:${String(exercise.restSeconds % 60).padStart(2, '0')}`
                        : `${exercise.restSeconds}s`
                      }`
                  }
                </p>
              )}
            </>
          )}

          {/* Coaching cue */}
          {exercise.coachingCue && (
            <p className="text-xs text-yellow-400/70 mt-2 leading-relaxed italic">
              {exercise.coachingCue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutCard;
