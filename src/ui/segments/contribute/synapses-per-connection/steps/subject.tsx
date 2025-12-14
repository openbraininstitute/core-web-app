'use client';

import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';
import { SubjectSelector } from '@/ui/segments/contribute/shared/components/subject-selector';

export function Subject() {
  return <SubjectSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}
