import React, { useState } from 'react';
import { WarmupProtocol, WarmupStep } from '../types';

const PROTOCOLS: WarmupProtocol[] = [
  {
    name: 'General Barbell Warmup',
    totalDurationMin: 10,
    steps: [
      { description: 'Foam roll quads, hamstrings, glutes, upper back', durationSeconds: 120, type: 'foam-roll', notes: 'Spend extra time on tight areas' },
      { description: 'World\'s greatest stretch — 5 each side', durationSeconds: 60, type: 'dynamic-stretch' },
      { description: 'Leg swings (front/back + side/side) — 10 each', durationSeconds: 60, type: 'dynamic-stretch' },
      { description: 'Band pull-aparts — 15 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Glute bridges — 15 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Empty bar: 2×10 squats, 2×10 presses, 2×10 RDLs', durationSeconds: 180, type: 'ramp-up-set', notes: 'Controlled tempo, focus on positions' },
      { description: 'Ramp-up sets: 50%, 70%, 85% of working weight × 3-5 reps', durationSeconds: 120, type: 'ramp-up-set' },
    ],
  },
  {
    name: 'Squat-Specific Warmup',
    totalDurationMin: 12,
    steps: [
      { description: 'Foam roll quads, adductors, glutes', durationSeconds: 90, type: 'foam-roll' },
      { description: 'Goblet squat holds — 3×10sec at bottom', durationSeconds: 60, type: 'dynamic-stretch', notes: 'Push knees out with elbows' },
      { description: 'Cossack squats — 5 each side', durationSeconds: 60, type: 'dynamic-stretch' },
      { description: 'Banded lateral walks — 10 each way', durationSeconds: 45, type: 'activation' },
      { description: 'Banded squats — 10 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Empty bar squats — 2×8', durationSeconds: 60, type: 'ramp-up-set' },
      { description: 'Ramp-up: 40% × 5, 60% × 3, 75% × 2, 85% × 1', durationSeconds: 240, type: 'ramp-up-set', notes: 'Increase rest between heavier sets' },
      { description: '3 deep breaths between sets', durationSeconds: 30, type: 'breathing' },
    ],
  },
  {
    name: 'Bench Press Warmup',
    totalDurationMin: 10,
    steps: [
      { description: 'Lacrosse ball pec release — 30sec each side', durationSeconds: 60, type: 'foam-roll' },
      { description: 'Arm circles — 10 forward, 10 backward', durationSeconds: 30, type: 'dynamic-stretch' },
      { description: 'Band dislocates — 15 reps', durationSeconds: 30, type: 'dynamic-stretch' },
      { description: 'Band pull-aparts — 20 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Push-ups — 10 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Scapular retractions on bench — 10 reps', durationSeconds: 30, type: 'activation', notes: 'Practice bench setup' },
      { description: 'Empty bar bench — 2×10', durationSeconds: 60, type: 'ramp-up-set' },
      { description: 'Ramp-up: 50% × 5, 70% × 3, 85% × 1', durationSeconds: 180, type: 'ramp-up-set' },
    ],
  },
  {
    name: 'Deadlift Warmup',
    totalDurationMin: 10,
    steps: [
      { description: 'Foam roll hamstrings, glutes, thoracic spine', durationSeconds: 90, type: 'foam-roll' },
      { description: 'Cat-cow — 10 reps', durationSeconds: 30, type: 'dynamic-stretch' },
      { description: 'Hip hinge with dowel — 10 reps', durationSeconds: 30, type: 'dynamic-stretch', notes: 'Maintain 3 points of contact' },
      { description: 'Banded good mornings — 15 reps', durationSeconds: 30, type: 'activation' },
      { description: 'Deadbugs — 5 each side', durationSeconds: 30, type: 'activation' },
      { description: 'Ramp-up: 135 × 5, 50% × 3, 70% × 2, 85% × 1', durationSeconds: 240, type: 'ramp-up-set', notes: 'Reset each rep — no touch-and-go' },
      { description: 'Diaphragmatic breathing — 5 breaths', durationSeconds: 30, type: 'breathing' },
    ],
  },
  {
    name: 'Post-Workout Cooldown',
    totalDurationMin: 8,
    steps: [
      { description: 'Walk or light bike — 3 minutes', durationSeconds: 180, type: 'dynamic-stretch', notes: 'Bring heart rate down gradually' },
      { description: 'Static quad stretch — 30sec each side', durationSeconds: 60, type: 'static-stretch' },
      { description: 'Static hamstring stretch — 30sec each side', durationSeconds: 60, type: 'static-stretch' },
      { description: 'Pigeon stretch — 30sec each side', durationSeconds: 60, type: 'static-stretch' },
      { description: 'Chest doorway stretch — 30sec', durationSeconds: 30, type: 'static-stretch' },
      { description: 'Box breathing — 4 rounds (4-4-4-4)', durationSeconds: 60, type: 'breathing', notes: 'Inhale 4s, hold 4s, exhale 4s, hold 4s' },
    ],
  },
];

