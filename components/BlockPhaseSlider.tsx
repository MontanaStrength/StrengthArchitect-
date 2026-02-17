import React, { useRef, useCallback, useState, useEffect } from 'react';

export type PhaseKind = 'hypertrophy' | 'strength' | 'peaking';

/** Breakpoints = last week of phase 1 and phase 2 (1-based). So phase 1 = weeks 1..b1, phase 2 = b1+1..b2, phase 3 = b2+1..lengthWeeks. */
export interface BlockPhaseSliderProps {
  lengthWeeks: number;
  /** End week of phase 1 (Hypertrophy), in [1, lengthWeeks-2] */
  breakpoint1: number;
  /** End week of phase 2 (Strength), in [breakpoint1+1, lengthWeeks-1] */
  breakpoint2: number;
  onChange: (breakpoint1: number, breakpoint2: number) => void;
  className?: string;
}

const PHASE_COLORS: Record<PhaseKind, { track: string; glow: string; label: string }> = {
  hypertrophy: {
    track: 'from-violet-600 to-purple-600',
    glow: 'rgba(139, 92, 246, 0.35)',
    label: 'text-violet-300',
  },
  strength: {
    track: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.35)',
    label: 'text-amber-300',
  },
  peaking: {
    track: 'from-yellow-500 to-amber-400',
    glow: 'rgba(250, 204, 21, 0.35)',
    label: 'text-yellow-300',
  },
};

function clampBreakpoints(
  lengthWeeks: number,
  b1: number,
  b2: number
): [number, number] {
  const minB1 = 1;
  const maxB1 = Math.max(minB1, lengthWeeks - 2);
  const minB2 = Math.min(b1 + 1, lengthWeeks - 1);
  const maxB2 = lengthWeeks - 1;
  const n1 = Math.max(minB1, Math.min(maxB1, b1));
  const n2 = Math.max(minB2, Math.min(maxB2, Math.max(b2, n1 + 1)));
  return [n1, n2];
}

