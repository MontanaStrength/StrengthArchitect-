import React, { useMemo } from 'react';
import { SavedWorkout, MuscleGroup } from '../shared/types';
import { getExerciseById } from '../shared/services/exerciseLibrary';

interface Props {
  history: SavedWorkout[];
}

// Recovery status based on recency and volume
type RecoveryStatus = 'fresh' | 'recovered' | 'trained' | 'fatigued' | 'overtrained';

const STATUS_COLORS: Record<RecoveryStatus, string> = {
  fresh:       '#22c55e', // green
  recovered:   '#3b82f6', // blue
  trained:     '#f59e0b', // amber
  fatigued:    '#f97316', // orange
  overtrained: '#ef4444', // red
};

const STATUS_LABELS: Record<RecoveryStatus, string> = {
  fresh:       'Fresh',
  recovered:   'Recovered',
  trained:     'Recently Trained',
  fatigued:    'Fatigued',
  overtrained: 'Overtrained',
};

interface MuscleData {
  sets48h: number;  // sets in last 48 hours
  sets7d: number;   // sets in last 7 days
  lastTrained: number; // timestamp
  status: RecoveryStatus;
}

/** Compute per-muscle recovery from recent history */
const computeMuscleRecovery = (history: SavedWorkout[]): Record<string, MuscleData> => {
  const now = Date.now();
  const h48 = now - 48 * 3600000;
  const h7d = now - 7 * 86400000;

  const data: Record<string, MuscleData> = {};

  // Initialize all muscle groups
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

  // Determine status for each muscle
  for (const [mg, d] of Object.entries(data)) {
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

// SVG muscle region positions — simplified front body outline
// Each muscle maps to a positioned rounded rect or ellipse
const MUSCLE_REGIONS: Record<string, { x: number; y: number; w: number; h: number; side?: 'left' | 'right' | 'center' }> = {
  // Upper body
  [MuscleGroup.CHEST]:      { x: 62, y: 85, w: 56, h: 28, side: 'center' },
  [MuscleGroup.SHOULDERS]:  { x: 38, y: 72, w: 18, h: 18, side: 'left' },
  [MuscleGroup.BACK]:       { x: 68, y: 118, w: 44, h: 30, side: 'center' },
  [MuscleGroup.TRAPS]:      { x: 68, y: 60, w: 44, h: 14, side: 'center' },

  // Arms
  [MuscleGroup.BICEPS]:     { x: 34, y: 105, w: 14, h: 24, side: 'left' },
  [MuscleGroup.TRICEPS]:    { x: 132, y: 105, w: 14, h: 24, side: 'right' },
  [MuscleGroup.FOREARMS]:   { x: 30, y: 135, w: 12, h: 22, side: 'left' },

  // Core
  [MuscleGroup.CORE]:       { x: 68, y: 150, w: 44, h: 28, side: 'center' },

  // Lower body
  [MuscleGroup.QUADS]:      { x: 55, y: 195, w: 20, h: 40, side: 'left' },
  [MuscleGroup.HAMSTRINGS]: { x: 105, y: 195, w: 20, h: 40, side: 'right' },
  [MuscleGroup.GLUTES]:     { x: 68, y: 180, w: 44, h: 18, side: 'center' },
  [MuscleGroup.CALVES]:     { x: 58, y: 248, w: 16, h: 28, side: 'left' },
};

const MuscleRecoveryMap: React.FC<Props> = ({ history }) => {
  const muscleData = useMemo(() => computeMuscleRecovery(history), [history]);

  // Count muscles in each status
  const statusCounts = useMemo(() => {
    const counts: Record<RecoveryStatus, number> = { fresh: 0, recovered: 0, trained: 0, fatigued: 0, overtrained: 0 };
    for (const d of Object.values(muscleData)) {
      counts[d.status]++;
    }
    return counts;
  }, [muscleData]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-1">Muscle Recovery</h3>
      <p className="text-[10px] text-gray-500 mb-4">Based on training volume and recency</p>

      <div className="flex gap-4">
        {/* Body SVG */}
        <div className="flex-shrink-0">
          <svg width="180" height="290" viewBox="0 0 180 290" className="mx-auto">
            {/* Body outline — simplified silhouette */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Head */}
            <circle cx="90" cy="30" r="18" fill="#1a1a1a" stroke="#333" strokeWidth="1" />

            {/* Neck */}
            <rect x="82" y="48" width="16" height="12" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />

            {/* Torso outline */}
            <path d="M 55 60 Q 50 60 45 70 L 35 95 L 30 130 L 35 170 Q 55 185 90 185 Q 125 185 145 170 L 150 130 L 145 95 L 135 70 Q 130 60 125 60 Z"
              fill="#1a1a1a" stroke="#333" strokeWidth="1" />

            {/* Left arm */}
            <path d="M 45 70 Q 30 80 28 100 L 24 140 Q 22 160 26 170"
              fill="none" stroke="#333" strokeWidth="8" strokeLinecap="round" />

            {/* Right arm */}
            <path d="M 135 70 Q 150 80 152 100 L 156 140 Q 158 160 154 170"
              fill="none" stroke="#333" strokeWidth="8" strokeLinecap="round" />

            {/* Left leg */}
            <path d="M 70 185 L 65 220 L 60 260 Q 58 275 55 280"
              fill="none" stroke="#333" strokeWidth="10" strokeLinecap="round" />

            {/* Right leg */}
            <path d="M 110 185 L 115 220 L 120 260 Q 122 275 125 280"
              fill="none" stroke="#333" strokeWidth="10" strokeLinecap="round" />

            {/* Muscle regions — colored by status */}
            {Object.entries(MUSCLE_REGIONS).map(([mg, pos]) => {
              const d = muscleData[mg];
              if (!d) return null;
              const color = STATUS_COLORS[d.status];
              const opacity = d.status === 'fresh' ? 0.15 : d.status === 'recovered' ? 0.4 : 0.7;

              // Mirror left-side muscles to right side
              const regions = [pos];
              if (pos.side === 'left') {
                regions.push({ ...pos, x: 180 - pos.x - pos.w });
              }

              return regions.map((r, i) => (
                <rect
                  key={`${mg}-${i}`}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={4}
                  fill={color}
                  fillOpacity={opacity}
                  stroke={color}
                  strokeWidth={d.status === 'fresh' ? 0 : 0.5}
                  strokeOpacity={0.5}
                  filter={d.status === 'fatigued' || d.status === 'overtrained' ? 'url(#glow)' : undefined}
                >
                  <title>{`${mg}: ${STATUS_LABELS[d.status]} (${d.sets7d} sets/wk)`}</title>
                </rect>
              ));
            })}
          </svg>
        </div>

        {/* Legend + muscle list */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Status legend */}
          <div className="space-y-1.5">
            {(['fresh', 'recovered', 'trained', 'fatigued', 'overtrained'] as const).map(status => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[status], opacity: status === 'fresh' ? 0.3 : 0.8 }} />
                <span className="text-[10px] text-gray-400 flex-1">{STATUS_LABELS[status]}</span>
                <span className="text-[10px] text-gray-600">{statusCounts[status]}</span>
              </div>
            ))}
          </div>

          {/* Muscle detail list — only show non-fresh */}
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
