import React, { useState } from 'react';
import { StrengthWorkoutPlan, GymSetup, ExerciseBlock } from '../types';
import { getArchetypeNameById } from '../services/strengthArchetypes';
import { Dumbbell, Clock, BarChart3, Weight, Info, Lightbulb, ChevronDown, ChevronUp, Flame } from 'lucide-react';

interface Props {
  plan: StrengthWorkoutPlan;
  gymSetup?: GymSetup;
}

const WorkoutCard: React.FC<Props> = ({ plan }) => {
  const [tipsExpanded, setTipsExpanded] = useState(false);

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
                    <ExerciseRow key={index} exercise={exercise} index={index} />
                  ))}
                </div>
              </div>
            );
          }

          // Single exercise
          const { exercise, index } = group.exercises[0];
          return (
            <div key={gi} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <ExerciseRow exercise={exercise} index={index} />
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
const ExerciseRow: React.FC<{ exercise: ExerciseBlock; index: number }> = ({ exercise, index }) => {
  // Build the prescription string
  const prescription: string[] = [];
  prescription.push(`${exercise.sets} \u00D7 ${exercise.reps}`);
  if (exercise.weightLbs) prescription.push(`${exercise.weightLbs} lbs`);
  if (exercise.percentOf1RM) prescription.push(`${exercise.percentOf1RM}% 1RM`);

  const intensityTag = exercise.rpeTarget
    ? `RPE ${exercise.rpeTarget}`
    : exercise.rirTarget !== undefined
      ? `${exercise.rirTarget} RIR`
      : null;

  return (
    <div className="px-5 py-4">
      {/* Top line: number + name */}
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-400">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-white leading-snug">{exercise.exerciseName}</h4>

          {/* Prescription chips */}
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
              Rest {exercise.restSeconds >= 60
                ? `${Math.floor(exercise.restSeconds / 60)}:${String(exercise.restSeconds % 60).padStart(2, '0')}`
                : `${exercise.restSeconds}s`
              }
            </p>
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
