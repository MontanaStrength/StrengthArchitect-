/**
 * Block Wizard — shared types.
 *
 * The BlockWizardState holds everything needed to build a TrainingBlock.
 * Each step component receives it + an updater function.
 */

import React from 'react';
import { TrainingBlockPhase, TrainingPhase, SplitPattern } from '../../shared/types';

/** The in-progress block being built by the wizard */
export interface BlockWizardState {
  name: string;
  goalEvent: string;
  /** 'template' = start from preset, 'custom' = build from scratch */
  mode: 'template' | 'custom';
  /** Template key (only used in template mode) */
  templateKey: string;
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
  mode: 'template',
  templateKey: 'linear-8-week',
  startDate: new Date().toISOString().split('T')[0],
  goalDate: '',
  phases: [],
  defaultSessionsPerWeek: 4,
  defaultSplitPattern: 'upper-lower',
  populateCalendar: true,
};

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
