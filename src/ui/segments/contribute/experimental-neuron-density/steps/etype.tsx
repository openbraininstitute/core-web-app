'use client';

import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { ETypeClassificationSelector } from '@/ui/segments/contribute/shared/components/etype-selector';

export function ETypeClassification() {
  return <ETypeClassificationSelector schema={ExperimentalNeuronDensitySchema} />;
}
