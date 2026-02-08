import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import {
  calculateSetFatigueScore,
  calculateSessionFatigueScore,
  getFatigueZone,
  reverseCalculateReps,
  FATIGUE_ZONES,
} from '../services/optimizerEngine';

// ─── Types ───────────────────────────────────────────────
interface SetEntry {
  id: number;
  intensity: string; // %1RM
  reps: string;
}

type Tab = 'forward' | 'reverse';

// ─── Zone Colors (same palette as Frederick for consistency) ──
const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  light:           { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  moderate:        { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400' },
  'moderate-high': { bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  text: 'text-orange-400' },
  high:            { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
  extreme:         { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400' },
};

// ─── Component ───────────────────────────────────────────
const HanleyToolView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reverse');

  // ── Forward calculator state ──
  const [sets, setSets] = useState<SetEntry[]>([
    { id: 1, intensity: '', reps: '' },
  ]);
  const [shakingSetId, setShakingSetId] = useState<number | null>(null);

  // ── Reverse calculator state ──
  const [revIntensity, setRevIntensity] = useState('80');
  const [revTargetZone, setRevTargetZone] = useState<'light' | 'moderate' | 'moderate-high' | 'high' | 'extreme'>('moderate');

  // ── Forward helpers ──
  const DEFAULT_INTENSITY = 80;
  const DEFAULT_REPS = 5;

  const addSet = () => {
    const first = sets[0];
    setSets(prev => [
      ...prev,
      { id: Date.now(), intensity: first?.intensity || '', reps: first?.reps || '' },
    ]);
  };

  const removeSet = (id: number) => {
    if (sets.length > 1) setSets(prev => prev.filter(s => s.id !== id));
  };

  const updateSet = (id: number, field: 'intensity' | 'reps', value: string) => {
    let v = value;
    if (field === 'intensity' && v !== '') {
      const n = parseFloat(v);
      if (!isNaN(n)) {
        if (n > 99) {
          setShakingSetId(id);
          setTimeout(() => setShakingSetId(null), 500);
        }
        v = String(Math.min(99, Math.max(0, n)));
      }
    }
    setSets(prev => prev.map(s => (s.id === id ? { ...s, [field]: v } : s)));
  };

  // Forward computed values
  const setScores = useMemo(() => {
    return sets.map(s => {
      const intensity = s.intensity ? parseFloat(s.intensity) : DEFAULT_INTENSITY;
      const reps = s.reps ? parseFloat(s.reps) : DEFAULT_REPS;
      if (isNaN(intensity) || isNaN(reps) || reps <= 0) return 0;
      return calculateSetFatigueScore(reps, intensity);
    });
  }, [sets]);

  const totalScore = useMemo(() => setScores.reduce((a, b) => a + b, 0), [setScores]);
  const zone = useMemo(() => getFatigueZone(totalScore), [totalScore]);
  const zoneColor = ZONE_COLORS[zone.zone] || ZONE_COLORS.moderate;

  // Forward verdict
  const volumeVerdict = useMemo(() => {
    if (totalScore < 250) return { label: 'Very low volume', desc: 'Minimal neuromuscular stress. Suitable for deload or technique work.', color: 'text-neutral-400' };
    if (totalScore < 400) return { label: 'Light volume', desc: 'Low fatigue cost. Could add volume if the goal demands it.', color: 'text-emerald-400' };
    if (totalScore < 500) return { label: 'Moderate volume', desc: 'Balanced stimulus-to-fatigue ratio for most goals.', color: 'text-amber-400' };
    if (totalScore < 600) return { label: 'Moderate-high volume', desc: 'Solid workload. Effective for hypertrophy and strength accumulation.', color: 'text-orange-400' };
    if (totalScore < 700) return { label: 'High volume', desc: 'Significant fatigue. Ensure adequate recovery before next session.', color: 'text-red-400' };
    return { label: 'Extreme — diminishing returns', desc: 'Very high neuromuscular cost. Risk of under-recovery. Consider splitting across sessions.', color: 'text-purple-400' };
  }, [totalScore]);

  // ── Reverse computed values ──
  const revIntVal = parseFloat(revIntensity) || 80;
  const revZoneObj = FATIGUE_ZONES.find(z => z.zone === revTargetZone)!;
  const revMidTarget = (revZoneObj.min + Math.min(revZoneObj.max, 999)) / 2;
  const revMinReps = Math.max(1, Math.ceil(reverseCalculateReps(revZoneObj.min || 1, Math.min(revIntVal, 99))));
  const revMaxReps = Math.floor(reverseCalculateReps(Math.min(revZoneObj.max, 999), Math.min(revIntVal, 99)));
  const revMidReps = Math.round(reverseCalculateReps(revMidTarget, Math.min(revIntVal, 99)));
  const revMultiplier = Math.pow(100 / (100 - Math.min(revIntVal, 99)), 2);

  // Reverse: show example set divisions
  const exampleDivisions = useMemo(() => {
    const total = revMidReps;
    if (total <= 0) return [];
    const divisions: { label: string; sets: number; reps: number }[] = [];

    // Try common set counts
    for (const setCount of [3, 4, 5, 6, 8, 10]) {
      const repsPerSet = total / setCount;
      if (repsPerSet >= 1 && repsPerSet <= 20 && Number.isFinite(repsPerSet)) {
        const rounded = Math.round(repsPerSet);
        if (rounded >= 1) {
          divisions.push({ label: `${setCount} × ${rounded}`, sets: setCount, reps: rounded });
        }
      }
    }
    return divisions.slice(0, 4); // show max 4
  }, [revMidReps]);

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator size={24} className="text-amber-500" />
          Volume Stress Calculator
        </h2>
        <p className="text-neutral-400 text-sm mt-1">
          Quantify per-exercise fatigue load using intensity and volume.
          The reverse calculator prescribes target total reps per exercise — the optimizer's volume blueprint.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
        <button
          onClick={() => setActiveTab('reverse')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'reverse'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-neutral-400 hover:text-white border border-transparent'
          }`}
        >
          <ArrowRightLeft size={14} />
          Reverse Prescriptor
        </button>
        <button
          onClick={() => setActiveTab('forward')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'forward'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-neutral-400 hover:text-white border border-transparent'
          }`}
        >
          <Calculator size={14} />
          Forward Calculator
        </button>
      </div>

      {/* ═══════════════════ REVERSE TAB ═══════════════════ */}
      {activeTab === 'reverse' && (
        <div className="space-y-5">
          {/* Input card */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <h3 className="text-sm font-semibold text-white mb-4">Prescribe Reps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Intensity slider */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500">Intensity (%1RM)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={40}
                    max={97}
                    value={revIntVal}
                    onChange={e => setRevIntensity(e.target.value)}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-amber-400 font-bold font-mono w-12 text-right">{revIntVal}%</span>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Multiplier: {revMultiplier.toFixed(1)}× per rep
                </p>
              </div>

              {/* Zone selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500">Target Zone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FATIGUE_ZONES.filter(z => z.zone !== 'extreme').map(z => {
                    const c = ZONE_COLORS[z.zone];
                    const isActive = revTargetZone === z.zone;
                    return (
                      <button
                        key={z.zone}
                        onClick={() => setRevTargetZone(z.zone)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          isActive
                            ? `${c.bg} ${c.border} ${c.text} ring-1 ring-amber-500/30`
                            : `bg-neutral-800/50 border-neutral-700/50 text-neutral-500 hover:text-neutral-300`
                        }`}
                      >
                        {z.label}
                        <span className="block text-[10px] opacity-60 mt-0.5">{z.min}–{z.max}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Result card — the star feature */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <div className="text-center space-y-4">
              <p className="text-neutral-400 text-sm">At <span className="text-amber-400 font-bold">{revIntVal}%</span> 1RM, to hit the <span className={`font-bold ${ZONE_COLORS[revTargetZone]?.text}`}>{revZoneObj.label}</span> zone:</p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-white font-mono">{revMidReps}</p>
                  <p className="text-xs text-neutral-500 mt-1">target total reps</p>
                </div>
                <div className="h-16 w-px bg-neutral-700" />
                <div className="text-center text-sm text-neutral-400">
                  <p>Range: <span className="text-neutral-200 font-mono">{revMinReps}–{revMaxReps}</span></p>
                  <p className="text-[10px] mt-1 text-neutral-500">
                    Score {revZoneObj.min}–{Math.min(revZoneObj.max, 999)}
                  </p>
                </div>
              </div>

              {/* Example divisions */}
              {exampleDivisions.length > 0 && (
                <div className="pt-3 border-t border-neutral-800">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Example set divisions</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {exampleDivisions.map((d, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700/50 text-sm text-neutral-300 font-mono"
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2 italic">
                    Set/rep division is refined by the Frederick formula (hypertrophy) or future strength/power logic.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick reference table */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Reference: Reps to Hit Moderate Zone (400–500)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Intensity</th>
                  <th className="text-right py-2 px-3">Multiplier</th>
                  <th className="text-right py-2 px-3">Min Reps</th>
                  <th className="text-right py-2 px-3">Max Reps</th>
                  <th className="text-right py-2 px-3">Example</th>
                </tr>
              </thead>
              <tbody>
                {[60, 65, 70, 75, 80, 85, 90].map(pct => {
                  const mult = Math.pow(100 / (100 - pct), 2);
                  const minR = Math.ceil(400 / mult);
                  const maxR = Math.floor(500 / mult);
                  // Suggest a clean set×rep
                  const mid = Math.round(450 / mult);
                  const bestSets = [3,4,5,6].find(s => mid / s >= 1 && mid / s <= 20) || 4;
                  const bestReps = Math.round(mid / bestSets);
                  return (
                    <tr key={pct} className="border-t border-neutral-800/50 text-neutral-300">
                      <td className="py-2 px-3 font-mono text-amber-400">{pct}%</td>
                      <td className="py-2 px-3 text-right font-mono">{mult.toFixed(1)}×</td>
                      <td className="py-2 px-3 text-right font-mono">{minR}</td>
                      <td className="py-2 px-3 text-right font-mono">{maxR}</td>
                      <td className="py-2 px-3 text-right text-neutral-400 font-mono">{bestSets}×{bestReps}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════ FORWARD TAB ═══════════════════ */}
      {activeTab === 'forward' && (
        <div className="space-y-5">
          {/* Set inputs */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Exercise Sets</h3>
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
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-500">Intensity %</label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={set.intensity}
                        onChange={e => updateSet(set.id, 'intensity', e.target.value)}
                        placeholder="80"
                        className={`w-full px-3 py-1.5 bg-neutral-800 border rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-all ${
                          shakingSetId === set.id ? 'border-red-500 animate-pulse' : 'border-neutral-700'
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
                        placeholder="5"
                        className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                  {/* Per-set score badge */}
                  <span className="text-xs text-neutral-500 font-mono w-14 text-right shrink-0">
                    {setScores[index] > 0 ? setScores[index].toFixed(1) : '—'}
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

          {/* Total score result */}
          {totalScore > 0 && (
            <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-neutral-400 text-sm mb-1">Exercise Fatigue Score</p>
                  <p className="text-4xl font-bold text-amber-400 font-mono">
                    {totalScore.toFixed(1)}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-full ${zoneColor.bg} border ${zoneColor.border}`}>
                  <span className={`font-semibold ${zoneColor.text}`}>{zone.label}</span>
                </div>
              </div>

              {/* Volume verdict */}
              <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                <p className={`text-sm font-semibold ${volumeVerdict.color}`}>{volumeVerdict.label}</p>
                <p className="text-xs text-neutral-400 mt-1">{volumeVerdict.desc}</p>
              </div>

              {/* Zone bar */}
              <div className="mt-4 relative">
                <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-neutral-800">
                  {FATIGUE_ZONES.map(z => {
                    const zMax = z.zone === 'extreme' ? 1000 : z.max;
                    const width = ((zMax - z.min) / 1000) * 100;
                    const c = ZONE_COLORS[z.zone];
                    return (
                      <div
                        key={z.zone}
                        className={`h-full ${c.bg} border-r border-neutral-700/50`}
                        style={{ width: `${width}%` }}
                        title={`${z.label}: ${z.min}–${z.zone === 'extreme' ? '∞' : z.max}`}
                      />
                    );
                  })}
                  {/* Marker */}
                  <div
                    className="absolute h-5 w-0.5 bg-white rounded-full shadow-lg"
                    style={{ left: `${Math.min(100, (totalScore / 1000) * 100)}%`, top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                  <span>0</span>
                  <span>400</span>
                  <span>500</span>
                  <span>600</span>
                  <span>700</span>
                  <span>1000+</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ SHARED FOOTER ═══════════════════ */}

      {/* Zone reference */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-white mb-3">Volume Stress Zones</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FATIGUE_ZONES.map(z => {
            const c = ZONE_COLORS[z.zone];
            const isActive =
              (activeTab === 'forward' && zone.zone === z.zone && totalScore > 0) ||
              (activeTab === 'reverse' && revTargetZone === z.zone);
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
                  {z.zone === 'extreme' ? '≥ 700' : `${z.min}–${z.max}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it feeds the optimizer */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-white mb-2">How This Feeds the Optimizer</h3>
        <p className="text-xs text-neutral-400 leading-relaxed">
          When the optimizer is enabled, the <span className="text-amber-400">Hanley fatigue metric</span> uses the
          reverse calculator to prescribe <span className="text-amber-400">total reps per exercise</span> at the
          recommended intensity. This gives the AI a concrete volume target for each lift.
          The <span className="text-amber-400">Frederick metabolic stress</span> formula then refines the
          set/rep division for hypertrophy-biased sessions, ensuring each set lands in the productive metabolic zone.
          Together they form a two-stage prescription pipeline: <em>Hanley → total reps</em>, then <em>Frederick → set structure</em>.
        </p>
      </div>

      {/* Formula */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Formula</h3>
        <p className="text-neutral-300 text-sm font-mono leading-relaxed">
          Score = Reps × (100 / (100 − Intensity))<sup>2</sup>
        </p>
        <p className="text-neutral-400 text-xs font-mono mt-2">
          Reverse: Reps = TargetScore / (100 / (100 − Intensity))<sup>2</sup>
        </p>
        <p className="text-xs text-neutral-500 mt-2">
          The quadratic penalty models the exponential neuromuscular cost of high-intensity lifting.
          At 90% 1RM each rep costs 100 fatigue points; at 70% only ~11.
        </p>
      </div>
    </div>
  );
};

export default HanleyToolView;
