import React, { useState } from 'react';
import { TrainingGoal, GoalCategory } from '../types';
import { Target, Plus, Trash2, Check } from 'lucide-react';

interface Props {
  goals: TrainingGoal[];
  onSave: (goal: TrainingGoal) => void;
  onDelete: (id: string) => void;
}

const GoalSettingView: React.FC<Props> = ({ goals, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<GoalCategory>('strength-1rm');
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('lbs');

  const handleSave = () => {
    if (!title) return;
    const goal: TrainingGoal = {
      id: crypto.randomUUID(),
      category,
      title,
      targetValue,
      currentValue,
      unit,
      startDate: Date.now(),
    };
    onSave(goal);
    setShowAdd(false);
    setTitle('');
    setTargetValue(0);
    setCurrentValue(0);
  };

  const handleComplete = (goal: TrainingGoal) => {
    onSave({ ...goal, completedDate: Date.now(), currentValue: goal.targetValue });
  };

  const handleUpdateProgress = (goal: TrainingGoal, value: number) => {
    const updated = { ...goal, currentValue: value };
    if (value >= goal.targetValue) updated.completedDate = Date.now();
    onSave(updated);
  };

  const categoryLabels: Record<GoalCategory, string> = {
    'strength-1rm': '🏋️ Strength PR',
    weight: '⚖️ Body Weight',
    'body-comp': '📏 Body Comp',
    frequency: '📆 Training Frequency',
    volume: '📊 Volume',
    custom: '✏️ Custom',
  };

  const active = goals.filter(g => !g.completedDate);
  const completed = goals.filter(g => g.completedDate);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Target size={24} className="text-green-400" /> Goals</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg"><Plus size={16} /> Add Goal</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Category</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.keys(categoryLabels) as GoalCategory[]).map(c => (
                <button key={c} onClick={() => setCategory(c)} className={`px-2 py-1 rounded text-xs transition-all ${category === c ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Goal Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Squat 315 lbs" className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Current</label>
              <input type="number" value={currentValue} onChange={e => setCurrentValue(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Target</label>
              <input type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Unit</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!title} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {active.length === 0 && completed.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><Target size={48} className="mx-auto mb-3 opacity-30" /><p>No goals yet. Set one to stay motivated!</p></div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Active ({active.length})</h3>
              {active.map(g => {
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                return (
                  <div key={g.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-white">{g.title}</p>
                        <p className="text-xs text-gray-500">{categoryLabels[g.category]} • {g.currentValue} / {g.targetValue} {g.unit}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleComplete(g)} className="p-1 text-gray-500 hover:text-green-400" title="Mark Complete"><Check size={16} /></button>
                        <button onClick={() => { if (confirm('Delete?')) onDelete(g.id); }} className="p-1 text-gray-500 hover:text-amber-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={g.currentValue}
                        onChange={e => handleUpdateProgress(g, Number(e.target.value))}
                        className="w-24 p-1 rounded bg-neutral-800 border border-neutral-700 text-white text-xs text-center"
                      />
                      <span className="text-xs text-gray-500">{pct}% complete</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-green-400">✅ Completed ({completed.length})</h3>
              {completed.map(g => (
                <div key={g.id} className="bg-neutral-900/50 border border-green-900/30 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300 line-through">{g.title}</p>
                    <p className="text-xs text-gray-500">{g.targetValue} {g.unit} • Completed {g.completedDate ? new Date(g.completedDate).toLocaleDateString() : ''}</p>
                  </div>
                  <button onClick={() => { if (confirm('Delete?')) onDelete(g.id); }} className="text-gray-600 hover:text-amber-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoalSettingView;
