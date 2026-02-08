import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRightLeft, Plus, Trash2, Zap, Dumbbell } from 'lucide-react';
import {
  calculateSetFatigueScore,
  calculateSessionFatigueScore,
  getFatigueZone,
  reverseCalculateReps,
  estimatePeakForceDropRep,
  prescribeStrengthSets,
  FATIGUE_ZONES,
  PEAK_FORCE_TABLE,
} from '../services/optimizerEngine';

// ─── Types ───────────────────────────────────────────────
interface SetEntry {
  id: number;
  intensity: string; // %1RM
  reps: string;
}

type Tab = 'forward' | 'reverse';
type GoalBias = 'strength' | 'hypertrophy';

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
  const [goalBias, setGoalBias] = useState<GoalBias>('strength');

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

  // ── Peak Force Drop-Off (strength/power set division) ──
  const peakForceData = useMemo(() => {
    const intensity = Math.min(revIntVal, 99);
    const dropRep = estimatePeakForceDropRep(intensity);
    const maxReps = Math.round(30 * (100 / intensity - 1));
    const division = prescribeStrengthSets(revMidReps, intensity);
    return { dropRep, maxReps, ...division };
  }, [revIntVal, revMidReps]);

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
                  {/* Goal bias toggle */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <button
                      onClick={() => setGoalBias('strength')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        goalBias === 'strength'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <Zap size={12} />
                      Strength / Power
                    </button>
                    <button
                      onClick={() => setGoalBias('hypertrophy')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        goalBias === 'hypertrophy'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <Dumbbell size={12} />
                      Hypertrophy
                    </button>
                  </div>

                  {/* Strength/Power: Peak Force prescription */}
                  {goalBias === 'strength' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={14} className="text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Peak Force Prescription</span>
                        </div>
                        <p className="text-sm text-neutral-300">
                          At <span className="text-amber-400 font-bold">{revIntVal}%</span>, peak force drops after rep <span className="text-white font-bold">{peakForceData.dropRep}</span> of {peakForceData.maxReps} possible.
                          Cap every set at <span className="text-white font-bold">{peakForceData.repsPerSet} reps</span> so each rep is a quality force rep.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-4 py-2">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-white font-mono">{peakForceData.sets} × {peakForceData.repsPerSet}</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">{peakForceData.qualityReps} quality reps total</p>
                        </div>
                        <div className="h-12 w-px bg-neutral-700" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-neutral-300 font-mono">{Math.round(peakForceData.restSeconds / 60)}+ min</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">rest between sets</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-500 text-center italic">
                        Full neural recovery between sets ensures maximal rate-of-force development on every rep.
                      </p>
                    </div>
                  )}

                  {/* Hypertrophy: metabolic set divisions (Frederick-informed) */}
                  {goalBias === 'hypertrophy' && (
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Hypertrophy set divisions</p>
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
                      <p className="text-[10px] text-neutral-500 text-center italic">
                        Set/rep division refined by the Frederick metabolic stress formula — target 8-12 reps/set at RPE 8.
                      </p>
                    </div>
                  )}
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

          {/* Peak Force Drop-Off reference */}
          <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-1">Peak Force Drop-Off Table</h3>
            <p className="text-[10px] text-neutral-500 mb-3">
              Heuristic estimate of the last rep where peak force ≥ 95% of rep 1.
              Based on velocity/force data — approximates LDT readings without the hardware.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 px-3">%1RM</th>
                  <th className="text-right py-2 px-3">Max Reps</th>
                  <th className="text-right py-2 px-3">Force Drops</th>
                  <th className="text-right py-2 px-3">Quality %</th>
                  <th className="text-right py-2 px-3">Strength Rx</th>
                </tr>
              </thead>
              <tbody>
                {PEAK_FORCE_TABLE.map(row => {
                  const sets = Math.ceil(row.maxReps * 0.5 / row.dropRep); // rough target
                  return (
                    <tr key={row.intensity} className={`border-t border-neutral-800/50 ${
                      Math.round(revIntVal) === row.intensity ? 'bg-amber-500/5 text-white' : 'text-neutral-300'
                    }`}>
                      <td className="py-2 px-3 font-mono text-amber-400">{row.intensity}%</td>
                      <td className="py-2 px-3 text-right font-mono">{row.maxReps}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">after rep {row.dropRep}</td>
                      <td className="py-2 px-3 text-right font-mono">{row.qualityRatio}%</td>
                      <td className="py-2 px-3 text-right text-neutral-400 font-mono">sets of {row.dropRep}</td>
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
          recommended intensity. The set/rep division then splits by goal:
        </p>
        <ul className="text-xs text-neutral-400 mt-2 space-y-1.5 pl-4">
          <li className="flex items-start gap-2">
            <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
            <span>
              <span className="text-amber-400 font-medium">Strength / Power</span> — sets are capped at the
              <span className="text-white"> peak force drop-off rep</span> so every rep is
              a max-force rep. Full neural recovery (3-5 min) between sets.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Dumbbell size={12} className="text-amber-400 mt-0.5 shrink-0" />
            <span>
              <span className="text-amber-400 font-medium">Hypertrophy</span> — the
              <span className="text-white"> Frederick metabolic stress formula</span> refines
              set/rep structure to maximise metabolic load per set (8-12 reps at RPE 8).
            </span>
          </li>
        </ul>
      </div>

      {/* Formula */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Formulas</h3>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Hanley Fatigue Score</p>
            <p className="text-neutral-300 text-sm font-mono leading-relaxed">
              Score = Reps × (100 / (100 − Intensity))<sup>2</sup>
            </p>
            <p className="text-neutral-400 text-xs font-mono mt-1">
              Reverse: Reps = TargetScore / (100 / (100 − Intensity))<sup>2</sup>
            </p>
          </div>
          <div className="border-t border-neutral-800 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Peak Force Drop-Off</p>
            <p className="text-neutral-300 text-xs font-mono leading-relaxed">
              maxReps = 30 × (100 / I − 1)
            </p>
            <p className="text-neutral-300 text-xs font-mono leading-relaxed">
              qualityRatio = 0.30 + 0.30 × ((90 − I) / 30)<sup>0.7</sup>
            </p>
            <p className="text-neutral-300 text-xs font-mono leading-relaxed">
              dropRep = round(maxReps × qualityRatio)
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          The quadratic penalty models neuromuscular fatigue cost at high intensities.
          The peak force heuristic approximates LDT data using a concave quality-ratio
          curve calibrated to observed force drop-off at 75% 1RM (rep 5 of 10).
        </p>
      </div>
    </div>
  );
};

export default HanleyToolView;