export default function BlockPhaseSlider({
  lengthWeeks,
  breakpoint1,
  breakpoint2,
  onChange,
  className = '',
}: BlockPhaseSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'b1' | 'b2' | null>(null);
  const [b1, b2] = clampBreakpoints(lengthWeeks, breakpoint1, breakpoint2);

  // When block length changes, reclamp breakpoints and sync to parent
  useEffect(() => {
    const [c1, c2] = clampBreakpoints(lengthWeeks, breakpoint1, breakpoint2);
    if (c1 !== breakpoint1 || c2 !== breakpoint2) {
      onChange(c1, c2);
    }
  }, [lengthWeeks]); // eslint-disable-line react-hooks/exhaustive-deps

  const p1 = lengthWeeks > 0 ? b1 / lengthWeeks : 0;
  const p2 = lengthWeeks > 0 ? b2 / lengthWeeks : 1;
  const w1 = p1 * 100;
  const w2 = (p2 - p1) * 100;
  const w3 = (1 - p2) * 100;

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || lengthWeeks < 3) return 1;
      const rect = track.getBoundingClientRect();
      const x = clientX - rect.left;
      const p = Math.max(0, Math.min(1, x / rect.width));
      const week = Math.round(1 + p * (lengthWeeks - 1));
      return Math.max(1, Math.min(lengthWeeks, week));
    },
    [lengthWeeks]
  );

  const handlePointerDown = useCallback(
    (which: 'b1' | 'b2') => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragging(which);
    },
    []
  );

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e: PointerEvent) => {
      const week = valueFromClientX(e.clientX);
      if (dragging === 'b1') {
        const newB1 = Math.max(1, Math.min(week, b2 - 1));
        const newB2 = Math.max(newB1 + 1, b2);
        onChange(newB1, newB2);
      } else {
        const newB2 = Math.max(b1 + 1, Math.min(week, lengthWeeks - 1));
        const newB1 = Math.min(b1, newB2 - 1);
        onChange(newB1, newB2);
      }
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
  }, [dragging, b1, b2, lengthWeeks, onChange, valueFromClientX]);

  const weeks1 = b1;
  const weeks2 = b2 - b1;
  const weeks3 = lengthWeeks - b2;

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-2">
        <span className={`text-xs font-semibold ${PHASE_COLORS.hypertrophy.label}`}>
          Hypertrophy · {weeks1} wk{weeks1 !== 1 ? 's' : ''}
        </span>
        <span className={`text-xs font-semibold ${PHASE_COLORS.strength.label}`}>
          Strength · {weeks2} wk{weeks2 !== 1 ? 's' : ''}
        </span>
        <span className={`text-xs font-semibold ${PHASE_COLORS.peaking.label}`}>
          Peaking · {weeks3} wk{weeks3 !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-10 rounded-xl overflow-hidden border border-neutral-700/80 shadow-inner flex cursor-pointer select-none touch-none"
        style={{ minHeight: 40 }}
      >
        {/* Segment 1: Hypertrophy */}
        <div
          className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${PHASE_COLORS.hypertrophy.track} transition-[width] duration-150 ease-out`}
          style={{
            width: `${w1}%`,
            boxShadow: `inset 0 0 20px ${PHASE_COLORS.hypertrophy.glow}`,
          }}
        />
        {/* Segment 2: Strength */}
        <div
          className={`absolute top-0 bottom-0 bg-gradient-to-r ${PHASE_COLORS.strength.track} transition-[width] duration-150 ease-out`}
          style={{
            left: `${w1}%`,
            width: `${w2}%`,
            boxShadow: `inset 0 0 20px ${PHASE_COLORS.strength.glow}`,
          }}
        />
        {/* Segment 3: Peaking */}
        <div
          className={`absolute right-0 top-0 bottom-0 bg-gradient-to-r ${PHASE_COLORS.peaking.track} transition-[width] duration-150 ease-out`}
          style={{
            width: `${w3}%`,
            boxShadow: `inset 0 0 20px ${PHASE_COLORS.peaking.glow}`,
          }}
        />

        {/* Handle 1 */}
        <div
          role="slider"
          aria-valuenow={b1}
          aria-valuemin={1}
          aria-valuemax={lengthWeeks - 2}
          tabIndex={0}
          onPointerDown={handlePointerDown('b1')}
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center z-10 group"
          style={{ left: `${p1 * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className={`w-1.5 h-8 rounded-full bg-white/95 shadow-lg border-2 border-neutral-800 transition-transform ${
              dragging === 'b1' ? 'scale-110 ring-2 ring-white/50' : 'group-hover:scale-105'
            }`}
          />
        </div>

        {/* Handle 2 */}
        <div
          role="slider"
          aria-valuenow={b2}
          aria-valuemin={2}
          aria-valuemax={lengthWeeks - 1}
          tabIndex={0}
          onPointerDown={handlePointerDown('b2')}
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center z-10 group"
          style={{ left: `${p2 * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className={`w-1.5 h-8 rounded-full bg-white/95 shadow-lg border-2 border-neutral-800 transition-transform ${
              dragging === 'b2' ? 'scale-110 ring-2 ring-white/50' : 'group-hover:scale-105'
            }`}
          />
        </div>
      </div>

      {/* Week labels under track */}
      <div className="flex justify-between mt-1.5 px-0.5 gap-0" style={{ width: '100%' }}>
        {Array.from({ length: lengthWeeks }, (_, i) => i + 1).map((week) => {
          const phase =
            week <= b1 ? 'hypertrophy' : week <= b2 ? 'strength' : 'peaking';
          const isBoundary = week === b1 || week === b2;
          return (
            <span
              key={week}
              className={`text-[10px] font-medium flex-1 text-center ${
                isBoundary
                  ? 'text-white'
                  : phase === 'hypertrophy'
                    ? 'text-violet-400/90'
                    : phase === 'strength'
                      ? 'text-amber-400/90'
                      : 'text-yellow-400/90'
              }`}
            >
              {week}
            </span>
          );
        })}
      </div>
    </div>
  );
}
