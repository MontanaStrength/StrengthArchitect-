import React, { useState } from 'react';
import { StrengthTestResult, StrengthTestType } from '../types';
import { estimate1RM } from '../utils';
import { ClipboardList, Plus } from 'lucide-react';

interface Props {
  tests: StrengthTestResult[];
  weightLbs: number;
  onSave: (result: StrengthTestResult) => void;
}

const StrengthTestView: React.FC<Props> = ({ tests, weightLbs, onSave }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [testType, setTestType] = useState<StrengthTestType>('1rm-test');
  const [exerciseId, setExerciseId] = useState('back_squat');
  const [exerciseName, setExerciseName] = useState('Back Squat');
  const [weight, setWeight] = useState(225);
  const [reps, setReps] = useState(1);
  const [rpe, setRpe] = useState<number | undefined>();

  const exercises = [
    { id: 'back_squat', name: 'Back Squat' },
    { id: 'bench_press', name: 'Bench Press' },
    { id: 'conventional_deadlift', name: 'Deadlift' },
    { id: 'overhead_press', name: 'Overhead Press' },
    { id: 'front_squat', name: 'Front Squat' },
    { id: 'barbell_row', name: 'Barbell Row' },
  ];

  const testTypeLabels: Record<StrengthTestType, { label: string; reps: number }> = {
    '1rm-test': { label: '1RM Test', reps: 1 },
    '3rm-test': { label: '3RM Test', reps: 3 },
    '5rm-test': { label: '5RM Test', reps: 5 },
    'amrap-test': { label: 'AMRAP Test', reps: 0 },
  };

  const handleSave = () => {
    const est = estimate1RM(weight, reps);
    const result: StrengthTestResult = {
      id: crypto.randomUUID(),
      testType,
      date: Date.now(),
      exerciseId,
      exerciseName,
      weight,
      reps,
      estimated1RM: est,
      rpe,
    };
    onSave(result);
    setShowAdd(false);
  };

  // Best per exercise
  const bestByExercise = new Map<string, StrengthTestResult>();
  for (const t of tests) {
    const existing = bestByExercise.get(t.exerciseId);
    if (!existing || t.estimated1RM > existing.estimated1RM) {
      bestByExercise.set(t.exerciseId, t);
    }
  }

  const wilksCoefficient = (bodyWeight: number, total: number): number => {
    // Simplified Wilks for male (approx)
    const x = bodyWeight * 0.453592; // kg
    const a = -216.0475144;
    const b = 16.2606339;
    const c = -0.002388645;
    const d = -0.00113732;
    const e = 7.01863e-6;
    const f = -1.291e-8;
    const denom = a + b * x + c * x ** 2 + d * x ** 3 + e * x ** 4 + f * x ** 5;
    return denom !== 0 ? (total * 0.453592 * 500) / Math.abs(denom) : 0;
  };

  const bigThreeTotal = (['back_squat', 'bench_press', 'conventional_deadlift'] as string[])
    .reduce((sum, id) => sum + (bestByExercise.get(id)?.estimated1RM || 0), 0);

  const sorted = [...tests].sort((a, b) => b.date - a.date);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardList size={24} className="text-amber-500" /> Strength Tests</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg"><Plus size={16} /> New Test</button>
      </div>

      {/* Summary Cards */}
      {bigThreeTotal > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['back_squat', 'bench_press', 'conventional_deadlift', 'overhead_press'] as string[]).map(id => {
            const best = bestByExercise.get(id);
            const name = exercises.find(e => e.id === id)?.name || id;
            return (
              <div key={id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">{name}</p>
                <p className="text-xl font-bold text-white">{best ? `${Math.round(best.estimated1RM)}` : '—'}</p>
                <p className="text-[10px] text-gray-500">est. 1RM</p>
              </div>
            );
          })}
        </div>
      )}

      {bigThreeTotal > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">S/B/D Total</p>
            <p className="text-2xl font-bold text-amber-400">{Math.round(bigThreeTotal)} lbs</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Wilks (approx)</p>
            <p className="text-xl font-bold text-yellow-400">{wilksCoefficient(weightLbs, bigThreeTotal).toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Test Type</label>
              <select value={testType} onChange={e => { setTestType(e.target.value as StrengthTestType); setReps(testTypeLabels[e.target.value as StrengthTestType].reps); }} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                {Object.entries(testTypeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Exercise</label>
              <select value={exerciseId} onChange={e => { setExerciseId(e.target.value); setExerciseName(exercises.find(ex => ex.id === e.target.value)?.name || ''); }} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Weight (lbs)</label>
              <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Reps</label>
              <input type="number" value={reps} onChange={e => setReps(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">RPE</label>
              <input type="number" min={1} max={10} step={0.5} value={rpe || ''} onChange={e => setRpe(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>
          {weight > 0 && reps > 0 && (
            <p className="text-sm text-gray-400">Estimated 1RM: <span className="text-white font-bold">{Math.round(estimate1RM(weight, reps))} lbs</span></p>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg">Save Test</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* History */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><ClipboardList size={48} className="mx-auto mb-3 opacity-30" /><p>No strength tests recorded yet.</p></div>
      ) : (
        <div className="space-y-2">
          {sorted.map(t => (
            <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">{t.exerciseName} — {t.weight}×{t.reps}{t.rpe ? ` @ RPE ${t.rpe}` : ''}</p>
                <p className="text-xs text-gray-500">{testTypeLabels[t.testType].label} • {new Date(t.date).toLocaleDateString()} • Est 1RM: {Math.round(t.estimated1RM)} lbs</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrengthTestView;
