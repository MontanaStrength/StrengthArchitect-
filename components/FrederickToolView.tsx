import React, { useState, useMemo } from 'react';
import { Plus, Trash2, FlaskConical } from 'lucide-react';
import {
  calculateSetMetabolicLoad,
  calculateSessionMetabolicLoad,
  getMetabolicZone,
  METABOLIC_ZONES,
} from '../services/optimizerEngine';

interface SetEntry {
  id: number;
  intensity: string; // %1RM
  reps: string;
  rpe: string;
}

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  light:           { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  moderate:        { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400' },
  'moderate-high': { bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  text: 'text-orange-400' },
  high:            { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
  extreme:         { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400' },
};

const FrederickToolView: React.FC = () => {
  const [sets, setSets] = useState<SetEntry[]>([
    { id: 1, intensity: '', reps: '', rpe: '' },
  ]);
  const [shakingSetId, setShakingSetId] = useState<number | null>(null);

  const addSet = () => {
    const first = sets[0];
    setSets(prev => [
      ...prev,
      {
        id: Date.now(),
        intensity: first?.intensity || '',
        reps: first?.reps || '',
        rpe: first?.rpe || '',
      },
    ]);
  };

  const removeSet = (id: number) => {
    if (sets.length > 1) setSets(prev => prev.filter(s => s.id !== id));
  };

  const updateSet = (id: number, field: keyof Omit<SetEntry, 'id'>, value: string) => {
    let v = value;
    if (field === 'intensity' && v !== '') {
      const n = parseFloat(v);
      if (!isNaN(n)) {
        if (n > 100) {
          setShakingSetId(id);
          setTimeout(() => setShakingSetId(null), 500);
        }
        v = String(Math.min(100, Math.max(0, n)));
      }
    }
    setSets(prev => prev.map(s => (s.id === id ? { ...s, [field]: v } : s)));
  };

  // Defaults for empty fields
  const DEFAULT_INTENSITY = 75;
  const DEFAULT_REPS = 8;
  const DEFAULT_RPE = 8;

  const totalLoad = useMemo(() => {
    return sets.reduce((acc, set) => {
      const intensity = set.intensity ? parseFloat(set.intensity) : DEFAULT_INTENSITY;
      const reps = set.reps ? parseFloat(set.reps) : DEFAULT_REPS;
      const rpe = set.rpe ? parseFloat(set.rpe) : DEFAULT_RPE;
      if (isNaN(intensity) || isNaN(reps) || isNaN(rpe)) return acc;
      return acc + calculateSetMetabolicLoad(intensity, reps, rpe);
    }, 0);
  }, [sets]);

  const zone = useMemo(() => getMetabolicZone(totalLoad), [totalLoad]);
  const zoneColor = ZONE_COLORS[zone.zone] || ZONE_COLORS.moderate;

  // Per-set breakdown
  const setLoads = useMemo(() => {
    return sets.map(set => {
      const intensity = set.intensity ? parseFloat(set.intensity) : DEFAULT_INTENSITY;
      const reps = set.reps ? parseFloat(set.reps) : DEFAULT_REPS;
      const rpe = set.rpe ? parseFloat(set.rpe) : DEFAULT_RPE;
      if (isNaN(intensity) || isNaN(reps) || isNaN(rpe)) return 0;
      return calculateSetMetabolicLoad(intensity, reps, rpe);
    });
  }, [sets]);

  // What this session means for hypertrophy
  const hypertrophyVerdict = useMemo(() => {
    if (totalLoad < 400) return { label: 'Below hypertrophy threshold', desc: 'Add sets, reps, or increase RPE to drive growth.', color: 'text-neutral-400' };
    if (totalLoad < 500) return { label: 'Approaching productive zone', desc: 'Close — a few more working sets will hit the hypertrophy sweet spot.', color: 'text-amber-300' };
    if (totalLoad < 800) return { label: 'Productive hypertrophy zone', desc: 'Optimal metabolic stress for muscle growth. This is the target.', color: 'text-emerald-400' };
    if (totalLoad < 1100) return { label: 'High stress — recoverable?', desc: 'Strong stimulus, but ensure you can recover before next session.', color: 'text-orange-400' };
    return { label: 'Excessive — diminishing returns', desc: 'Recovery cost likely exceeds adaptive benefit. Consider splitting across sessions.', color: 'text-red-400' };
  }, [totalLoad]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FlaskConical size={24} className="text-amber-500" />
          Metabolic Stress Calculator
        </h2>
        <p className="text-neutral-400 text-sm mt-1">
          Quantify session metabolic load using volume, intensity, and proximity to failure.
          The optimizer uses this formula to prescribe hypertrophy set counts.
        </p>
      </div>

      {/* Set inputs */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Session Sets</h3>
          <button
            onClick={addSet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-700 text-neutral-400 hover:text-amber-400 hover:border-amber-500/50 transition-all"
          >
            <Plus size={14} />
            Add Set
          </button>
        </div>

        <div className="space-y-2">
          {sets.map((set, index) => (
            <div
              key={set.id}
              className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50"
            >
              <span className="text-neutral-500 font-medium w-12 text-sm shrink-0">
                Set {index + 1}
              </span>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500">Intensity %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={set.intensity}
                    onChange={e => updateSet(set.id, 'intensity', e.target.value)}
                    placeholder="75"
                    className={`w-full px-3 py-1.5 bg-neutral-800 border rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-all ${
                      shakingSetId === set.id
                        ? 'border-red-500 animate-pulse'
                        : 'border-neutral-700'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500">Reps</label>
                  <input
                    type="number"
                    min={1}
                    value={set.reps}
                    onChange={e => updateSet(set.id, 'reps', e.target.value)}
                    placeholder="8"
                    className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500">RPE</label>
                  <input
                    type="number"
                    min={4}
                    max={10}
                    step={0.5}
                    value={set.rpe}
                    onChange={e => updateSet(set.id, 'rpe', e.target.value)}
                    placeholder="8"
                    className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>
              {/* Per-set load badge */}
              <span className="text-xs text-neutral-500 font-mono w-14 text-right shrink-0">
                {setLoads[index] > 0 ? setLoads[index].toFixed(1) : '—'}
              </span>
              <button
                onClick={() => removeSet(set.id)}
                disabled={sets.length === 1}
                className="text-neutral-600 hover:text-red-400 disabled:opacity-30 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Total load result */}
      {totalLoad > 0 && (
        <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Total Session Load</p>
              <p className="text-4xl font-bold text-amber-400 font-mono">
                {totalLoad.toFixed(1)}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full ${zoneColor.bg} border ${zoneColor.border}`}>
              <span className={`font-semibold ${zoneColor.text}`}>{zone.label}</span>
            </div>
          </div>

          {/* Hypertrophy verdict */}
          <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <p className={`text-sm font-semibold ${hypertrophyVerdict.color}`}>
              {hypertrophyVerdict.label}
            </p>
            <p className="text-xs text-neutral-400 mt-1">{hypertrophyVerdict.desc}</p>
          </div>

          {/* Projected bar */}
          <div className="mt-4">
            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-neutral-800">
              {METABOLIC_ZONES.map(z => {
                const zMax = z.zone === 'extreme' ? 1500 : z.max;
                const width = ((zMax - z.min) / 1500) * 100;
                const c = ZONE_COLORS[z.zone];
                return (
                  <div
                    key={z.zone}
                    className={`h-full ${c.bg} border-r border-neutral-700/50 relative`}
                    style={{ width: `${width}%` }}
                    title={`${z.label}: ${z.min}–${z.zone === 'extreme' ? '∞' : z.max}`}
                  />
                );
              })}
              {/* Marker for current load */}
              <div
                className="absolute h-5 w-0.5 bg-white rounded-full shadow-lg"
                style={{ left: `${Math.min(100, (totalLoad / 1500) * 100)}%`, top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>0</span>
              <span>500</span>
              <span>800</span>
              <span>1100</span>
              <span>1500+</span>
            </div>
          </div>
        </div>
      )}

      {/* Zone reference */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-white mb-3">Zone Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {METABOLIC_ZONES.map(z => {
            const c = ZONE_COLORS[z.zone];
            const isActive = zone.zone === z.zone && totalLoad > 0;
            return (
              <div
                key={z.zone}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isActive
                    ? `${c.bg} ${c.border} ring-1 ring-offset-1 ring-offset-neutral-900 ring-amber-500/30`
                    : `${c.bg} ${c.border} opacity-60`
                }`}
              >
                <p className={`font-semibold text-sm ${c.text}`}>{z.label}</p>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {z.zone === 'extreme' ? '≥ 1100' : `${z.min}–${z.max}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hypertrophy prescription context */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-white mb-2">How This Feeds the Optimizer</h3>
        <p className="text-xs text-neutral-400 leading-relaxed">
          When the optimizer is enabled and the session goal is <span className="text-amber-400">Hypertrophy</span>,
          the engine targets a metabolic load of <span className="text-amber-400">500–800</span> (the productive zone).
          It estimates per-set load at your configured intensity, reps, and RPE, then prescribes the exact number
          of working sets to land in that zone. This means the AI won't just guess volume — it's driven by
          the Frederick formula so every hypertrophy session hits the metabolic sweet spot.
        </p>
      </div>

      {/* Formula */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Formula</h3>
        <p className="text-neutral-300 text-sm font-mono leading-relaxed">
          Load<sub>set</sub> = Intensity × Σ<sub>i=1→reps</sub> e<sup>(-0.215 × (RIR + reps - i))</sup>
        </p>
        <p className="text-xs text-neutral-500 mt-2">
          RIR = 10 − RPE. The exponential decay models increasing metabolic cost as the muscle approaches failure.
        </p>
      </div>
    </div>
  );
};

export default FrederickToolView;
