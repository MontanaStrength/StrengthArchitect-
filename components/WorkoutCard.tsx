import React from 'react';
import { StrengthWorkoutPlan, GymSetup } from '../types';
import { formatPlateLoading } from '../utils';
import { getArchetypeNameById } from '../services/strengthArchetypes';
import { Dumbbell, Clock, BarChart3, Info, Lightbulb } from 'lucide-react';

interface Props {
  plan: StrengthWorkoutPlan;
  gymSetup?: GymSetup;
}

const WorkoutCard: React.FC<Props> = ({ plan, gymSetup }) => {
  const barWeight = gymSetup?.barbellWeightLbs || 45;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{plan.title}</h2>
            <p className="text-amber-200 text-sm mt-1">{plan.focus} • {plan.difficulty}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-200 text-sm">
              <Clock size={14} />
              {plan.totalDurationMin} min
            </div>
            {plan.estimatedTonnage && (
              <div className="flex items-center gap-1 text-amber-200 text-sm mt-1">
                <BarChart3 size={14} />
                {plan.estimatedTonnage.toLocaleString()} lbs
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="p-4 space-y-3">
        {plan.exercises.filter(e => !e.isWarmupSet).map((exercise, i) => (
          <div key={i} className={`bg-neutral-800/50 rounded-lg p-3 ${exercise.supersetGroup ? 'border-l-4 border-purple-500' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {exercise.supersetGroup && (
                    <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">
                      {exercise.supersetGroup}
                    </span>
                  )}
                  <h4 className="font-semibold text-white text-sm">{exercise.exerciseName}</h4>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  {exercise.sets} × {exercise.reps}
                  {exercise.weightLbs ? ` @ ${exercise.weightLbs} lbs` : ''}
                  {exercise.percentOf1RM ? ` (${exercise.percentOf1RM}% 1RM)` : ''}
                  {exercise.rpeTarget ? ` • RPE ${exercise.rpeTarget}` : ''}
                  {exercise.rirTarget !== undefined ? ` • ${exercise.rirTarget} RIR` : ''}
                </p>
                {exercise.weightLbs && exercise.weightLbs > barWeight && (
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    🏋️ {formatPlateLoading(exercise.weightLbs, barWeight)}
                  </p>
                )}
                {exercise.tempo && (
                  <p className="text-gray-500 text-[10px]">Tempo: {exercise.tempo}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Rest: {exercise.restSeconds}s</p>
              </div>
            </div>
            {exercise.coachingCue && (
              <p className="text-yellow-400/70 text-[10px] mt-1 italic">💡 {exercise.coachingCue}</p>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {plan.summary && (
        <div className="px-4 pb-3">
          <p className="text-gray-400 text-xs">{plan.summary}</p>
        </div>
      )}

      {/* Why This Workout */}
      {plan.whyThisWorkout && (
        <div className="mx-4 mb-3 bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1">
            <Info size={12} /> Why This Workout
          </div>
          <p className="text-blue-300/80 text-xs">{plan.whyThisWorkout}</p>
        </div>
      )}

      {/* Coaching Tips */}
      {plan.coachingTips && plan.coachingTips.length > 0 && (
        <div className="mx-4 mb-4 space-y-2">
          {plan.coachingTips.map((tip, i) => (
            <div key={i} className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold mb-1">
                <Lightbulb size={12} /> {tip.title}
              </div>
              <p className="text-yellow-300/80 text-xs">{tip.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Movement Patterns & Muscles */}
      {(plan.movementPatternsCovered || plan.muscleGroupsCovered) && (
        <div className="px-4 pb-4 flex flex-wrap gap-1">
          {plan.movementPatternsCovered?.map(p => (
            <span key={p} className="text-[10px] bg-neutral-800 text-gray-400 px-2 py-0.5 rounded">{p}</span>
          ))}
          {plan.muscleGroupsCovered?.map(m => (
            <span key={m} className="text-[10px] bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">{m}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutCard;
