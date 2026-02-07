import React, { useState } from 'react';
import { CustomTemplate, CustomTemplateExercise, TrainingGoalFocus } from '../types';
import { getAllExercises } from '../services/exerciseLibrary';
import { LayoutList, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  templates: CustomTemplate[];
  onSave: (template: CustomTemplate) => void;
  onDelete: (id: string) => void;
}

const CustomTemplateBuilder: React.FC<Props> = ({ templates, onSave, onDelete }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [focusArea, setFocusArea] = useState<TrainingGoalFocus>('strength');
  const [duration, setDuration] = useState(60);
  const [exercises, setExercises] = useState<CustomTemplateExercise[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allExercises = getAllExercises();

  const addExercise = () => {
    setExercises(prev => [...prev, {
      exerciseId: '',
      exerciseName: '',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
    }]);
  };

  const updateExercise = (index: number, updates: Partial<CustomTemplateExercise>) => {
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name || exercises.length === 0) return;
    const template: CustomTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      exercises,
      defaultDurationMin: duration,
      focusArea,
      createdAt: Date.now(),
    };
    onSave(template);
    setShowCreate(false);
    setName('');
    setDescription('');
    setExercises([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><LayoutList size={24} className="text-red-500" /> Custom Templates</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"><Plus size={16} /> New Template</button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Create Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My Upper Day" className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Focus</label>
              <select value={focusArea} onChange={e => setFocusArea(e.target.value as TrainingGoalFocus)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                <option value="strength">Strength</option><option value="hypertrophy">Hypertrophy</option><option value="power">Power</option><option value="endurance">Endurance</option><option value="general">General</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-semibold">Exercises ({exercises.length})</label>
              <button onClick={addExercise} className="text-xs text-red-400 hover:text-red-300">+ Add Exercise</button>
            </div>
            {exercises.map((ex, i) => (
              <div key={i} className="bg-neutral-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={ex.exerciseId}
                    onChange={e => {
                      const found = allExercises.find(a => a.id === e.target.value);
                      updateExercise(i, { exerciseId: e.target.value, exerciseName: found?.name || '' });
                    }}
                    className="flex-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-xs"
                  >
                    <option value="">Select exercise...</option>
                    {allExercises.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button onClick={() => removeExercise(i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Sets</label>
                    <input type="number" value={ex.sets} onChange={e => updateExercise(i, { sets: Number(e.target.value) })} className="w-full p-1 rounded bg-neutral-800 border border-neutral-700 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Reps</label>
                    <input value={ex.reps} onChange={e => updateExercise(i, { reps: e.target.value })} className="w-full p-1 rounded bg-neutral-800 border border-neutral-700 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">%1RM</label>
                    <input type="number" value={ex.percentOf1RM || ''} onChange={e => updateExercise(i, { percentOf1RM: Number(e.target.value) || undefined })} className="w-full p-1 rounded bg-neutral-800 border border-neutral-700 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Rest (s)</label>
                    <input type="number" value={ex.restSeconds} onChange={e => updateExercise(i, { restSeconds: Number(e.target.value) })} className="w-full p-1 rounded bg-neutral-800 border border-neutral-700 text-white text-xs text-center" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!name || exercises.length === 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">Save Template</button>
            <button onClick={() => { setShowCreate(false); setExercises([]); }} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Template List */}
      {templates.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-gray-500"><LayoutList size={48} className="mx-auto mb-3 opacity-30" /><p>No custom templates yet.</p></div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="p-3 cursor-pointer flex justify-between items-center" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.exercises.length} exercises • {t.defaultDurationMin} min • {t.focusArea}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(t.id); }} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-neutral-800 p-3 space-y-1">
                    {t.description && <p className="text-xs text-gray-400 mb-2">{t.description}</p>}
                    {t.exercises.map((ex, i) => (
                      <div key={i} className="flex justify-between text-xs py-1">
                        <span className="text-gray-300">{ex.exerciseName || ex.exerciseId}</span>
                        <span className="text-gray-500">{ex.sets}×{ex.reps}{ex.percentOf1RM ? ` @ ${ex.percentOf1RM}%` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomTemplateBuilder;
