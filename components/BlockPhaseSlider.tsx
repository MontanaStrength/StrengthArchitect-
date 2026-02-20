import React, { useRef, useCallback, useState, useEffect } from 'react';
import { TrainingPhase } from '../shared/types';

export type SliderPhase = 'gpp' | 'hypertrophy' | 'strength' | 'power' | 'peaking' | 'deload';

export const SLIDER_PHASE_ORDER: SliderPhase[] = ['gpp', 'hypertrophy', 'strength', 'power', 'peaking', 'deload'];

export const SLIDER_PHASE_CONFIG: Record<SliderPhase, {
  label: string;
  trainingPhase: TrainingPhase;
  track: string;
  glow: string;
  labelColor: string;
  chipBg: string;
  chipBorder: string;
  weekLabel: string;
}> = {
  gpp: {
    label: 'GPP',
    trainingPhase: TrainingPhase.GPP,
    track: 'from-cyan-600 to-teal-500',
    glow: 'rgba(6, 182, 212, 0.35)',
    labelColor: 'text-cyan-300',
    chipBg: 'bg-cyan-500/15',
    chipBorder: 'border-cyan-500',
    weekLabel: 'text-cyan-400/90',
  },
  hypertrophy: {
    label: 'Hypertrophy',
    trainingPhase: TrainingPhase.HYPERTROPHY,
    track: 'from-violet-600 to-purple-600',
    glow: 'rgba(139, 92, 246, 0.35)',
    labelColor: 'text-violet-300',
    chipBg: 'bg-violet-500/15',
    chipBorder: 'border-violet-500',
    weekLabel: 'text-violet-400/90',
  },
  strength: {
    label: 'Strength',
    trainingPhase: TrainingPhase.STRENGTH,
    track: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.35)',
    labelColor: 'text-amber-300',
    chipBg: 'bg-amber-500/15',
    chipBorder: 'border-amber-500',
    weekLabel: 'text-amber-400/90',
  },
  power: {
    label: 'Power',
    trainingPhase: TrainingPhase.POWER,
    track: 'from-rose-500 to-red-500',
    glow: 'rgba(244, 63, 94, 0.35)',
    labelColor: 'text-rose-300',
    chipBg: 'bg-rose-500/15',
    chipBorder: 'border-rose-500',
    weekLabel: 'text-rose-400/90',
  },
  peaking: {
    label: 'Peaking',
    trainingPhase: TrainingPhase.PEAKING,
    track: 'from-yellow-500 to-amber-400',
    glow: 'rgba(250, 204, 21, 0.35)',
    labelColor: 'text-yellow-300',
    chipBg: 'bg-yellow-500/15',
    chipBorder: 'border-yellow-500',
    weekLabel: 'text-yellow-400/90',
  },
  deload: {
    label: 'Deload',
    trainingPhase: TrainingPhase.DELOAD,
    track: 'from-emerald-500 to-green-500',
    glow: 'rgba(16, 185, 129, 0.35)',
    labelColor: 'text-emerald-300',
    chipBg: 'bg-emerald-500/15',
    chipBorder: 'border-emerald-500',
    weekLabel: 'text-emerald-400/90',
  },
};

export interface BlockPhaseSliderProps {
  lengthWeeks: number;
  selectedPhases: SliderPhase[];
  weekDistribution: number[];
  onChange: (phases: SliderPhase[], distribution: number[]) => void;
  className?: string;
}

function distributionToBreakpoints(distribution: number[]): number[] {
  const bps: number[] = [];
  let sum = 0;
  for (let i = 0; i < distribution.length - 1; i++) {
    sum += distribution[i];
    bps.push(sum);
  }
  return bps;
}

function breakpointsToDistribution(breakpoints: number[], totalWeeks: number): number[] {
  const dist: number[] = [];
  let prev = 0;
  for (const bp of breakpoints) {
    dist.push(bp - prev);
    prev = bp;
  }
  dist.push(totalWeeks - prev);
  return dist;
}

