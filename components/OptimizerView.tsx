import React, { useState, useMemo } from 'react';
import { OptimizerConfig, MuscleGroup, SavedWorkout, LiftRecord, FormData } from '../types';
import { computeOptimizerRecommendations, TrainingContext } from '../services/optimizerEngine';

interface Props {
  config: OptimizerConfig;
  onChange: (config: OptimizerConfig) => void;
  history: SavedWorkout[];
  liftRecords: LiftRecord[];
  formData: FormData;
  trainingContext?: TrainingContext | null;
}

const MUSCLE_GROUPS = Object.values(MuscleGroup);

const REP_RANGE_OPTIONS: { value: OptimizerConfig['repRangePreference']; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'AI selects based on goals & phase' },
  { value: 'low', label: 'Low (1-5)', desc: 'Strength & power focus' },
  { value: 'moderate', label: 'Moderate (6-12)', desc: 'Hypertrophy focus' },
  { value: 'high', label: 'High (12-20+)', desc: 'Endurance & metabolic' },
];

const OptimizerView: React.FC<Props> = ({ config, onChange, history, liftRecords, formData, trainingContext }) => {
  const [localConfig, setLocalConfig] = useState<OptimizerConfig>({ ...config });

  // Live-computed recommendations based on current config + history + context
  const liveRecs = useMemo(() => {
    if (!localConfig.enabled) return null;
    return computeOptimizerRecommendations(localConfig, formData, history, trainingContext);
  }, [localConfig, formData, history, trainingContext]);

  const weeklyVolume = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentWorkouts = history.filter(w => w.date > oneWeekAgo);
    const volumeByMuscle: Partial<Record<MuscleGroup, number>> = {};
    recentWorkouts.forEach(w => {
      if (w.workout?.muscleGroupsCovered) {
        w.workout.muscleGroupsCovered.forEach(mg => {
          const totalSets = w.workout!.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
          const avgSetsPerGroup = totalSets / (w.workout!.muscleGroupsCovered?.length || 1);
          volumeByMuscle[mg as MuscleGroup] = (volumeByMuscle[mg as MuscleGroup] || 0) + avgSetsPerGroup;
        });
      }
    });
    return volumeByMuscle;
  }, [history]);

  const updateConfig = (partial: Partial<OptimizerConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...partial }));
  };

  const updateMuscleTarget = (mg: MuscleGroup, sets: number) => {
    setLocalConfig(prev => ({
      ...prev,
      targetSetsPerMuscleGroup: {
        ...prev.targetSetsPerMuscleGroup,
        [mg]: sets,
      },
    }));
  };

  const handleSave = () => {
    onChange(localConfig);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">⚡</span> Volume & Rep Optimizer
      </h2>
      <p className="text-neutral-400 text-sm">
        Configure optimization parameters that feed into the AI workout generator. 
        The optimizer adjusts session volume and rep schemes based on your settings and training history.
      </p>

      {/* Master Toggle */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="text-lg font-semibold text-white">Enable Optimizer</h3>
            <p className="text-sm text-neutral-400">When enabled, optimizer recommendations feed into AI prompt</p>
          </div>
          <div className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${localConfig.enabled ? 'bg-amber-500' : 'bg-neutral-700'}`}
            onClick={() => updateConfig({ enabled: !localConfig.enabled })}
          >
            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${localConfig.enabled ? 'translate-x-7' : ''}`} />
          </div>
        </label>
      </div>

      {localConfig.enabled && (
        <>
          {/* Session Volume Limits */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4">Session Volume</h3>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Max Working Sets Per Session: <span className="text-amber-400 font-bold">{localConfig.maxSetsPerSession || 25}</span>
              </label>
              <input
                type="range"
                min={8}
                max={40}
                value={localConfig.maxSetsPerSession || 25}
                onChange={e => updateConfig({ maxSetsPerSession: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>8 (Minimal)</span>
                <span>20 (Moderate)</span>
                <span>40 (Very High)</span>
              </div>
            </div>
          </div>

          {/* Rep Range Preference */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4">Rep Range Preference</h3>
            <div className="grid grid-cols-2 gap-3">
              {REP_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig({ repRangePreference: opt.value })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    localConfig.repRangePreference === opt.value
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{opt.label}</div>
                  <div className="text-xs text-neutral-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fatigue Management */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4">Fatigue Management</h3>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={localConfig.autoDeload ?? true}
                onChange={e => updateConfig({ autoDeload: e.target.checked })}
                className="accent-amber-500"
              />
              <div>
                <span className="text-white">Auto-Deload Recommendations</span>
                <p className="text-xs text-neutral-400">AI will suggest deload weeks based on accumulated fatigue</p>
              </div>
            </label>
            {localConfig.autoDeload && (
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Deload Every <span className="text-amber-400 font-bold">{localConfig.deloadFrequencyWeeks || 4}</span> Weeks
                </label>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={localConfig.deloadFrequencyWeeks || 4}
                  onChange={e => updateConfig({ deloadFrequencyWeeks: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>3 weeks</span>
                  <span>5 weeks</span>
                  <span>8 weeks</span>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Volume Targets by Muscle Group */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-2">Weekly Volume Targets (Sets/Week)</h3>
            <p className="text-xs text-neutral-400 mb-4">Set target weekly sets per muscle group. Current volume shown from last 7 days.</p>
            <div className="space-y-3">
              {MUSCLE_GROUPS.map(mg => {
                const target = localConfig.targetSetsPerMuscleGroup?.[mg] ?? 0;
                const current = Math.round(weeklyVolume[mg] || 0);
                const status = target === 0 ? 'neutral' : current >= target ? 'over' : current >= target * 0.7 ? 'near' : 'under';
                return (
                  <div key={mg} className="flex items-center gap-3">
                    <span className="text-sm text-neutral-300 w-28 truncate">{mg}</span>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={target}
                      onChange={e => updateMuscleTarget(mg, Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="text-sm font-mono w-8 text-right text-amber-400">{target || '—'}</span>
                    <span className={`text-xs w-16 text-right ${
                      status === 'over' ? 'text-green-400' :
                      status === 'near' ? 'text-yellow-400' :
                      status === 'under' ? 'text-amber-400' :
                      'text-neutral-500'
                    }`}>
                      {current > 0 ? `${current} now` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Recommendations (live from optimizer engine) */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-2">Live Session Recommendations</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Computed from your settings, training history, readiness, and active block.
              These values are sent directly to the AI when you generate a workout.
            </p>
            {liveRecs ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400">Working Sets</div>
                    <div className="text-xl font-bold text-amber-400">{liveRecs.sessionVolume}</div>
                  </div>
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400">Rep Scheme</div>
                    <div className="text-sm font-bold text-amber-400 leading-snug">{liveRecs.repScheme}</div>
                  </div>
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400">Intensity</div>
                    <div className="text-xl font-bold text-amber-400">{liveRecs.intensityRange.min}–{liveRecs.intensityRange.max}%</div>
                  </div>
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400">Rest Periods</div>
                    <div className="text-xl font-bold text-amber-400">{liveRecs.restRange.min}–{liveRecs.restRange.max}s</div>
                  </div>
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400">Exercises</div>
                    <div className="text-xl font-bold text-amber-400">{liveRecs.exerciseCount.min}–{liveRecs.exerciseCount.max}</div>
                  </div>
                  {liveRecs.suggestedFocus && (
                    <div className="bg-neutral-800 p-3 rounded-lg">
                      <div className="text-xs text-neutral-400">Suggested Focus</div>
                      <div className="text-sm font-bold text-amber-400">{liveRecs.suggestedFocus}</div>
                    </div>
                  )}
                </div>

                {/* Muscle group priorities */}
                {liveRecs.muscleGroupPriorities && Object.keys(liveRecs.muscleGroupPriorities).length > 0 && (
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400 mb-2">Muscle Group Priorities</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(liveRecs.muscleGroupPriorities).map(([mg, priority]) => (
                        <span
                          key={mg}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            priority === 'increase'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : priority === 'decrease'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-neutral-700 text-neutral-300 border border-neutral-600'
                          }`}
                        >
                          {priority === 'increase' ? '↑' : priority === 'decrease' ? '↓' : '='} {mg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly volume status */}
                {liveRecs.weeklyVolumeStatus && Object.keys(liveRecs.weeklyVolumeStatus).length > 0 && (
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400 mb-2">Weekly Volume vs. Targets</div>
                    <div className="space-y-1.5">
                      {Object.entries(liveRecs.weeklyVolumeStatus).map(([mg, vs]) => (
                        <div key={mg} className="flex items-center gap-2">
                          <span className="text-xs text-neutral-300 w-24 truncate">{mg}</span>
                          <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                vs.status === 'over' ? 'bg-green-500' :
                                vs.status === 'on-track' ? 'bg-amber-500' :
                                'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(100, vs.target > 0 ? (vs.current / vs.target) * 100 : 0)}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-400 w-16 text-right">{vs.current}/{vs.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-neutral-800 p-3 rounded-lg">
                  <div className="text-xs text-neutral-400 mb-1">Engine Rationale</div>
                  <p className="text-sm text-neutral-300">{liveRecs.rationale}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                <p className="text-sm">Enable the optimizer above to see live recommendations.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-600 transition-colors"
      >
        Save Optimizer Settings
      </button>
    </div>
  );
};

export default OptimizerView;
