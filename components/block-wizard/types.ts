/**
 * Block Wizard — shared types.
 *
 * The BlockWizardState holds everything needed to build a TrainingBlock.
 * Each step component receives it + an updater function.
 */

import React from 'react';
import { TrainingBlockPhase, TrainingPhase, PHASE_PRESETS, SplitPattern } from '../../shared/types';

export type BlockFocus = 'hypertrophy' | 'hypertrophy-strength' | 'strength' | 'competition' | 'custom';

export const BLOCK_FOCUS_OPTIONS: { value: BlockFocus; label: string; desc: string; icon: string; suggestedWeeks: [number, number]; defaultWeeks: number }[] = [
  { value: 'hypertrophy',          label: 'Pure Hypertrophy',       desc: 'Maximum muscle growth — high volume, moderate loads',             icon: '💪', suggestedWeeks: [4, 12], defaultWeeks: 8 },
  { value: 'hypertrophy-strength', label: 'Hypertrophy + Strength', desc: 'Build muscle then convert to strength',                          icon: '🏗️', suggestedWeeks: [6, 16], defaultWeeks: 10 },
  { value: 'strength',             label: 'Strength',               desc: 'Intensity-focused — get stronger on key lifts',                  icon: '🏋️', suggestedWeeks: [4, 10], defaultWeeks: 6 },
  { value: 'competition',          label: 'Competition Peak',       desc: 'Full periodization — accumulate, intensify, peak',               icon: '🏆', suggestedWeeks: [8, 16], defaultWeeks: 12 },
  { value: 'custom',               label: 'Custom',                 desc: 'Build your own phases from scratch',                             icon: '🎯', suggestedWeeks: [1, 52], defaultWeeks: 8 },
];

/** The in-progress block being built by the wizard */
export interface BlockWizardState {
  name: string;
  goalEvent: string;
  /** Block focus determines the phase structure */
  blockFocus: BlockFocus;
  /** 'template' = start from preset, 'custom' = build from scratch */
  mode: 'template' | 'custom';
  /** Template key (only used in template mode) */
  templateKey: string;
  /** Total weeks for the block (used to scale phases) */
  totalWeeks: number;
  /** Start date as ISO YYYY-MM-DD */
  startDate: string;
  /** Goal date as ISO YYYY-MM-DD (optional) */
  goalDate: string;
  /** The phases — this is what gets saved to TrainingBlock */
  phases: TrainingBlockPhase[];
  /** Default sessions/week — cascades to new phases */
  defaultSessionsPerWeek: number;
  /** Default split — cascades to new phases */
  defaultSplitPattern: SplitPattern;
  /** Whether to auto-populate the calendar after creation */
  populateCalendar: boolean;
}

export const DEFAULT_BLOCK_STATE: BlockWizardState = {
  name: '',
  goalEvent: '',
  blockFocus: 'hypertrophy-strength',
  mode: 'template',
  templateKey: 'linear-8-week',
  totalWeeks: 10,
  startDate: new Date().toISOString().split('T')[0],
  goalDate: '',
  phases: [],
  defaultSessionsPerWeek: 4,
  defaultSplitPattern: 'upper-lower',
  populateCalendar: true,
};

/**
 * Generate a phase sequence for a given block focus and total duration.
 * Deload is always 1 week. Training weeks are distributed proportionally.
 */
export function generatePhasesForFocus(
  focus: BlockFocus,
  totalWeeks: number,
  sessionsPerWeek: number,
  splitPattern: SplitPattern,
): TrainingBlockPhase[] {
  if (focus === 'custom') return [];

  const deloadWeeks = 1;
  const trainingWeeks = Math.max(1, totalWeeks - deloadWeeks);

  const makePhase = (phase: TrainingPhase, weeks: number): TrainingBlockPhase => ({
    ...PHASE_PRESETS[phase],
    weekCount: weeks,
    sessionsPerWeek,
    splitPattern,
  });

  let phases: TrainingBlockPhase[];

  switch (focus) {
    case 'hypertrophy': {
      const accum = Math.max(1, Math.round(trainingWeeks * 0.35));
      const hyp = trainingWeeks - accum;
      phases = [
        makePhase(TrainingPhase.ACCUMULATION, accum),
        makePhase(TrainingPhase.HYPERTROPHY, hyp),
      ];
      break;
    }
    case 'hypertrophy-strength': {
      const hyp = Math.max(1, Math.round(trainingWeeks * 0.45));
      const str = trainingWeeks - hyp;
      phases = [
        makePhase(TrainingPhase.HYPERTROPHY, hyp),
        makePhase(TrainingPhase.STRENGTH, str),
      ];
      break;
    }
    case 'strength': {
      const str = Math.max(1, Math.round(trainingWeeks * 0.6));
      const intens = trainingWeeks - str;
      phases = [
        makePhase(TrainingPhase.STRENGTH, str),
        makePhase(TrainingPhase.INTENSIFICATION, intens),
      ];
      break;
    }
    case 'competition': {
      const accum = Math.max(1, Math.round(trainingWeeks * 0.3));
      const intens = Math.max(1, Math.round(trainingWeeks * 0.35));
      const real = Math.max(1, trainingWeeks - accum - intens);
      phases = [
        makePhase(TrainingPhase.ACCUMULATION, accum),
        makePhase(TrainingPhase.INTENSIFICATION, intens),
        makePhase(TrainingPhase.REALIZATION, real),
      ];
      break;
    }
    default:
      phases = [];
  }

  phases.push(makePhase(TrainingPhase.DELOAD, deloadWeeks));
  return phases;
}

/** Props every block wizard step receives */
export interface BlockStepProps {
  state: BlockWizardState;
  onChange: (patch: Partial<BlockWizardState>) => void;
}

/** Step metadata for the container */
export interface BlockStepConfig {
  id: string;
  title: string;
  subtitle: string;
  component: React.ComponentType<BlockStepProps>;
  /** Show this step only when condition is true */
  isVisible?: (state: BlockWizardState) => boolean;
}