function ensureValidDistribution(dist: number[], total: number): number[] {
  const result = dist.map(w => Math.max(1, w));
  const sum = result.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    const diff = total - sum;
    const maxIdx = result.indexOf(Math.max(...result));
    result[maxIdx] = Math.max(1, result[maxIdx] + diff);
  }
  return result;
}

export default function BlockPhaseSlider({
  lengthWeeks,
  selectedPhases,
  weekDistribution,
  onChange,
  className = '',
}: BlockPhaseSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const dist = ensureValidDistribution(weekDistribution, lengthWeeks);
  const breakpoints = distributionToBreakpoints(dist);

  // Re-clamp when lengthWeeks changes
  useEffect(() => {
    if (selectedPhases.length === 0) return;
    const clamped = ensureValidDistribution(weekDistribution, lengthWeeks);
    const sum = clamped.reduce((a, b) => a + b, 0);
    if (sum !== lengthWeeks || clamped.some((w, i) => w !== weekDistribution[i])) {
      onChange(selectedPhases, clamped);
    }
  }, [lengthWeeks]); // eslint-disable-line react-hooks/exhaustive-deps

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 1;
      const rect = track.getBoundingClientRect();
      const x = clientX - rect.left;
      const p = Math.max(0, Math.min(1, x / rect.width));
      return Math.max(1, Math.min(lengthWeeks, Math.round(1 + p * (lengthWeeks - 1))));
    },
    [lengthWeeks],
  );

  const handlePointerDown = useCallback(
    (handleIdx: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragging(handleIdx);
    },
    [],
  );

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e: PointerEvent) => {
      const week = valueFromClientX(e.clientX);
      const bps = [...breakpoints];
      const minBp = dragging === 0 ? 1 : bps[dragging - 1] + 1;
      const maxBp = dragging === bps.length - 1 ? lengthWeeks - 1 : bps[dragging + 1] - 1;
      bps[dragging] = Math.max(minBp, Math.min(maxBp, week));
      onChange(selectedPhases, ensureValidDistribution(breakpointsToDistribution(bps, lengthWeeks), lengthWeeks));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, breakpoints, lengthWeeks, selectedPhases, onChange, valueFromClientX]);

  const handleTogglePhase = (phase: SliderPhase) => {
    const isSelected = selectedPhases.includes(phase);

    if (isSelected) {
      if (selectedPhases.length <= 1) return;
      const idx = selectedPhases.indexOf(phase);
      const newPhases = selectedPhases.filter(p => p !== phase);
      const newDist = dist.filter((_, i) => i !== idx);
      onChange(newPhases, ensureValidDistribution(
        redistributeWeeks(newDist, lengthWeeks),
        lengthWeeks,
      ));
    } else {
      if (lengthWeeks < selectedPhases.length + 1) return;
      const newPhases = SLIDER_PHASE_ORDER.filter(p => selectedPhases.includes(p) || p === phase);
      const insertIdx = newPhases.indexOf(phase);
      const newWeeks = Math.max(1, Math.min(2, Math.floor(lengthWeeks / newPhases.length)));
      const newDist = [...dist];
      const largestIdx = newDist.indexOf(Math.max(...newDist));
      newDist[largestIdx] = Math.max(1, newDist[largestIdx] - newWeeks);
      newDist.splice(insertIdx, 0, newWeeks);
      onChange(newPhases, ensureValidDistribution(newDist, lengthWeeks));
    }
  };

  // Compute segment positions
  const segments = selectedPhases.map((phase, i) => {
    const leftWeeks = i === 0 ? 0 : breakpoints[i - 1];
    const widthWeeks = dist[i];
    return {
      phase,
      config: SLIDER_PHASE_CONFIG[phase],
      leftPct: (leftWeeks / lengthWeeks) * 100,
      widthPct: (widthWeeks / lengthWeeks) * 100,
      weeks: widthWeeks,
    };
  });

  // Build per-week phase assignments for bottom labels
  const weekPhases: SliderPhase[] = [];
  for (let i = 0; i < selectedPhases.length; i++) {
    for (let w = 0; w < dist[i]; w++) {
      weekPhases.push(selectedPhases[i]);
    }
  }

  return (
    <div className={className}>
      {/* Phase toggle chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SLIDER_PHASE_ORDER.map(phase => {
          const cfg = SLIDER_PHASE_CONFIG[phase];
          const active = selectedPhases.includes(phase);
          const canToggle = active ? selectedPhases.length > 1 : lengthWeeks >= selectedPhases.length + 1;
          return (
            <button
              key={phase}
              onClick={() => handleTogglePhase(phase)}
              disabled={!canToggle}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                active
                  ? `${cfg.chipBg} ${cfg.chipBorder} ring-1 ring-opacity-30`
                  : canToggle
                    ? 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-500 text-gray-500'
                    : 'bg-neutral-900/40 border-neutral-800 text-gray-700 cursor-not-allowed opacity-50'
              }`}
              style={active ? { color: undefined } : undefined}
            >
              <span className={active ? cfg.labelColor : undefined}>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Phase labels row */}
      <div className="flex justify-between items-baseline mb-2">
        {segments.map(seg => (
          <span
            key={seg.phase}
            className={`text-xs font-semibold ${seg.config.labelColor}`}
            style={{ flex: seg.weeks }}
          >
            {seg.config.label} · {seg.weeks} wk{seg.weeks !== 1 ? 's' : ''}
          </span>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-10 rounded-xl overflow-hidden border border-neutral-700/80 shadow-inner flex cursor-pointer select-none touch-none"
        style={{ minHeight: 40 }}
      >
        {/* Colored segments */}
        {segments.map(seg => (
          <div
            key={seg.phase}
            className={`absolute top-0 bottom-0 bg-gradient-to-r ${seg.config.track} transition-[width,left] duration-150 ease-out`}
            style={{
              left: `${seg.leftPct}%`,
              width: `${seg.widthPct}%`,
              boxShadow: `inset 0 0 20px ${seg.config.glow}`,
            }}
          />
        ))}

        {/* Draggable handles between phases */}
        {breakpoints.map((bp, i) => (
          <div
            key={i}
            role="slider"
            aria-valuenow={bp}
            aria-valuemin={i === 0 ? 1 : breakpoints[i - 1] + 1}
            aria-valuemax={i === breakpoints.length - 1 ? lengthWeeks - 1 : breakpoints[i + 1] - 1}
            tabIndex={0}
            onPointerDown={handlePointerDown(i)}
            className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center z-10 group"
            style={{ left: `${(bp / lengthWeeks) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`w-1.5 h-8 rounded-full bg-white/95 shadow-lg border-2 border-neutral-800 transition-transform ${
                dragging === i ? 'scale-110 ring-2 ring-white/50' : 'group-hover:scale-105'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Week number labels */}
      <div className="flex justify-between mt-1.5 px-0.5 gap-0" style={{ width: '100%' }}>
        {Array.from({ length: lengthWeeks }, (_, i) => {
          const phase = weekPhases[i] || selectedPhases[selectedPhases.length - 1];
          const cfg = SLIDER_PHASE_CONFIG[phase];
          const isBoundary = breakpoints.includes(i + 1);
          return (
            <span
              key={i}
              className={`text-[10px] font-medium flex-1 text-center ${
                isBoundary ? 'text-white' : cfg.weekLabel
              }`}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function redistributeWeeks(dist: number[], total: number): number[] {
  const sum = dist.reduce((a, b) => a + b, 0);
  if (sum === total) return dist;
  return dist.map(w => Math.max(1, Math.round((w / sum) * total)));
}
