
import { ReadinessLevel, TrainingExperience, AvailableEquipment, TrainingGoalFocus } from './types';

export const DURATION_OPTIONS = [
  { value: 30, label: '30 Minutes (Quick)' },
  { value: 45, label: '45 Minutes (Standard)' },
  { value: 60, label: '60 Minutes (Full Session)' },
  { value: 75, label: '75 Minutes (Extended)' },
  { value: 90, label: '90 Minutes (High Volume)' },
];

export const READINESS_OPTIONS = [
  { value: ReadinessLevel.LOW, label: 'Low - Feeling beat up/sore', color: 'bg-red-600' },
  { value: ReadinessLevel.MEDIUM, label: 'Medium - Ready to train', color: 'bg-yellow-600' },
  { value: ReadinessLevel.HIGH, label: 'High - Ready to crush it', color: 'bg-green-600' },
];

export const EQUIPMENT_OPTIONS = [
  { value: AvailableEquipment.BARBELL, label: 'Barbell', disabled: false },
  { value: AvailableEquipment.DUMBBELL, label: 'Dumbbells', disabled: false },
  { value: AvailableEquipment.KETTLEBELL, label: 'Kettlebells', disabled: false },
  { value: AvailableEquipment.CABLE, label: 'Cable Machine', disabled: false },
  { value: AvailableEquipment.MACHINE, label: 'Machines', disabled: false },
  { value: AvailableEquipment.BODYWEIGHT, label: 'Bodyweight', disabled: false },
  { value: AvailableEquipment.BANDS, label: 'Resistance Bands', disabled: false },
  { value: AvailableEquipment.SPECIALTY_BAR, label: 'Specialty Bars (SSB, Trap Bar)', disabled: false },
];

export const GOAL_FOCUS_OPTIONS: { value: TrainingGoalFocus; label: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', desc: 'Heavy loads, low reps (1-5). Build maximal force.' },
  { value: 'hypertrophy', label: 'Hypertrophy', desc: 'Moderate loads, moderate reps (8-12). Build muscle size.' },
  { value: 'power', label: 'Power', desc: 'Explosive movements, moderate loads. Build speed-strength.' },
  { value: 'endurance', label: 'Muscular Endurance', desc: 'Lighter loads, high reps (15+). Build work capacity.' },
  { value: 'general', label: 'General Fitness', desc: 'Balanced approach across all rep ranges.' },
];

/**
 * Training experience options with descriptive context.
 */
export const getTrainingExperienceOptions = () => {
  return [
    {
      value: TrainingExperience.BEGINNER,
      label: 'Beginner',
      desc: 'Less than 1 year of consistent barbell training. Focus on learning movement patterns.',
    },
    {
      value: TrainingExperience.INTERMEDIATE,
      label: 'Intermediate',
      desc: '1-3 years of consistent training. Can no longer add weight every session.',
    },
    {
      value: TrainingExperience.ADVANCED,
      label: 'Advanced',
      desc: '3+ years. Needs periodized programming and specific stimulus to progress.',
    },
    {
      value: TrainingExperience.ELITE,
      label: 'Elite',
      desc: 'Competitive strength athlete. Requires complex periodization and peaking protocols.',
    },
  ];
};

/**
 * Standard plate loading chart (per side, in lbs).
 */
export const STANDARD_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

/**
 * RPE descriptions for user reference.
 */
export const RPE_DESCRIPTIONS: Record<number, string> = {
  6: 'Could do 4 more reps. Warmup-level effort.',
  7: 'Could do 3 more reps. Moderate effort.',
  8: 'Could do 2 more reps. Hard but controlled.',
  9: 'Could do 1 more rep. Very hard, near max.',
  10: 'Max effort. Could not do another rep.',
};
