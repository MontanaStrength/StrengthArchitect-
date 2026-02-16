import React, { useState } from 'react';
import { SleepEntry, SleepQuality, BodyCompEntry } from '../shared/types';
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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

      {/* Sleep Trend Sparkline */}
      {sorted.length >= 3 && (() => {
        const pts = sorted.slice(0, 14).reverse();
        const minH = Math.min(...pts.map(p => p.hoursSlept)) - 0.5;
        const maxH = Math.max(...pts.map(p => p.hoursSlept)) + 0.5;
        const range = maxH - minH || 1;
        const w = 280, h = 60, pad = 4;
        const points = pts.map((p, i) => {
          const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
          const y = pad + (1 - (p.hoursSlept - minH) / range) * (h - pad * 2);
          return `${x},${y}`;
        }).join(' ');
        const avgY = pad + (1 - (avgHours - minH) / range) * (h - pad * 2);
        return (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Sleep Trend (last {pts.length} nights)</p>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" role="img" aria-label="Sleep trend chart">
              <line x1={pad} y1={avgY} x2={w - pad} y2={avgY} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
              <polyline fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
              {pts.map((p, i) => {
                const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
                const y = pad + (1 - (p.hoursSlept - minH) / range) * (h - pad * 2);
                return <circle key={i} cx={x} cy={y} r="2.5" fill={p.hoursSlept >= 7 ? '#34d399' : p.hoursSlept >= 6 ? '#fbbf24' : '#f87171'} />;
              })}
            </svg>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>{pts[0].date}</span>
              <span className="text-amber-500/60">avg {avgHours.toFixed(1)}h</span>
              <span>{pts[pts.length - 1].date}</span>
            </div>
          </div>
        );
      })()}

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

      {sorted.length === 0 ? (
        <div className="sa-card text-center py-12 px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sa-surface2 flex items-center justify-center mx-auto">
            <Moon size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white">No sleep entries yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Log your sleep to see trends and improve recovery insights on your dashboard.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="sa-btn sa-btn-primary"
          >
            Log your first night
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => (
            <div key={e.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">{e.hoursSlept}h — <span className={`px-1.5 py-0.5 rounded text-xs ${qualityColor[e.quality]}`}>{e.quality}</span></p>
                <p className="text-xs text-gray-500">{e.date}{e.hrv ? ` • HRV ${e.hrv}ms` : ''}{e.restingHR ? ` • RHR ${e.restingHR}bpm` : ''}{e.notes ? ` — ${e.notes}` : ''}</p>
              </div>
              <button onClick={() => setDeleteConfirmId(e.id)} className="text-gray-600 hover:text-amber-400" aria-label="Delete sleep entry"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const entry = sorted.find(e => e.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
              <div className="text-3xl">🗑️</div>
              <h3 className="text-lg font-bold text-white">Delete Sleep Entry?</h3>
              <p className="text-sm text-gray-400">
                {entry ? `${entry.hoursSlept}h — ${entry.quality} (${entry.date})` : 'This entry'} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all">Cancel</button>
                <button onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

/* ── BODY COMP TAB ──────────────────────────────────── */
const BodyCompTab: React.FC<{ entries: BodyCompEntry[]; onSave: (e: BodyCompEntry) => void; onDelete: (id: string) => void }> = ({ entries, onSave, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [weightLbs, setWeightLbs] = useState(180);
  const [bodyFatPct, setBodyFatPct] = useState<number | undefined>();
  const [waistInches, setWaistInches] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    const entry: BodyCompEntry = {
      id: crypto.randomUUID(),
      date: new Date(date + 'T12:00:00').getTime(),
      weightLbs,
      bodyFatPct,
      waistInches,
      muscleMassLbs: bodyFatPct ? Math.round(weightLbs * (1 - bodyFatPct / 100)) : undefined,
      notes: notes || undefined,
    };
    onSave(entry);
    setShowAdd(false);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
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
              <p className="text-xs text-gray-300">
                {weightDelta > 0 ? '↑ +' : '↓ '}{weightDelta.toFixed(1)} lbs
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
          <div>
            <label className="text-xs text-gray-400">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
          </div>
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
        <div className="sa-card text-center py-12 px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sa-surface2 flex items-center justify-center mx-auto">
            <BarChart3 size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white">No body comp entries yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Track weight, body fat, and measurements to see progress over time.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="sa-btn sa-btn-primary"
          >
            Log your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => (
            <div key={e.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">{e.weightLbs} lbs{e.bodyFatPct ? ` • ${e.bodyFatPct}% BF` : ''}{e.waistInches ? ` • ${e.waistInches}" waist` : ''}</p>
                <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}{e.notes ? ` — ${e.notes}` : ''}</p>
              </div>
              <button onClick={() => setDeleteConfirmId(e.id)} className="text-gray-600 hover:text-amber-400" aria-label="Delete body comp entry"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const entry = sorted.find(e => e.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
              <div className="text-3xl">🗑️</div>
              <h3 className="text-lg font-bold text-white">Delete Entry?</h3>
              <p className="text-sm text-gray-400">
                {entry ? `${entry.weightLbs} lbs${entry.bodyFatPct ? ` • ${entry.bodyFatPct}% BF` : ''} (${new Date(entry.date).toLocaleDateString()})` : 'This entry'} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all">Cancel</button>
                <button onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TrackingView;
