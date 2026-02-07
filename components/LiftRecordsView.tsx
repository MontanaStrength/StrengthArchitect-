import React, { useState, useMemo } from 'react';
import { LiftRecord } from '../types';
import { estimate1RM } from '../utils';
import { Trophy, Plus, Trash2, TrendingUp } from 'lucide-react';

interface Props {
  records: LiftRecord[];
  onSave: (record: LiftRecord) => void;
  onDelete: (id: string) => void;
}

const LiftRecordsView: React.FC<Props> = ({ records, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [weight, setWeight] = useState(135);
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState<number | undefined>();

  // Group records by exercise, get best per exercise
  const grouped = useMemo(() => {
    const map = new Map<string, LiftRecord[]>();
    for (const r of records) {
      const arr = map.get(r.exerciseId) || [];
      arr.push(r);
      map.set(r.exerciseId, arr);
    }
    const result: { exerciseId: string; exerciseName: string; best: LiftRecord; history: LiftRecord[] }[] = [];
    for (const [exerciseId, recs] of map.entries()) {
      const sorted = [...recs].sort((a, b) => b.estimated1RM - a.estimated1RM);
      result.push({ exerciseId, exerciseName: sorted[0].exerciseName, best: sorted[0], history: recs.sort((a, b) => b.date - a.date) });
    }
    result.sort((a, b) => b.best.estimated1RM - a.best.estimated1RM);
    return result;
  }, [records]);

  const handleAdd = () => {
    const id = exerciseId || exerciseName.toLowerCase().replace(/\s+/g, '_');
    const est = estimate1RM(weight, reps);
    const record: LiftRecord = {
      id: crypto.randomUUID(),
      exerciseId: id,
      exerciseName: exerciseName,
      weight,
      reps,
      estimated1RM: est,
      date: Date.now(),
      rpe,
    };
    onSave(record);
    setShowAdd(false);
    setExerciseName('');
    setExerciseId('');
  };

  const quickAddExercises = [
    { id: 'back_squat', name: 'Back Squat' },
    { id: 'bench_press', name: 'Bench Press' },
    { id: 'conventional_deadlift', name: 'Deadlift' },
    { id: 'overhead_press', name: 'Overhead Press' },
    { id: 'barbell_row', name: 'Barbell Row' },
    { id: 'front_squat', name: 'Front Squat' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy size={24} className="text-yellow-400" /> Lift Records
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={16} /> Add PR
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Log a Lift</h3>
          <div>
            <label className="text-xs text-gray-400">Quick Select</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {quickAddExercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setExerciseName(ex.name); setExerciseId(ex.id); }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    exerciseId === ex.id ? 'bg-red-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Exercise Name</label>
            <input
              value={exerciseName}
              onChange={e => { setExerciseName(e.target.value); setExerciseId(e.target.value.toLowerCase().replace(/\s+/g, '_')); }}
              className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm"
              placeholder="Exercise name"
            />
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
              <label className="text-xs text-gray-400">RPE (optional)</label>
              <input type="number" value={rpe || ''} min={1} max={10} step={0.5} onChange={e => setRpe(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>
          {weight > 0 && reps > 0 && (
            <p className="text-sm text-gray-400">Estimated 1RM: <span className="text-white font-bold">{Math.round(estimate1RM(weight, reps))} lbs</span></p>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!exerciseName} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm rounded-lg transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Records List */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Trophy size={48} className="mx-auto mb-3 opacity-30" />
          <p>No lift records yet. Complete a session or add a PR manually!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => (
            <div key={g.exerciseId} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-white">{g.exerciseName}</h3>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-400">{Math.round(g.best.estimated1RM)} lbs</p>
                  <p className="text-[10px] text-gray-500">est. 1RM</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">Best: {g.best.weight}×{g.best.reps}{g.best.rpe ? ` @ RPE ${g.best.rpe}` : ''} • {new Date(g.best.date).toLocaleDateString()}</p>
              {/* History (last 5) */}
              {g.history.length > 1 && (
                <div className="space-y-1 border-t border-neutral-800 pt-2">
                  {g.history.slice(0, 5).map(r => (
                    <div key={r.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{new Date(r.date).toLocaleDateString()} — {r.weight}×{r.reps}{r.rpe ? ` RPE ${r.rpe}` : ''}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">e1RM: {Math.round(r.estimated1RM)}</span>
                        <button onClick={() => { if (confirm('Delete?')) onDelete(r.id); }} className="text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiftRecordsView;
