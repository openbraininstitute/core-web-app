'use client';

import { MTypeClassificationSelector } from '@/ui/segments/contribute/shared/components/mtype-selector';
import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';

export function MTypeClassification() {
  return <MTypeClassificationSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}
