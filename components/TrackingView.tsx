import React, { useState } from 'react';
import { SleepEntry, SleepQuality, BodyCompEntry } from '../types';
import { Moon, BarChart3, Plus, Trash2, Activity } from 'lucide-react';

interface Props {
  sleepEntries: SleepEntry[];
  onSaveSleep: (entry: SleepEntry) => void;
  onDeleteSleep: (id: string) => void;
  bodyCompEntries: BodyCompEntry[];
  onSaveBodyComp: (entry: BodyCompEntry) => void;
  onDeleteBodyComp: (id: string) => void;
}

type Tab = 'sleep' | 'body';

const TrackingView: React.FC<Props> = ({
  sleepEntries, onSaveSleep, onDeleteSleep,
  bodyCompEntries, onSaveBodyComp, onDeleteBodyComp,
}) => {
  const [tab, setTab] = useState<Tab>('sleep');

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Activity size={24} className="text-amber-500" /> Tracking
      </h2>

      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
        {([
          { id: 'sleep' as Tab, label: 'Sleep', icon: <Moon size={14} /> },
          { id: 'body' as Tab, label: 'Body Comp', icon: <BarChart3 size={14} /> },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-amber-500 text-black'
                : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'sleep' && <SleepTab entries={sleepEntries} onSave={onSaveSleep} onDelete={onDeleteSleep} />}
      {tab === 'body' && <BodyCompTab entries={bodyCompEntries} onSave={onSaveBodyComp} onDelete={onDeleteBodyComp} />}
    </div>
  );
};

/* ── SLEEP TAB ──────────────────────────────────────── */
const SleepTab: React.FC<{ entries: SleepEntry[]; onSave: (e: SleepEntry) => void; onDelete: (id: string) => void }> = ({ entries, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState<SleepQuality>('good');
  const [notes, setNotes] = useState('');
  const [hrv, setHrv] = useState<number | undefined>();
  const [restingHR, setRestingHR] = useState<number | undefined>();

  const handleSave = () => {
    const entry: SleepEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      hoursSlept: hours,
      quality,
      notes: notes || undefined,
      hrv,
      restingHR,
    };
    onSave(entry);
    setShowAdd(false);
    setNotes('');
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg">
          <Plus size={16} /> Log Sleep
        </button>
      </div>

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

      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
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

/* ── BODY COMP TAB ──────────────────────────────────── */
const BodyCompTab: React.FC<{ entries: BodyCompEntry[]; onSave: (e: BodyCompEntry) => void; onDelete: (id: string) => void }> = ({ entries, onSave, onDelete }) => {
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-all">
          <Plus size={16} /> Log Entry
        </button>
      </div>

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">Weight</p>
            <p className="text-2xl font-bold text-white">{latest.weightLbs}</p>
            {weightDelta !== 0 && (
              <p className={`text-xs ${weightDelta > 0 ? 'text-amber-400' : 'text-green-400'}`}>
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
            <button onClick={handleSave} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-neutral-800 text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

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
              <button onClick={() => { if (confirm('Delete?')) onDelete(e.id); }} className="text-gray-600 hover:text-amber-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackingView;
