'use client';

import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={ExperimentalNeuronDensitySchema} />;
}
