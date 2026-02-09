import React, { useState } from 'react';
import { SleepEntry, SleepQuality } from '../types';
import { Moon, Plus, Trash2 } from 'lucide-react';

interface Props {
  entries: SleepEntry[];
  onSave: (entry: SleepEntry) => void;
  onDelete: (id: string) => void;
}

const SleepJournalView: React.FC<Props> = ({ entries, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState<SleepQuality>('good');
  const [notes, setNotes] = useState('');
  const [hrv, setHrv] = useState<number | undefined>();
  const [restingHR, setRestingHR] = useState<number | undefined>();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    const entry: SleepEntry = {
      id: crypto.randomUUID(),
      date,
      hoursSlept: hours,
      quality,
      notes: notes || undefined,
      hrv,
      restingHR,
    };
    onSave(entry);
    setShowAdd(false);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const qualityColor: Record<SleepQuality, string> = {
    poor: 'bg-amber-900/50 text-amber-300',
    fair: 'bg-yellow-900/50 text-yellow-300',
    good: 'bg-blue-900/50 text-blue-300',
    excellent: 'bg-green-900/50 text-green-300',
  };

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const avg7 = sorted.slice(0, 7);
  const avgHours = avg7.length > 0 ? avg7.reduce((s, e) => s + e.hoursSlept, 0) / avg7.length : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Moon size={24} className="text-blue-400" /> Sleep Journal</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg"><Plus size={16} /> Log Sleep</button>
      </div>

      {/* Summary */}
      {avg7.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">7-Day Average</p>
            <p className="text-2xl font-bold text-white">{avgHours.toFixed(1)}h</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">Last Night</p>
            <p className="text-2xl font-bold text-white">{sorted[0].hoursSlept}h</p>
            <p className={`text-xs mt-0.5 px-2 py-0.5 rounded inline-block ${qualityColor[sorted[0].quality]}`}>{sorted[0].quality}</p>
          </div>
          {sorted[0].hrv && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400">Latest HRV</p>
              <p className="text-2xl font-bold text-white">{sorted[0].hrv} ms</p>
            </div>
          )}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Hours Slept</label>
              <input type="number" step={0.25} value={hours} onChange={e => setHours(Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Quality</label>
              <select value={quality} onChange={e => setQuality(e.target.value as SleepQuality)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm">
                <option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">HRV (optional)</label>
              <input type="number" value={hrv || ''} onChange={e => setHrv(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" placeholder="ms" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Resting HR (optional)</label>
              <input type="number" value={restingHR || ''} onChange={e => setRestingHR(Number(e.target.value) || undefined)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" placeholder="bpm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" placeholder="e.g., woke up once, stressed" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Entries */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><Moon size={48} className="mx-auto mb-3 opacity-30" /><p>No sleep entries yet.</p></div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => (
            <div key={e.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">{e.hoursSlept}h — <span className={`px-1.5 py-0.5 rounded text-xs ${qualityColor[e.quality]}`}>{e.quality}</span></p>
                <p className="text-xs text-gray-500">{e.date}{e.hrv ? ` • HRV ${e.hrv}ms` : ''}{e.restingHR ? ` • RHR ${e.restingHR}bpm` : ''}{e.notes ? ` — ${e.notes}` : ''}</p>
              </div>
              <button onClick={() => { if (confirm('Delete?')) onDelete(e.id); }} className="text-gray-600 hover:text-amber-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SleepJournalView;
