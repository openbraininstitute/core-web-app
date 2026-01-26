'use client';

import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';
import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={ExperimentalNeuronDensitySchema} />;
}
