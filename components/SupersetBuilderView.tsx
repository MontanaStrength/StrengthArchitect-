import React, { useState, useMemo } from 'react';
import { SupersetConfig, SupersetPair, MovementPattern } from '../types';
import { EXERCISE_LIBRARY } from '../services/exerciseLibrary';

const ANTAGONIST_PAIRS: { a: string; b: string; label: string }[] = [
  { a: 'Horizontal Push', b: 'Horizontal Pull', label: 'Bench + Row' },
  { a: 'Vertical Push', b: 'Vertical Pull', label: 'OHP + Pull-up' },
  { a: 'Squat', b: 'Hinge', label: 'Squat + Hinge' },
  { a: 'Core', b: 'Carry', label: 'Core + Carry' },
];

const SupersetBuilderView: React.FC = () => {
  const [config, setConfig] = useState<Partial<SupersetConfig>>({
    name: '',
    description: '',
    exercisePairs: [],
    restBetweenSupersets: 90,
    rounds: 3,
  });

  const [pairA, setPairA] = useState<string>('');
  const [pairB, setPairB] = useState<string>('');
  const [pairAReps, setPairAReps] = useState('8-10');
  const [pairBReps, setPairBReps] = useState('8-10');
  const [restBetween, setRestBetween] = useState(15);
  const [saved, setSaved] = useState(false);

  const addPair = () => {
    if (!pairA || !pairB) return;
    const exA = EXERCISE_LIBRARY.find(e => e.id === pairA);
    const exB = EXERCISE_LIBRARY.find(e => e.id === pairB);
    if (!exA || !exB) return;

    const newPair: SupersetPair = {
      exerciseA: { exerciseId: exA.id, exerciseName: exA.name, reps: pairAReps },
      exerciseB: { exerciseId: exB.id, exerciseName: exB.name, reps: pairBReps },
      restBetweenExercises: restBetween,
    };

    setConfig(prev => ({
      ...prev,
      exercisePairs: [...(prev.exercisePairs || []), newPair],
    }));
    setPairA('');
    setPairB('');
  };

  const removePair = (idx: number) => {
    setConfig(prev => ({
      ...prev,
      exercisePairs: (prev.exercisePairs || []).filter((_, i) => i !== idx),
    }));
  };

  const applyAntagonistTemplate = (a: string, b: string) => {
    const exA = EXERCISE_LIBRARY.filter(e => e.movementPattern === a);
    const exB = EXERCISE_LIBRARY.filter(e => e.movementPattern === b);
    if (exA.length > 0 && exB.length > 0) {
      setPairA(exA[0].id);
      setPairB(exB[0].id);
    }
  };

  const totalTime = useMemo(() => {
    const pairs = config.exercisePairs || [];
    const rounds = config.rounds || 3;
    const restBetweenSupersets = config.restBetweenSupersets || 90;
    // Estimate ~30s per exercise per set
    const workPerRound = pairs.length * 2 * 30 + pairs.reduce((s, p) => s + p.restBetweenExercises, 0);
    const totalSeconds = rounds * workPerRound + (rounds - 1) * restBetweenSupersets * pairs.length;
    return Math.round(totalSeconds / 60);
  }, [config]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // In a real implementation, this would persist to Supabase
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🔗</span> Superset Builder
      </h2>
      <p className="text-neutral-400 text-sm">
        Build custom superset pairings. Antagonist supersets (pushing + pulling) are most effective for saving time while maintaining performance.
      </p>

      {/* Name & Description */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 space-y-3">
        <input
          type="text"
          value={config.name || ''}
          onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Superset Name (e.g., 'Upper Body Antagonist')"
          className="w-full bg-neutral-800 text-white p-3 rounded-lg border border-neutral-700 text-sm"
        />
        <textarea
          value={config.description || ''}
          onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description..."
          rows={2}
          className="w-full bg-neutral-800 text-white p-3 rounded-lg border border-neutral-700 text-sm resize-none"
        />
      </div>

      {/* Quick Templates */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-400 mb-3">Antagonist Pair Templates</h3>
        <div className="grid grid-cols-2 gap-2">
          {ANTAGONIST_PAIRS.map(pair => (
            <button
              key={pair.label}
              onClick={() => applyAntagonistTemplate(pair.a, pair.b)}
              className="p-3 bg-neutral-800 rounded-lg border border-neutral-700 text-left hover:border-red-500/50 transition-colors"
            >
              <div className="text-sm font-semibold text-white">{pair.label}</div>
              <div className="text-xs text-neutral-400">{pair.a} + {pair.b}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Exercise Pair */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Add Exercise Pair</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Exercise A</label>
            <select
              value={pairA}
              onChange={e => setPairA(e.target.value)}
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
            >
              <option value="">Select exercise...</option>
              {EXERCISE_LIBRARY.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.movementPattern})</option>
              ))}
            </select>
            <input
              type="text"
              value={pairAReps}
              onChange={e => setPairAReps(e.target.value)}
              placeholder="Reps (e.g., 8-10)"
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm mt-2"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Exercise B</label>
            <select
              value={pairB}
              onChange={e => setPairB(e.target.value)}
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
            >
              <option value="">Select exercise...</option>
              {EXERCISE_LIBRARY.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.movementPattern})</option>
              ))}
            </select>
            <input
              type="text"
              value={pairBReps}
              onChange={e => setPairBReps(e.target.value)}
              placeholder="Reps (e.g., 8-10)"
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm mt-2"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm text-neutral-400">Rest between exercises:</label>
          <select
            value={restBetween}
            onChange={e => setRestBetween(Number(e.target.value))}
            className="bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
          >
            {[0, 10, 15, 20, 30, 45, 60].map(s => (
              <option key={s} value={s}>{s === 0 ? 'No rest' : `${s}s`}</option>
            ))}
          </select>
        </div>
        <button
          onClick={addPair}
          disabled={!pairA || !pairB}
          className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-500 transition-colors"
        >
          + Add Pair
        </button>
      </div>

      {/* Current Pairs */}
      {(config.exercisePairs || []).length > 0 && (
        <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
          <h3 className="text-lg font-semibold text-white mb-4">Exercise Pairs</h3>
          <div className="space-y-3">
            {(config.exercisePairs || []).map((pair, i) => (
              <div key={i} className="bg-neutral-800 rounded-lg p-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">
                    <span className="font-semibold">{pair.exerciseA.exerciseName}</span>
                    <span className="text-neutral-400"> × {pair.exerciseA.reps}</span>
                  </div>
                  <div className="text-xs text-neutral-400">↕ {pair.restBetweenExercises}s rest</div>
                  <div className="text-sm text-white">
                    <span className="font-semibold">{pair.exerciseB.exerciseName}</span>
                    <span className="text-neutral-400"> × {pair.exerciseB.reps}</span>
                  </div>
                </div>
                <button onClick={() => removePair(i)} className="text-neutral-500 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rounds & Rest */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Rounds</label>
            <select
              value={config.rounds || 3}
              onChange={e => setConfig(prev => ({ ...prev, rounds: Number(e.target.value) }))}
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700"
            >
              {[2, 3, 4, 5, 6].map(r => (
                <option key={r} value={r}>{r} rounds</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Rest Between Supersets</label>
            <select
              value={config.restBetweenSupersets || 90}
              onChange={e => setConfig(prev => ({ ...prev, restBetweenSupersets: Number(e.target.value) }))}
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700"
            >
              {[30, 45, 60, 90, 120, 150, 180].map(s => (
                <option key={s} value={s}>{s}s ({(s / 60).toFixed(1)} min)</option>
              ))}
            </select>
          </div>
        </div>
        {(config.exercisePairs || []).length > 0 && (
          <div className="mt-4 p-3 bg-neutral-800 rounded-lg text-center">
            <span className="text-sm text-neutral-400">Estimated duration: </span>
            <span className="text-lg font-bold text-red-400">~{totalTime} min</span>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={(config.exercisePairs || []).length === 0}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-500 transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Superset Config'}
      </button>
    </div>
  );
};

export default SupersetBuilderView;
