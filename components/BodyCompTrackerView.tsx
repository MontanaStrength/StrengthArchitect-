import React, { useState } from 'react';
import { BodyCompEntry } from '../types';
import { BarChart3, Plus, Trash2 } from 'lucide-react';

interface Props {
  entries: BodyCompEntry[];
  onSave: (entry: BodyCompEntry) => void;
  onDelete: (id: string) => void;
}

const BodyCompTrackerView: React.FC<Props> = ({ entries, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [weightLbs, setWeightLbs] = useState(180);
  const [bodyFatPct, setBodyFatPct] = useState<number | undefined>();
  const [waistInches, setWaistInches] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const entry: BodyCompEntry = {
      id: crypto.randomUUID(),
      date: Date.now(),
      weightLbs,
      bodyFatPct,
      waistInches,
      muscleMassLbs: bodyFatPct ? Math.round(weightLbs * (1 - bodyFatPct / 100)) : undefined,
      notes: notes || undefined,
    };
    onSave(entry);
    setShowAdd(false);
    setNotes('');
  };

  const sorted = [...entries].sort((a, b) => b.date - a.date);
  const latest = sorted[0];
  const previous = sorted[1];
  const weightDelta = latest && previous ? latest.weightLbs - previous.weightLbs : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-red-500" /> Body Composition
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Log Entry
        </button>
      </div>

      {/* Current Stats */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">Weight</p>
            <p className="text-2xl font-bold text-white">{latest.weightLbs}</p>
            {weightDelta !== 0 && (
              <p className={`text-xs ${weightDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} lbs
              </p>
            )}
          </div>
          {latest.bodyFatPct && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">Body Fat</p>
              <p className="text-2xl font-bold text-white">{latest.bodyFatPct}%</p>
            </div>
          )}
          {latest.muscleMassLbs && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">Lean Mass</p>
              <p className="text-2xl font-bold text-white">{latest.muscleMassLbs} lbs</p>
            </div>
          )}
          {latest.waistInches && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">Waist</p>
              <p className="text-2xl font-bold text-white">{latest.waistInches}"</p>
            </div>
          )}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Weight (lbs)*</label>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Body Fat %</label>
              <input type="number" value={bodyFatPct || ''} step={0.1} onChange={e => setBodyFatPct(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Waist (in)</label>
              <input type="number" value={waistInches || ''} step={0.25} onChange={e => setWaistInches(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" placeholder="e.g., morning, fasted" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* History */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p>No body comp entries yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => (
            <div key={e.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">{e.weightLbs} lbs{e.bodyFatPct ? ` • ${e.bodyFatPct}% BF` : ''}{e.waistInches ? ` • ${e.waistInches}" waist` : ''}</p>
                <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}{e.notes ? ` — ${e.notes}` : ''}</p>
              </div>
              <button onClick={() => { if (confirm('Delete?')) onDelete(e.id); }} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BodyCompTrackerView;
