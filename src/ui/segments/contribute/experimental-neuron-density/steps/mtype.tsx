'use client';

import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={ExperimentalNeuronDensitySchema} required={false} />;
}
