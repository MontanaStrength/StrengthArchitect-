import React, { useState, useEffect } from 'react';

/**
 * LiftAnimation — CSS-animated SVG silhouettes of a lifter performing
 * deadlift, squat, and bench press. Rotates between lifts on a timer.
 *
 * Each figure is a minimalist geometric stick figure with a barbell,
 * animated between the bottom and top positions of each lift.
 */

type LiftType = 'deadlift' | 'squat' | 'bench';

interface Props {
  /** Which lift to show, or undefined to auto-rotate */
  lift?: LiftType;
  /** Size of the SVG viewport (square). Default 120 */
  size?: number;
  /** Rotation interval in ms. Default 4000 */
  interval?: number;
}

const LIFT_ORDER: LiftType[] = ['deadlift', 'squat', 'bench'];

const LiftAnimation: React.FC<Props> = ({ lift, size = 120, interval = 4000 }) => {
  const [currentLift, setCurrentLift] = useState<LiftType>(lift || 'deadlift');
  const [fading, setFading] = useState(false);

  // Auto-rotate if no fixed lift
  useEffect(() => {
    if (lift) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentLift(prev => {
          const idx = LIFT_ORDER.indexOf(prev);
          return LIFT_ORDER[(idx + 1) % LIFT_ORDER.length];
        });
        setFading(false);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [lift, interval]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 120 120"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            .limb { stroke: #f59e0b; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
            .bar  { stroke: #6b7280; stroke-width: 3; stroke-linecap: round; }
            .plate { fill: #f59e0b; opacity: 0.8; }
            .head  { fill: #f59e0b; }

            /* Deadlift: hinge from floor to lockout */
            @keyframes dl-torso {
              0%, 100% { transform: rotate(55deg); }
              45%, 55% { transform: rotate(0deg); }
            }
            @keyframes dl-legs {
              0%, 100% { transform: rotate(-30deg); }
              45%, 55% { transform: rotate(0deg); }
            }
            @keyframes dl-bar-y {
              0%, 100% { transform: translateY(22px); }
              45%, 55% { transform: translateY(0px); }
            }
            .dl-torso { transform-origin: 60px 72px; animation: dl-torso 2.4s ease-in-out infinite; }
            .dl-legs  { transform-origin: 60px 72px; animation: dl-legs 2.4s ease-in-out infinite; }
            .dl-bar   { animation: dl-bar-y 2.4s ease-in-out infinite; }

            /* Squat: vertical movement */
            @keyframes sq-body {
              0%, 100% { transform: translateY(16px); }
              45%, 55% { transform: translateY(0px); }
            }
            @keyframes sq-thigh {
              0%, 100% { transform: rotate(70deg); }
              45%, 55% { transform: rotate(10deg); }
            }
            @keyframes sq-shin {
              0%, 100% { transform: rotate(-55deg); }
              45%, 55% { transform: rotate(-5deg); }
            }
            .sq-body  { animation: sq-body 2.4s ease-in-out infinite; }
            .sq-thigh { transform-origin: 60px 72px; animation: sq-thigh 2.4s ease-in-out infinite; }
            .sq-shin-l { transform-origin: 48px 94px; animation: sq-shin 2.4s ease-in-out infinite; }
            .sq-shin-r { transform-origin: 72px 94px; animation: sq-shin 2.4s ease-in-out infinite; }

            /* Bench: pressing motion while lying */
            @keyframes bp-arms {
              0%, 100% { transform: translateY(8px); }
              45%, 55% { transform: translateY(-8px); }
            }
            .bp-arms { animation: bp-arms 2s ease-in-out infinite; }
          `}</style>

          {currentLift === 'deadlift' && <DeadliftFigure />}
          {currentLift === 'squat' && <SquatFigure />}
          {currentLift === 'bench' && <BenchFigure />}
        </svg>
      </div>

      {/* Lift label */}
      <span className={`text-micro font-semibold uppercase tracking-widest transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      } ${currentLift === 'deadlift' ? 'text-amber-400/60' : currentLift === 'squat' ? 'text-amber-400/60' : 'text-amber-400/60'}`}>
        {currentLift === 'deadlift' ? 'Deadlift' : currentLift === 'squat' ? 'Squat' : 'Bench Press'}
      </span>
    </div>
  );
};

/* ── Deadlift Figure ── */
const DeadliftFigure: React.FC = () => (
  <g>
    {/* Bar + plates (moves vertically) */}
    <g className="dl-bar">
      <line x1="20" y1="92" x2="100" y2="92" className="bar" />
      <rect x="22" y="86" width="6" height="12" rx="1" className="plate" />
      <rect x="92" y="86" width="6" height="12" rx="1" className="plate" />
    </g>

    {/* Legs (rotate at hips) */}
    <g className="dl-legs">
      {/* Left leg */}
      <line x1="56" y1="72" x2="48" y2="98" className="limb" />
      {/* Right leg */}
      <line x1="64" y1="72" x2="72" y2="98" className="limb" />
    </g>

    {/* Torso + head + arms (rotate at hips) */}
    <g className="dl-torso">
      {/* Torso */}
      <line x1="60" y1="72" x2="60" y2="42" className="limb" />
      {/* Head */}
      <circle cx="60" cy="34" r="7" className="head" />
      {/* Left arm */}
      <line x1="60" y1="48" x2="46" y2="72" className="limb" />
      {/* Right arm */}
      <line x1="60" y1="48" x2="74" y2="72" className="limb" />
    </g>
  </g>
);

/* ── Squat Figure ── */
const SquatFigure: React.FC = () => (
  <g>
    {/* Upper body group (moves vertically) */}
    <g className="sq-body">
      {/* Torso */}
      <line x1="60" y1="72" x2="60" y2="42" className="limb" />
      {/* Head */}
      <circle cx="60" cy="34" r="7" className="head" />
      {/* Barbell on back */}
      <line x1="36" y1="42" x2="84" y2="42" className="bar" />
      <rect x="32" y="38" width="6" height="8" rx="1" className="plate" />
      <rect x="82" y="38" width="6" height="8" rx="1" className="plate" />
      {/* Arms to bar */}
      <line x1="60" y1="48" x2="42" y2="42" className="limb" />
      <line x1="60" y1="48" x2="78" y2="42" className="limb" />
    </g>

    {/* Left thigh */}
    <g className="sq-thigh">
      <line x1="56" y1="72" x2="48" y2="94" className="limb" />
    </g>
    {/* Right thigh */}
    <g className="sq-thigh">
      <line x1="64" y1="72" x2="72" y2="94" className="limb" />
    </g>

    {/* Left shin */}
    <g className="sq-shin-l">
      <line x1="48" y1="94" x2="50" y2="112" className="limb" />
    </g>
    {/* Right shin */}
    <g className="sq-shin-r">
      <line x1="72" y1="94" x2="70" y2="112" className="limb" />
    </g>

    {/* Feet (static) */}
    <line x1="44" y1="112" x2="56" y2="112" className="limb" style={{ strokeWidth: 2.5 }} />
    <line x1="64" y1="112" x2="76" y2="112" className="limb" style={{ strokeWidth: 2.5 }} />
  </g>
);

/* ── Bench Press Figure ── */
const BenchFigure: React.FC = () => (
  <g>
    {/* Bench */}
    <rect x="28" y="74" width="64" height="6" rx="2" fill="#404040" />
    {/* Bench legs */}
    <line x1="32" y1="80" x2="32" y2="100" stroke="#404040" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="88" y1="80" x2="88" y2="100" stroke="#404040" strokeWidth="2.5" strokeLinecap="round" />

    {/* Rack posts */}
    <line x1="24" y1="40" x2="24" y2="100" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="96" y1="40" x2="96" y2="100" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
    {/* Rack hooks */}
    <line x1="24" y1="46" x2="30" y2="46" stroke="#525252" strokeWidth="2" strokeLinecap="round" />
    <line x1="96" y1="46" x2="90" y2="46" stroke="#525252" strokeWidth="2" strokeLinecap="round" />

    {/* Body on bench (static) */}
    {/* Torso */}
    <line x1="40" y1="71" x2="76" y2="71" className="limb" />
    {/* Head */}
    <circle cx="36" cy="71" r="6" className="head" />
    {/* Legs hanging off */}
    <line x1="76" y1="71" x2="82" y2="84" className="limb" />
    <line x1="82" y1="84" x2="80" y2="100" className="limb" />

    {/* Arms + bar (animate up/down) */}
    <g className="bp-arms">
      {/* Bar */}
      <line x1="16" y1="56" x2="104" y2="56" className="bar" />
      {/* Plates */}
      <rect x="12" y="50" width="6" height="12" rx="1" className="plate" />
      <rect x="102" y="50" width="6" height="12" rx="1" className="plate" />
      {/* Left arm */}
      <line x1="48" y1="71" x2="44" y2="56" className="limb" />
      {/* Right arm */}
      <line x1="68" y1="71" x2="72" y2="56" className="limb" />
    </g>
  </g>
);

export default LiftAnimation;
