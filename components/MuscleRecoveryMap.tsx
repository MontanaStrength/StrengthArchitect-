import React, { useMemo } from 'react';
import Model, { IExerciseData } from 'react-body-highlighter';
import { SavedWorkout, MuscleGroup } from '../shared/types';
import { getExerciseById } from '../shared/services/exerciseLibrary';

interface Props {
  history: SavedWorkout[];
}

type RecoveryStatus = 'fresh' | 'recovered' | 'trained' | 'fatigued' | 'overtrained';

const STATUS_COLORS: Record<RecoveryStatus, string> = {
  fresh:       '#22c55e',
  recovered:   '#3b82f6',
  trained:     '#f59e0b',
  fatigued:    '#f97316',
  overtrained: '#ef4444',
};

const STATUS_LABELS: Record<RecoveryStatus, string> = {
  fresh:       'Fresh',
  recovered:   'Recovered',
  trained:     'Recently Trained',
  fatigued:    'Fatigued',
  overtrained: 'Overtrained',
};

interface MuscleData {
  sets48h: number;
  sets7d: number;
  lastTrained: number;
  status: RecoveryStatus;
}

const computeMuscleRecovery = (history: SavedWorkout[]): Record<string, MuscleData> => {
  const now = Date.now();
  const h48 = now - 48 * 3600000;
  const h7d = now - 7 * 86400000;

  const data: Record<string, MuscleData> = {};

  for (const mg of Object.values(MuscleGroup)) {
    data[mg] = { sets48h: 0, sets7d: 0, lastTrained: 0, status: 'fresh' };
  }

  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.isWarmupSet) continue;
      const exerciseDef = getExerciseById(ex.exerciseId);
      const muscles = exerciseDef
        ? [...exerciseDef.primaryMuscles, ...exerciseDef.secondaryMuscles]
        : (workout.muscleGroupsCovered || []) as MuscleGroup[];

      for (const mg of muscles) {
        if (!data[mg]) continue;
        const isPrimary = exerciseDef?.primaryMuscles.includes(mg);
        const credit = isPrimary ? ex.sets : Math.round(ex.sets * 0.5);

        if (workout.timestamp >= h48) data[mg].sets48h += credit;
        if (workout.timestamp >= h7d) data[mg].sets7d += credit;
        if (workout.timestamp > data[mg].lastTrained) data[mg].lastTrained = workout.timestamp;
      }
    }
  }

  for (const [, d] of Object.entries(data)) {
    const hoursSince = d.lastTrained > 0 ? (now - d.lastTrained) / 3600000 : 999;

    if (d.sets7d === 0) {
      d.status = 'fresh';
    } else if (d.sets48h > 0 && d.sets7d > 15) {
      d.status = 'overtrained';
    } else if (d.sets48h > 0 && hoursSince < 24) {
      d.status = 'fatigued';
    } else if (d.sets48h > 0) {
      d.status = 'trained';
    } else if (hoursSince < 72) {
      d.status = 'recovered';
    } else {
      d.status = 'fresh';
    }
  }

  return data;
};

// Map our MuscleGroup enum values to react-body-highlighter slug names
const MUSCLE_TO_SLUGS: Record<string, string[]> = {
  [MuscleGroup.CHEST]:      ['chest'],
  [MuscleGroup.BACK]:       ['upper-back', 'lower-back'],
  [MuscleGroup.SHOULDERS]:  ['front-deltoids', 'back-deltoids'],
  [MuscleGroup.BICEPS]:     ['biceps'],
  [MuscleGroup.TRICEPS]:    ['triceps'],
  [MuscleGroup.QUADS]:      ['quadriceps'],
  [MuscleGroup.HAMSTRINGS]: ['hamstring'],
  [MuscleGroup.GLUTES]:     ['gluteal'],
  [MuscleGroup.CALVES]:     ['calves'],
  [MuscleGroup.CORE]:       ['abs', 'obliques'],
  [MuscleGroup.FOREARMS]:   ['forearm'],
  [MuscleGroup.TRAPS]:      ['trapezius'],
};

