'use client';

import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';
import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';

export function Contribution() {
  return <ContributionSelector schema={ExperimentalNeuronDensitySchema} />;
}
