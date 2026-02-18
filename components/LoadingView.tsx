import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Cpu, Dumbbell, Check } from 'lucide-react';
import LiftAnimation from './LiftAnimation';
import LiftAnimationGeometric from './LiftAnimationGeometric';

interface Props {
  /** Optional context line shown below the title (e.g. "Week 3/8 · Strength Block") */
  contextLabel?: string;
}

const STEPS = [
  { label: 'Analyzing training history',  icon: Activity,  delayMs: 0 },
  { label: 'Computing optimal volume',    icon: BarChart3,  delayMs: 2800 },
  { label: 'Selecting exercise protocol', icon: Cpu,        delayMs: 5200 },
  { label: 'Building your session',       icon: Dumbbell,   delayMs: 7400 },
];

const ESTIMATED_SECONDS = 12;

const LoadingView: React.FC<Props> = ({ contextLabel }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Advance steps on timers
  useEffect(() => {
    const timers = STEPS.map((step, i) => {
      if (i === 0) return null; // step 0 is active immediately
      return setTimeout(() => setActiveStep(i), step.delayMs);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, []);

  // Elapsed counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const overTime = elapsed > ESTIMATED_SECONDS;
  const progressPercent = overTime
    ? Math.min(98, 95 + (elapsed - ESTIMATED_SECONDS) * 0.5)
    : Math.min(95, (elapsed / ESTIMATED_SECONDS) * 100);

  return (
    <div className="py-8 space-y-8">
      {/* Animated barbell — keep square so plates don't squash to edge-on */}
      <div className="flex justify-center shrink-0">
        <LiftAnimation size={160} />
        {/* Geometric alternative: <LiftAnimationGeometric size={160} /> */}
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-white tracking-tight">Building Your Workout</h2>
        {contextLabel && (
          <p className="sa-section-label">{contextLabel}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-sa-surface2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              overTime
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {elapsed}s elapsed
          </p>
          <p className="text-xs text-gray-500">
            {overTime ? 'Almost there — AI is thinking…' : `~${ESTIMATED_SECONDS - elapsed}s remaining`}
          </p>
        </div>
      </div>

      {/* Step list */}
      <div className="sa-card px-5 py-4 space-y-1">
        {STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isComplete = i < activeStep;
          const isPending = i > activeStep;
          const Icon = step.icon;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 py-2.5 transition-all duration-500 ${
                isPending ? 'opacity-30' : 'opacity-100'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
                isComplete
                  ? 'bg-green-500/15'
                  : isActive
                    ? 'bg-amber-500/15'
                    : 'bg-sa-surface2'
              }`}>
                {isComplete ? (
                  <Check size={15} className="text-green-400" />
                ) : (
                  <Icon size={15} className={isActive ? 'text-amber-400' : 'text-gray-600'} />
                )}
              </div>

              {/* Label */}
              <span className={`text-sm font-medium transition-colors duration-500 ${
                isComplete
                  ? 'text-gray-500'
                  : isActive
                    ? 'text-white'
                    : 'text-gray-600'
              }`}>
                {step.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="ml-auto flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse [animation-delay:400ms]" />
                </div>
              )}

              {/* Complete checkmark */}
              {isComplete && (
                <span className="ml-auto text-xs text-green-500/70 font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoadingView;
