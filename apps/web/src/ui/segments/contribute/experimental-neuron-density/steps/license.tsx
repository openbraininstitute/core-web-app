'use client';

import { ExperimentalNeuronDensitySchema } from '@/ui/segments/contribute/experimental-neuron-density/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={ExperimentalNeuronDensitySchema} />;
}
