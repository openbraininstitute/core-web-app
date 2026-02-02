'use client';

import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';
import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';

export function Contribution() {
  return <ContributionSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}
