'use client';

import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';
import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';

export function Subject() {
  return <SubjectSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}
