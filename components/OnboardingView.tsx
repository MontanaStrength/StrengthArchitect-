import React, { useState } from 'react';
import { Dumbbell, ChevronRight, Zap, Target, User } from 'lucide-react';
import { TrainingExperience, AvailableEquipment, TrainingBlock, TrainingPhase, SplitPattern } from '../types';

interface Props {
  onComplete: (data: {
    experience: TrainingExperience;
    equipment: AvailableEquipment[];
    weightLbs: number;
    age: number;
    gender: string;
    block: TrainingBlock;
  }) => void;
  onSkip: () => void;
}

const EQUIPMENT_OPTIONS: { id: AvailableEquipment; label: string; emoji: string }[] = [
  { id: AvailableEquipment.BARBELL, label: 'Barbell', emoji: '🏋️' },
  { id: AvailableEquipment.DUMBBELL, label: 'Dumbbells', emoji: '💪' },
  { id: AvailableEquipment.KETTLEBELL, label: 'Kettlebell', emoji: '🔔' },
  { id: AvailableEquipment.CABLE, label: 'Cables', emoji: '🔗' },
  { id: AvailableEquipment.BANDS, label: 'Bands', emoji: '🩹' },
  { id: AvailableEquipment.SPECIALTY_BAR, label: 'Specialty Bars', emoji: '⚡' },
  { id: AvailableEquipment.BODYWEIGHT, label: 'Bodyweight', emoji: '🧘' },
];

const OnboardingView: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<TrainingExperience>(TrainingExperience.INTERMEDIATE);
  const [equipment, setEquipment] = useState<AvailableEquipment[]>([AvailableEquipment.BARBELL, AvailableEquipment.DUMBBELL]);
  const [weightLbs, setWeightLbs] = useState(180);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState('male');
  const [trainingDays, setTrainingDays] = useState([1, 3, 5]); // Mon/Wed/Fri

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleEquipment = (eq: AvailableEquipment) => {
    setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };

  const toggleDay = (d: number) => {
    setTrainingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleFinish = () => {
    // Create a sensible default training block
    const sessionsPerWeek = trainingDays.length;
    const splitPattern = sessionsPerWeek <= 3 ? 'full-body' as const : 'upper-lower' as const;

    const defaultBlock: TrainingBlock = {
      id: crypto.randomUUID(),
      name: 'My First Block',
      startDate: Date.now(),
      isActive: true,
      phases: [
        {
          phase: TrainingPhase.HYPERTROPHY,
          weekCount: 4,
          sessionsPerWeek,
          splitPattern,
          intensityFocus: 'moderate',
          volumeFocus: 'high',
          primaryArchetypes: ['volume_builder', 'balanced_strength'],
          description: 'Build work capacity and muscle with moderate loads.',
        },
        {
          phase: TrainingPhase.STRENGTH,
          weekCount: 4,
          sessionsPerWeek,
          splitPattern,
          intensityFocus: 'high',
          volumeFocus: 'moderate',
          primaryArchetypes: ['heavy_compound', 'power_focus'],
          description: 'Increase intensity and build raw strength.',
        },
      ],
      lengthWeeks: 8,
      trainingDays,
      goalBias: 50,
      volumeTolerance: experience === TrainingExperience.BEGINNER ? 2 : experience === TrainingExperience.ADVANCED ? 4 : 3,
    };

    onComplete({
      experience,
      equipment,
      weightLbs,
      age,
      gender,
      block: defaultBlock,
    });
  };

  const steps = [
    // Step 0: Welcome
    () => (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Dumbbell size={36} className="text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Strength Architect</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Let's set up your profile in 30 seconds so we can build your perfect training program.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setStep(1)}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Get Started <ChevronRight size={16} />
          </button>
          <button onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-400">
            Skip for now
          </button>
        </div>
      </div>
    ),

    // Step 1: About you
    () => (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><User size={18} className="text-blue-400" /></div>
          <div>
            <h3 className="text-lg font-bold text-white">About You</h3>
            <p className="text-xs text-gray-400">Basic info for smart programming</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Experience Level</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: TrainingExperience.BEGINNER, label: 'Beginner', sub: '< 1 year' },
                { val: TrainingExperience.INTERMEDIATE, label: 'Intermediate', sub: '1-3 years' },
                { val: TrainingExperience.ADVANCED, label: 'Advanced', sub: '3+ years' },
              ] as const).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setExperience(opt.val)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    experience === opt.val
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-neutral-700 bg-neutral-900 text-gray-400 hover:border-neutral-600'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-[10px] text-gray-500">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={weightLbs}
                onChange={e => setWeightLbs(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep(0)}
            className="py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
          >
            Back
          </button>
          <button
            onClick={() => setStep(2)}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    ),

    // Step 2: Equipment + Schedule
    () => (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Zap size={18} className="text-green-400" /></div>
          <div>
            <h3 className="text-lg font-bold text-white">Gym & Schedule</h3>
            <p className="text-xs text-gray-400">What you have and when you train</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Available Equipment</label>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggleEquipment(opt.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                  equipment.includes(opt.id)
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-neutral-700 bg-neutral-900 text-gray-500 hover:border-neutral-600'
                }`}
              >
                <span>{opt.emoji}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Training Days</label>
          <div className="flex gap-1.5">
            {dayLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  trainingDays.includes(i)
                    ? 'bg-amber-500 text-black'
                    : 'bg-neutral-800 text-gray-500 hover:bg-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{trainingDays.length} days/week selected</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep(1)}
            className="py-3.5 px-5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
          >
            Back
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Target size={16} /> Build My Program
          </button>
        </div>
      </div>
    ),
  ];

  // Progress indicator
  return (
    <div className="max-w-md mx-auto">
      {step > 0 && (
        <div className="flex gap-1.5 mb-6">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-amber-500' : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>
      )}
      {steps[step]()}
    </div>
  );
};

export default OnboardingView;