const STATUS_FREQUENCY: Record<RecoveryStatus, number> = {
  fresh: 0,
  recovered: 1,
  trained: 2,
  fatigued: 3,
  overtrained: 4,
};

const MuscleRecoveryMap: React.FC<Props> = ({ history }) => {
  const muscleData = useMemo(() => computeMuscleRecovery(history), [history]);

  const statusCounts = useMemo(() => {
    const counts: Record<RecoveryStatus, number> = { fresh: 0, recovered: 0, trained: 0, fatigued: 0, overtrained: 0 };
    for (const d of Object.values(muscleData)) {
      counts[d.status]++;
    }
    return counts;
  }, [muscleData]);

  // Build data array for react-body-highlighter
  // Each non-fresh muscle group becomes an "exercise" entry with frequency mapped from status
  const modelData: IExerciseData[] = useMemo(() => {
    const entries: IExerciseData[] = [];
    for (const [mg, d] of Object.entries(muscleData)) {
      if (d.status === 'fresh') continue;
      const slugs = MUSCLE_TO_SLUGS[mg];
      if (!slugs) continue;
      entries.push({
        name: mg,
        muscles: slugs as any,
        frequency: STATUS_FREQUENCY[d.status],
      });
    }
    return entries;
  }, [muscleData]);

  const highlightColors = [
    STATUS_COLORS.recovered,
    STATUS_COLORS.trained,
    STATUS_COLORS.fatigued,
    STATUS_COLORS.overtrained,
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-1">Muscle Recovery</h3>
      <p className="text-[10px] text-gray-500 mb-4">Based on training volume and recency</p>

      <div className="flex gap-4">
        {/* Body model */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div style={{ width: 160 }}>
            <Model
              data={modelData}
              style={{ width: '100%' }}
              svgStyle={{ width: '100%', height: 'auto' }}
              highlightedColors={highlightColors}
              bodyColor="#262626"
              type="anterior"
            />
          </div>
          <div style={{ width: 160 }}>
            <Model
              data={modelData}
              style={{ width: '100%' }}
              svgStyle={{ width: '100%', height: 'auto' }}
              highlightedColors={highlightColors}
              bodyColor="#262626"
              type="posterior"
            />
          </div>
        </div>

        {/* Legend + muscle list */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1.5">
            {(['fresh', 'recovered', 'trained', 'fatigued', 'overtrained'] as const).map(status => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[status], opacity: status === 'fresh' ? 0.3 : 0.8 }} />
                <span className="text-[10px] text-gray-400 flex-1">{STATUS_LABELS[status]}</span>
                <span className="text-[10px] text-gray-600">{statusCounts[status]}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 pt-2 space-y-1">
            {Object.entries(muscleData)
              .filter(([, d]) => d.status !== 'fresh')
              .sort((a, b) => {
                const order: Record<RecoveryStatus, number> = { overtrained: 0, fatigued: 1, trained: 2, recovered: 3, fresh: 4 };
                return order[a[1].status] - order[b[1].status];
              })
              .map(([mg, d]) => {
                const hoursSince = d.lastTrained > 0 ? Math.round((Date.now() - d.lastTrained) / 3600000) : 0;
                const timeLabel = hoursSince < 24 ? `${hoursSince}h ago` : `${Math.round(hoursSince / 24)}d ago`;
                return (
                  <div key={mg} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.status] }} />
                      <span className="text-gray-300">{mg}</span>
                    </div>
                    <span className="text-gray-600">{d.sets7d}sets · {timeLabel}</span>
                  </div>
                );
              })}
            {Object.values(muscleData).every(d => d.status === 'fresh') && (
              <p className="text-[10px] text-gray-600 text-center py-2">All muscles fresh — ready to train!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuscleRecoveryMap;