const TYPE_COLORS: Record<WarmupStep['type'], string> = {
  'foam-roll': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'dynamic-stretch': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'activation': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'ramp-up-set': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'static-stretch': 'bg-green-500/20 text-green-400 border-green-500/30',
  'breathing': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const TYPE_LABELS: Record<WarmupStep['type'], string> = {
  'foam-roll': 'Foam Roll',
  'dynamic-stretch': 'Dynamic Stretch',
  'activation': 'Activation',
  'ramp-up-set': 'Ramp-Up',
  'static-stretch': 'Static Stretch',
  'breathing': 'Breathing',
};

const WarmupCooldownView: React.FC = () => {
  const [activeProtocol, setActiveProtocol] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [timer, setTimer] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const protocol = PROTOCOLS[activeProtocol];

  const startStep = (idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveStep(idx);
    setTimer(protocol.steps[idx].durationSeconds);
    setRunning(true);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  };

  React.useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🔥</span> Warmup & Cooldown
      </h2>

      {/* Protocol Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PROTOCOLS.map((p, i) => (
          <button
            key={i}
            onClick={() => { setActiveProtocol(i); setActiveStep(-1); stopTimer(); }}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              activeProtocol === i
                ? 'bg-amber-500 text-black'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Protocol Details */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">{protocol.name}</h3>
          <span className="text-sm text-neutral-400">~{protocol.totalDurationMin} min</span>
        </div>

        {/* Timer */}
        {activeStep >= 0 && (
          <div className="bg-neutral-800 rounded-lg p-4 mb-4 text-center">
            <div className="text-xs text-neutral-400 mb-1">Step {activeStep + 1}: {protocol.steps[activeStep].description}</div>
            <div className="text-5xl font-bold text-amber-400 font-mono my-2">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            </div>
            <div className="flex justify-center gap-3">
              {running ? (
                <button onClick={stopTimer} className="px-4 py-2 bg-neutral-700 text-white rounded-lg text-sm">⏸ Pause</button>
              ) : timer > 0 ? (
                <button onClick={() => startStep(activeStep)} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm">▶ Resume</button>
              ) : activeStep < protocol.steps.length - 1 ? (
                <button onClick={() => startStep(activeStep + 1)} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm">Next Step →</button>
              ) : (
                <span className="text-green-400 text-sm font-semibold">✓ Complete!</span>
              )}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {protocol.steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                activeStep === i ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-neutral-800 hover:bg-neutral-750 border border-transparent'
              }`}
              onClick={() => startStep(i)}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-white font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{step.description}</div>
                {step.notes && <div className="text-xs text-neutral-400 mt-1">💡 {step.notes}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[step.type]}`}>
                  {TYPE_LABELS[step.type]}
                </span>
                <span className="text-xs text-neutral-500 font-mono">{step.durationSeconds}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Full Protocol */}
      <button
        onClick={() => startStep(0)}
        className="w-full py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-600 transition-colors"
      >
        ▶ Start Full Protocol
      </button>
    </div>
  );
};

export default WarmupCooldownView;
