/**
 * Wizard configuration types.
 *
 * To add a new step:
 *   1. Create a component that accepts WizardStepProps<FormData>
 *   2. Add it to the WIZARD_STEPS array in WorkoutWizard.tsx
 *
 * Every step is declarative — the wizard container handles navigation,
 * progress, and the generate action. Steps only read / write formData.
 */

import { FormData, OptimizerConfig, TrainingGoalFocus } from '../../types';
import { TrainingContext } from '../../services/geminiService';

/** Props every wizard step receives */
export interface WizardStepProps {
  formData: FormData;
  onChange: (patch: Partial<FormData>) => void;

  /** Optional context some steps may use */
  trainingContext?: TrainingContext | null;
  optimizerConfig?: OptimizerConfig;
}

/** Metadata for a single wizard step — used by the container */
export interface WizardStepConfig {
  id: string;
  title: string;
  subtitle: string;
  component: React.ComponentType<WizardStepProps>;
  /** If provided, the step is only shown when this returns true */
  isVisible?: (formData: FormData) => boolean;
}
